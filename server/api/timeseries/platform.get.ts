import { readGCSFile, buildTimeseriesPath } from '../../utils/gcs-client'
import { parseParquet } from '../../utils/parquet-parser'
import type { PlatformTimeseries } from '../../types/timeseries'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const platform = query.platform as string
  const startDate = query.start as string
  const endDate = query.end as string
  
  try {
    const config = useRuntimeConfig()
    const bucketName = config.gcsBucket
    
    if (!bucketName) {
      throw new Error('GCSバケット名が設定されていません')
    }
    
    // プラットフォーム別データを読み込み
    const filePath = buildTimeseriesPath('by_platform', 'platform_timeseries.parquet')
    const buffer = await readGCSFile(bucketName, filePath)
    
    // Parquetデータをパース
    const data = await parseParquet<PlatformTimeseries>(buffer)
    
    // フィルタリング
    let filtered = data
    
    // プラットフォームフィルタ
    if (platform) {
      filtered = filtered.filter(row => row.app_name === platform)
    }
    
    // 日付フィルタ
    if (startDate && endDate) {
      filtered = filtered.filter(row => 
        row.date >= startDate && row.date <= endDate
      )
    }
    
    // 日付でソート
    filtered.sort((a, b) => a.date.localeCompare(b.date))
    
    // プラットフォーム別の集計
    const platformStats = new Map<string, any>()
    
    for (const record of filtered) {
      const platform = record.app_name
      if (!platformStats.has(platform)) {
        platformStats.set(platform, {
          platform: platform,
          totalAds: 0,
          totalCost: 0,
          totalPlayCount: 0,
          totalDiggCount: 0,
          recordCount: 0
        })
      }
      
      const stats = platformStats.get(platform)!
      stats.totalAds += record.ad_count
      stats.totalCost += record.total_cost
      stats.totalPlayCount += record.total_play_count
      stats.totalDiggCount += record.total_digg_count
      stats.recordCount++
    }
    
    // 配列に変換してソート
    const summary = Array.from(platformStats.values())
      .map(stats => ({
        ...stats,
        avgPlayPerAd: stats.totalAds > 0 ? stats.totalPlayCount / stats.totalAds : 0,
        avgCostPerAd: stats.totalAds > 0 ? stats.totalCost / stats.totalAds : 0
      }))
      .sort((a, b) => b.totalCost - a.totalCost)
    
    return {
      success: true,
      data: filtered,
      summary,
      platforms: [...new Set(data.map(d => d.app_name))],
      count: filtered.length
    }
  } catch (error: any) {
    console.error('プラットフォームデータ取得エラー:', error)
    
    throw createError({
      statusCode: 500,
      statusMessage: `プラットフォームデータの取得に失敗しました: ${error.message}`
    })
  }
})