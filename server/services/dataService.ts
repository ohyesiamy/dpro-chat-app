import firebaseService from './firebaseService'
import { DataSummary, PlatformStats, GenreStats, DataSummaryFile } from '../types'
import { Readable } from 'stream'
import path from 'path'
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'

class DataService {
  private static instance: DataService
  private dataSummaries: Map<string, DataSummaryFile> = new Map()
  private dataLoaded = false
  private tempDir = path.join(process.cwd(), '.temp')

  private constructor() {
    // 一時ディレクトリの作成
    if (!existsSync(this.tempDir)) {
      mkdirSync(this.tempDir, { recursive: true })
    }
  }

  static getInstance(): DataService {
    if (!DataService.instance) {
      DataService.instance = new DataService()
    }
    return DataService.instance
  }

  async loadDataSummaries(): Promise<boolean> {
    if (this.dataLoaded) {
      return true
    }

    try {
      await firebaseService.initialize()
      
      // Firebase Storageからデータサマリーファイルをダウンロード
      const summaryFiles = await firebaseService.listFiles('data_summaries/')
      
      for (const filePath of summaryFiles) {
        if (filePath.endsWith('.json')) {
          try {
            const buffer = await firebaseService.downloadFile(filePath)
            const data = JSON.parse(buffer.toString()) as DataSummaryFile
            this.dataSummaries.set(filePath, data)
            console.log(`✓ ${filePath} を読み込みました`)
          } catch (error) {
            console.error(`エラー: ${filePath} の読み込み失敗`, error)
          }
        }
      }

      this.dataLoaded = true
      console.log(`✓ ${this.dataSummaries.size}個のデータサマリーを読み込みました`)
      return true
    } catch (error) {
      console.error('データサマリーの読み込みエラー:', error)
      return false
    }
  }

  async getDataSummary(): Promise<DataSummary> {
    if (!this.dataLoaded) {
      await this.loadDataSummaries()
    }

    let totalAds = 0
    let totalCost = 0
    let dateRange = '不明'

    // daily_aggregationからデータを取得
    for (const [key, value] of this.dataSummaries) {
      if (key.includes('daily/daily_aggregation') && value) {
        totalAds = value.total_ads || 0
        totalCost = value.total_cost || 0
        dateRange = value.date_range || '不明'
        break
      }
    }

    return {
      total_ads: totalAds,
      total_cost: totalCost,
      date_range: dateRange,
      last_updated: new Date()
    }
  }

  async getPlatformStats(): Promise<PlatformStats[]> {
    if (!this.dataLoaded) {
      await this.loadDataSummaries()
    }

    const stats: PlatformStats[] = []

    // platform_timeseriesからデータを取得
    for (const [key, value] of this.dataSummaries) {
      if (key.includes('by_platform/platform_timeseries') && value?.platforms) {
        const platforms = value.platforms
        const totalCostAll = platforms.reduce((sum: number, p: any) => sum + (p.total_cost || 0), 0)

        for (const platform of platforms) {
          const percentage = totalCostAll > 0 ? (platform.total_cost / totalCostAll * 100) : 0
          stats.push({
            platform_name: platform.app_name,
            total_ads: platform.total_ads || 0,
            total_cost: platform.total_cost || 0,
            percentage: Math.round(percentage * 100) / 100
          })
        }
        break
      }
    }

    return stats.sort((a, b) => b.total_cost - a.total_cost)
  }

  async getGenreStats(): Promise<GenreStats[]> {
    if (!this.dataLoaded) {
      await this.loadDataSummaries()
    }

    const stats: GenreStats[] = []

    // genre_timeseriesからデータを取得
    for (const [key, value] of this.dataSummaries) {
      if (key.includes('by_genre/genre_timeseries') && value?.top_genres) {
        const genres = value.top_genres.slice(0, 10) // トップ10のみ

        for (const genre of genres) {
          const avgCost = genre.total_ads > 0 ? genre.total_cost / genre.total_ads : 0
          stats.push({
            genre_name: genre.genre_name,
            total_ads: genre.total_ads || 0,
            total_cost: genre.total_cost || 0,
            avg_cost_per_ad: Math.round(avgCost * 100) / 100
          })
        }
        break
      }
    }

    return stats
  }

  async searchData(query: string): Promise<any[]> {
    // 検索クエリに基づいて関連データを取得
    const results: any[] = []
    const lowerQuery = query.toLowerCase()

    for (const [key, value] of this.dataSummaries) {
      if (value?.description?.toLowerCase().includes(lowerQuery) || 
          key.toLowerCase().includes(lowerQuery)) {
        results.push({
          file: key,
          description: value.description,
          summary_stats: value.summary_stats
        })
      }
    }

    return results
  }

  async downloadRagData(): Promise<Buffer | null> {
    try {
      // RAG最適化データをダウンロード
      const ragFile = 'rag_optimized_data.parquet'
      const buffer = await firebaseService.downloadFile(ragFile)
      
      // 一時ファイルに保存
      const tempPath = path.join(this.tempDir, ragFile)
      writeFileSync(tempPath, buffer)
      
      return buffer
    } catch (error: any) {
      // ファイルが存在しない場合はログを出さない（期待される動作）
      if (!error.message?.includes('No such object')) {
        console.error('RAGデータのダウンロードエラー:', error)
      }
      return null
    }
  }

  async readParquetData(filePath: string): Promise<any[]> {
    try {
      //TODO: parquet-wasmを使用した実装に置き換える
      console.warn('readParquetData: 現在実装中です')
      return []
    } catch (error) {
      console.error('Parquetファイル読み込みエラー:', error)
      return []
    }
  }

  getDataSummaries(): Map<string, DataSummaryFile> {
    return this.dataSummaries
  }

  isDataLoaded(): boolean {
    return this.dataLoaded
  }

  getTempDir(): string {
    return this.tempDir
  }
}

export default DataService.getInstance()