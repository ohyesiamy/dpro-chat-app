import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { Document } from '@langchain/core/documents'
import { MemoryVectorStore } from 'langchain/vectorstores/memory'
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { readGCSFile, buildTimeseriesPath, dateToMonthKey } from './gcs-client'
import { streamParquetWithFilter } from './parquet-parser'
import type { RawAdData, AdDocument, SearchFilters, RAGSearchResult } from '../types/timeseries'

export class EnhancedRAGSystem {
  private model: ChatGoogleGenerativeAI | null = null
  private embeddings: GoogleGenerativeAIEmbeddings | null = null
  private vectorStore: MemoryVectorStore | null = null
  private textSplitter: RecursiveCharacterTextSplitter
  private initialized = false
  private dataIndex: Map<string, any> = new Map()

  constructor() {
    try {
      const config = useRuntimeConfig()
      const apiKey = config.googleApiKey || process.env.GOOGLE_API_KEY
      
      if (!apiKey || apiKey === '' || apiKey === 'your-gemini-api-key-here') {
        console.warn('Gemini APIキーが設定されていません。RAG機能は制限されます。')
        return
      }
      
      // Gemini-2.0-proモデルの初期化
      this.model = new ChatGoogleGenerativeAI({
        apiKey: String(apiKey),
        model: 'gemini-2.0-flash-exp', // modelNameではなくmodel、利用可能なモデルに変更
        temperature: 0.3, // より正確な応答のため低めに設定
        maxOutputTokens: 4096 // より長い応答を可能に
      })
      
      this.embeddings = new GoogleGenerativeAIEmbeddings({
        apiKey: String(apiKey),
        model: 'text-embedding-004' // modelNameではなくmodel
      })
      
      // テキスト分割設定
      this.textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
        separators: ['\n\n', '\n', '。', '、', ' ', '']
      })
    } catch (error) {
      console.error('Enhanced RAGシステムの初期化エラー:', error)
    }
  }

  async initialize(): Promise<boolean> {
    if (this.initialized) {
      return true
    }

    try {
      const config = useRuntimeConfig()
      const bucketName = config.gcsBucket
      
      // データインデックスの構築
      await this.buildDataIndex(bucketName)
      
      // 基本的なドキュメントを作成
      const documents = await this.createInitialDocuments(bucketName)
      
      // ベクトルストアを作成
      if (this.embeddings && documents.length > 0) {
        this.vectorStore = await MemoryVectorStore.fromDocuments(
          documents,
          this.embeddings
        )
        console.log(`✓ ${documents.length}個のドキュメントでベクトルストアを初期化しました`)
      }
      
      this.initialized = true
      return true
    } catch (error) {
      console.error('Enhanced RAGシステム初期化エラー:', error)
      return false
    }
  }

  private async buildDataIndex(bucketName: string) {
    try {
      // consolidation_results.jsonを読み込み
      const resultsBuffer = await readGCSFile(
        bucketName,
        buildTimeseriesPath('raw_consolidated', 'consolidation_results.json')
      )
      const results = JSON.parse(resultsBuffer.toString())
      
      // インデックスを構築
      for (const result of results.processing_results) {
        this.dataIndex.set(result.month_key, {
          dateRange: {
            start: `${result.month_key.replace('_', '-')}-01`,
            end: `${result.month_key.replace('_', '-')}-31`
          },
          fileSize: result.file_size_mb * 1024 * 1024,
          rowCount: result.total_rows,
          filePath: `raw_consolidated/consolidated_${result.month_key}.parquet`
        })
      }
      
      console.log(`✓ ${this.dataIndex.size}個の月別データインデックスを構築しました`)
    } catch (error: any) {
      // ファイルが存在しない場合や権限エラーの場合は警告のみ
      if (error.message?.includes('ファイルが見つかりません') || 
          error.message?.includes('Permission') || 
          error.message?.includes('storage.objects.get')) {
        console.warn('データインデックスファイルにアクセスできません。基本機能で動作します。')
      } else {
        console.error('データインデックス構築エラー:', error.message || error)
      }
    }
  }

  private async createInitialDocuments(bucketName: string): Promise<Document[]> {
    const documents: Document[] = []
    
    try {
      // トレンド分析レポートを読み込み
      const trendBuffer = await readGCSFile(
        bucketName,
        buildTimeseriesPath('trends', 'trend_analysis_report.json')
      )
      const trendData = JSON.parse(trendBuffer.toString())
      
      // トレンドサマリーをドキュメント化
      if (trendData.summary) {
        const content = `
広告データトレンド分析サマリー
期間: ${trendData.analysis_period?.start} 〜 ${trendData.analysis_period?.end}
総広告数: ${trendData.summary.total_ads?.toLocaleString()}件
総費用: ${trendData.summary.total_cost?.toLocaleString()}円

主要トレンド:
${trendData.key_trends?.map(trend => `- ${trend}`).join('\n') || ''}
        `.trim()
        
        documents.push(new Document({
          pageContent: content,
          metadata: {
            source: 'trend_analysis',
            type: 'summary',
            date: new Date().toISOString()
          }
        }))
      }
      
      // プラットフォーム別サマリー（エラーハンドリング追加）
      try {
        const platformBuffer = await readGCSFile(
          bucketName,
          buildTimeseriesPath('by_platform', 'platform_timeseries.parquet')
        )
        
        // 最初の数レコードだけを読み込んでサマリーを作成
        const platformRecords: any[] = []
        for await (const record of streamParquetWithFilter(
          platformBuffer,
          () => true,
          100
        )) {
          platformRecords.push(record)
        }
        
        // プラットフォーム別の集計
        const platformSummary = this.aggregatePlatformData(platformRecords)
        for (const [platform, stats] of Object.entries(platformSummary)) {
          const content = `
プラットフォーム: ${platform}
広告数: ${stats.totalAds.toLocaleString()}件
総費用: ${stats.totalCost.toLocaleString()}円
平均再生数: ${Math.round(stats.avgPlayCount).toLocaleString()}回
          `.trim()
          
          documents.push(new Document({
            pageContent: content,
            metadata: {
              source: 'platform_stats',
              platform,
              type: 'statistics'
            }
          }))
        }
      } catch (parquetError: any) {
        console.warn('プラットフォームデータの読み込みをスキップ:', parquetError.message)
        // エラーが発生してもドキュメント作成を続行
      }
      
    } catch (error: any) {
      // ファイルが存在しない場合や権限エラーの場合は警告のみ
      if (error.message?.includes('ファイルが見つかりません') || 
          error.message?.includes('Permission') || 
          error.message?.includes('storage.objects.get')) {
        console.warn('トレンド分析ファイルにアクセスできません。基本機能で動作します。')
      } else {
        console.error('初期ドキュメント作成エラー:', error.message || error)
      }
    }
    
    return documents
  }

  private aggregatePlatformData(records: any[]): Record<string, any> {
    const summary: Record<string, any> = {}
    
    for (const record of records) {
      const platform = record.app_name
      if (!summary[platform]) {
        summary[platform] = {
          totalAds: 0,
          totalCost: 0,
          totalPlayCount: 0,
          count: 0
        }
      }
      
      summary[platform].totalAds += record.ad_count || 0
      summary[platform].totalCost += record.total_cost || 0
      summary[platform].totalPlayCount += record.total_play_count || 0
      summary[platform].count++
    }
    
    // 平均を計算
    for (const stats of Object.values(summary)) {
      stats.avgPlayCount = stats.count > 0 ? stats.totalPlayCount / stats.count : 0
    }
    
    return summary
  }

  async search(query: string, filters?: SearchFilters): Promise<RAGSearchResult[]> {
    const results: RAGSearchResult[] = []
    
    try {
      // 1. クエリから意図を解析
      const intent = await this.analyzeQueryIntent(query)
      
      // 2. 必要なデータファイルを選択
      const selectedFiles = this.selectDataFiles(intent, filters)
      
      // 3. データを検索・フィルタリング
      const documents = await this.searchInParquetFiles(
        selectedFiles,
        query,
        filters
      )
      
      // 4. ベクトル検索
      if (this.vectorStore && documents.length > 0) {
        // ドキュメントをベクトルストアに追加
        await this.vectorStore.addDocuments(documents)
        
        // 類似検索
        const searchResults = await this.vectorStore.similaritySearchWithScore(
          query,
          filters?.limit || 10
        )
        
        // 結果を整形
        for (const [doc, score] of searchResults) {
          results.push({
            content: doc.pageContent,
            metadata: doc.metadata as AdDocument['metadata'],
            relevanceScore: score
          })
        }
      }
      
    } catch (error) {
      console.error('RAG検索エラー:', error)
    }
    
    return results
  }

  private async analyzeQueryIntent(query: string): Promise<any> {
    const lowerQuery = query.toLowerCase()
    
    return {
      needsTimeSeriesData: lowerQuery.includes('推移') || lowerQuery.includes('トレンド'),
      needsPlatformData: lowerQuery.includes('instagram') || lowerQuery.includes('facebook') || 
                        lowerQuery.includes('プラットフォーム'),
      needsGenreData: lowerQuery.includes('ジャンル') || lowerQuery.includes('カテゴリ'),
      needsAdvertiserData: lowerQuery.includes('広告主') || lowerQuery.includes('企業'),
      timeRange: this.extractTimeRange(query)
    }
  }

  private extractTimeRange(query: string): { start?: string; end?: string } {
    // 簡単な日付抽出（実際はより高度な処理が必要）
    const datePattern = /(\d{4})[年-](\d{1,2})[月-]/g
    const matches = [...query.matchAll(datePattern)]
    
    if (matches.length > 0) {
      const dates = matches.map(m => `${m[1]}-${m[2].padStart(2, '0')}`)
      return {
        start: dates[0],
        end: dates[dates.length - 1]
      }
    }
    
    // デフォルトは直近3ヶ月
    const end = new Date()
    const start = new Date()
    start.setMonth(start.getMonth() - 3)
    
    return {
      start: start.toISOString().slice(0, 7),
      end: end.toISOString().slice(0, 7)
    }
  }

  private selectDataFiles(intent: any, filters?: SearchFilters): string[] {
    const files: string[] = []
    
    // 時間範囲に基づいてファイルを選択
    const timeRange = filters?.dateRange || intent.timeRange
    if (timeRange?.start && timeRange?.end) {
      for (const [monthKey, info] of this.dataIndex) {
        if (info.dateRange.start >= timeRange.start && 
            info.dateRange.end <= timeRange.end) {
          files.push(info.filePath)
        }
      }
    }
    
    // 意図に基づいて追加ファイルを選択
    if (intent.needsPlatformData) {
      files.push('timeseries_data/by_platform/platform_timeseries.parquet')
    }
    if (intent.needsGenreData) {
      files.push('timeseries_data/by_genre/genre_timeseries.parquet')
    }
    if (intent.needsAdvertiserData) {
      files.push('timeseries_data/by_advertiser/advertiser_timeseries.parquet')
    }
    
    return files
  }

  private async searchInParquetFiles(
    files: string[],
    query: string,
    filters?: SearchFilters
  ): Promise<Document[]> {
    const documents: Document[] = []
    const config = useRuntimeConfig()
    const bucketName = config.gcsBucket
    
    for (const file of files.slice(0, 3)) { // 最大3ファイルまで
      try {
        const buffer = await readGCSFile(
          bucketName,
          file.replace('dpro/timeseries_data/', 'timeseries_data/')
        )
        
        // フィルタ関数を作成
        const filterFn = (record: RawAdData) => {
          if (filters?.platform && record.app_name !== filters.platform) return false
          if (filters?.genre && record.genre_name !== filters.genre) return false
          if (filters?.advertiser && record.advertiser_name !== filters.advertiser) return false
          if (filters?.minPlayCount && record.play_count < filters.minPlayCount) return false
          if (filters?.minCost && record.cost < filters.minCost) return false
          
          // クエリとの関連性チェック
          const searchText = `${record.product_name} ${record.ad_sentence} ${record.genre_name}`.toLowerCase()
          return query.toLowerCase().split(' ').some(term => searchText.includes(term))
        }
        
        // ストリーミングで検索
        let count = 0
        const maxPerFile = 100
        
        for await (const record of streamParquetWithFilter<RawAdData>(
          buffer,
          filterFn,
          maxPerFile
        )) {
          const doc = this.convertToDocument(record)
          documents.push(doc)
          count++
        }
        
        console.log(`✓ ${file}から${count}件のドキュメントを抽出`)
        
      } catch (error: any) {
        // ファイルが存在しない場合やParquetエラーの場合はスキップ
        if (error.message?.includes('ファイルが見つかりません') || 
            error.message?.includes('parquet') ||
            error.message?.includes('openBuffer') ||
            error.message?.includes('streamParquet')) {
          console.warn(`ファイルをスキップ: ${file}`)
        } else {
          console.error(`ファイル検索エラー (${file}):`, error.message || error)
        }
      }
    }
    
    return documents
  }

  private convertToDocument(ad: RawAdData): Document {
    const content = [
      `商品: ${ad.product_name}`,
      `広告主: ${ad.advertiser_name}`,
      `ジャンル: ${ad.genre_name}`,
      `プラットフォーム: ${ad.app_name}`,
      `広告文: ${ad.ad_sentence}`,
      ad.ad_start_sentence ? `開始文: ${ad.ad_start_sentence}` : '',
      ad.ad_all_sentence ? `全文: ${ad.ad_all_sentence}` : '',
      `再生数: ${ad.play_count.toLocaleString()}`,
      `いいね数: ${ad.digg_count.toLocaleString()}`,
      `コスト: ¥${ad.cost.toLocaleString()}`,
      `配信日: ${ad.date}`,
      `配信期間: ${ad.streaming_period}`
    ].filter(Boolean).join('\n')
    
    const engagementRate = ad.play_count > 0 
      ? (ad.digg_count / ad.play_count) * 100 
      : 0
    
    return new Document({
      pageContent: content,
      metadata: {
        source: `timeseries_data/${ad.date}`,
        date: ad.date,
        advertiser: ad.advertiser_name,
        genre: ad.genre_name,
        platform: ad.app_name,
        performance: {
          play_count: ad.play_count,
          cost: ad.cost,
          engagement_rate: engagementRate
        }
      }
    })
  }

  async generateResponse(
    query: string,
    searchResults: RAGSearchResult[]
  ): Promise<string> {
    if (!this.model) {
      return this.generateDataOnlyResponse(query, searchResults)
    }

    try {
      // コンテキストを構築
      const context = searchResults
        .map((result, index) => `
【検索結果 ${index + 1}】
${result.content}
関連度: ${(result.relevanceScore * 100).toFixed(1)}%
プラットフォーム: ${result.metadata.platform}
日付: ${result.metadata.date}
        `.trim())
        .join('\n\n')

      const prompt = `
あなたは広告データ分析の専門家です。以下の検索結果を参考に、ユーザーの質問に詳しく答えてください。

検索結果:
${context}

ユーザーの質問: ${query}

回答の際は以下の点に注意してください：
1. 具体的な数値やデータを含めて説明する
2. トレンドや傾向がある場合は指摘する
3. 実用的な洞察や提案を含める
4. データの制限事項（欠損期間など）がある場合は明記する
5. 日本語で丁寧に回答する
      `.trim()

      const response = await this.model.invoke(prompt)
      return response.content as string
    } catch (error) {
      console.error('応答生成エラー:', error)
      return 'エラーが発生しました。もう一度お試しください。'
    }
  }

  private generateDataOnlyResponse(
    query: string,
    searchResults: RAGSearchResult[]
  ): string {
    let response = `「${query}」に関連するデータを${searchResults.length}件見つけました:\n\n`
    
    for (const [index, result] of searchResults.entries()) {
      response += `【${index + 1}】\n`
      response += `${result.content}\n`
      response += `- プラットフォーム: ${result.metadata.platform}\n`
      response += `- 日付: ${result.metadata.date}\n`
      response += `- 再生数: ${result.metadata.performance.play_count.toLocaleString()}\n`
      response += `- コスト: ¥${result.metadata.performance.cost.toLocaleString()}\n\n`
    }
    
    return response
  }

  isInitialized(): boolean {
    return this.initialized
  }

  hasModel(): boolean {
    return this.model !== null
  }
}

// シングルトンインスタンス
const enhancedRAGSystem = new EnhancedRAGSystem()
export default enhancedRAGSystem