import { readGCSFile, buildTimeseriesPath } from '../../utils/gcs-client'
import { parseParquet } from '../../utils/parquet-parser'
import type { DailyAggregation } from '../../types/timeseries'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const startDate = query.start as string
  const endDate = query.end as string
  
  try {
    const config = useRuntimeConfig()
    const bucketName = config.gcsBucket
    
    if (!bucketName) {
      throw new Error('GCSバケット名が設定されていません')
    }
    
    // 日次集計データを読み込み
    const filePath = buildTimeseriesPath('daily', 'daily_aggregation.parquet')
    const buffer = await readGCSFile(bucketName, filePath)
    
    // Parquetデータをパース
    const data = await parseParquet<DailyAggregation>(buffer)
    
    // 日付フィルタリング
    let filtered = data
    if (startDate && endDate) {
      filtered = data.filter(row => 
        row.date >= startDate && row.date <= endDate
      )
    }
    
    // 日付でソート
    filtered.sort((a, b) => a.date.localeCompare(b.date))
    
    // 統計情報を計算
    const stats = {
      totalRecords: filtered.length,
      totalAds: filtered.reduce((sum, d) => sum + d.total_ads, 0),
      totalCost: filtered.reduce((sum, d) => sum + d.total_cost, 0),
      avgDailyAds: filtered.length > 0 
        ? filtered.reduce((sum, d) => sum + d.total_ads, 0) / filtered.length 
        : 0,
      dateRange: filtered.length > 0 
        ? `${filtered[0].date} 〜 ${filtered[filtered.length - 1].date}`
        : '該当なし'
    }
    
    return {
      success: true,
      data: filtered,
      stats,
      count: filtered.length
    }
  } catch (error: any) {
    console.error('日次データ取得エラー:', error)
    
    throw createError({
      statusCode: 500,
      statusMessage: `日次集計データの取得に失敗しました: ${error.message}`
    })
  }
})