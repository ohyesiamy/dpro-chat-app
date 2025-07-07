import { Readable } from 'stream'
import { createReadStream, buildTimeseriesPath, dateToMonthKey } from '../../utils/gcs-client'
import { streamParquetWithFilter } from '../../utils/parquet-parser'
import type { RawAdData, SearchFilters } from '../../types/timeseries'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const yearMonth = query.yearMonth as string || '2025_03'
  const filters: SearchFilters = {
    platform: query.platform as string,
    genre: query.genre as string,
    minPlayCount: query.minPlayCount ? parseInt(query.minPlayCount as string) : undefined,
    limit: query.limit ? parseInt(query.limit as string) : 1000
  }
  
  // ストリーミングレスポンスの設定
  setHeader(event, 'Content-Type', 'application/x-ndjson')
  setHeader(event, 'Transfer-Encoding', 'chunked')
  setHeader(event, 'Cache-Control', 'no-cache')
  
  const config = useRuntimeConfig()
  const bucketName = config.gcsBucket
  
  if (!bucketName) {
    throw createError({
      statusCode: 500,
      statusMessage: 'GCSバケット名が設定されていません'
    })
  }
  
  // ストリーミング処理
  const stream = new Readable({
    async read() {
      try {
        const filePath = buildTimeseriesPath(
          'raw_consolidated',
          `consolidated_${yearMonth}.parquet`
        )
        
        // GCSからストリーミング読み込み
        const gcsStream = createReadStream(bucketName, filePath)
        
        let buffer = Buffer.alloc(0)
        let recordCount = 0
        
        // GCSストリームからデータを読み込み
        for await (const chunk of gcsStream) {
          buffer = Buffer.concat([buffer, chunk])
          
          // 十分なデータが溜まったらParquetとして処理
          if (buffer.length > 10 * 1024 * 1024) { // 10MB
            await processBuffer.call(this, buffer, filters, recordCount)
            buffer = Buffer.alloc(0)
          }
        }
        
        // 残りのデータを処理
        if (buffer.length > 0) {
          await processBuffer.call(this, buffer, filters, recordCount)
        }
        
        // ストリーム終了
        this.push(null)
      } catch (error: any) {
        console.error('ストリーミングエラー:', error)
        this.destroy(error)
      }
    }
  })
  
  return sendStream(event, stream)
})

// バッファ処理ヘルパー関数
async function processBuffer(
  this: Readable,
  buffer: Buffer,
  filters: SearchFilters,
  recordCount: number
): Promise<number> {
  try {
    // フィルタ関数
    const filterFn = (record: RawAdData) => {
      if (filters.platform && record.app_name !== filters.platform) return false
      if (filters.genre && record.genre_name !== filters.genre) return false
      if (filters.minPlayCount && record.play_count < filters.minPlayCount) return false
      return true
    }
    
    // ストリーミングでフィルタリング
    for await (const record of streamParquetWithFilter<RawAdData>(
      buffer,
      filterFn,
      filters.limit ? filters.limit - recordCount : undefined
    )) {
      // NDJSON形式で送信
      this.push(JSON.stringify(record) + '\n')
      recordCount++
      
      // バックプレッシャー制御
      if (this.readableLength > 16384) {
        await new Promise(resolve => setTimeout(resolve, 10))
      }
      
      // 制限に達したら終了
      if (filters.limit && recordCount >= filters.limit) {
        break
      }
    }
  } catch (error) {
    console.error('バッファ処理エラー:', error)
  }
  
  return recordCount
}