// 時系列データの型定義

export interface DailyAggregation {
  date: string
  total_ads: number
  total_cost: number
  total_play_count: number
  total_digg_count: number
  avg_play_count: number
  avg_digg_count: number
  avg_cost: number
  unique_advertisers: number
  unique_products: number
  unique_genres: number
}

export interface WeeklyAggregation extends DailyAggregation {
  week_start: string
  week_end: string
}

export interface MonthlyAggregation extends DailyAggregation {
  month: string
  year: number
}

export interface PlatformTimeseries {
  app_name: 'Instagram' | 'Facebook' | 'LAP' | 'X' | 'TikTok'
  ad_count: number
  total_cost: number
  total_play_count: number
  total_digg_count: number
  date: string
}

export interface AdvertiserTimeseries {
  advertiser_name: string
  ad_count: number
  total_cost: number
  total_play_count: number
  total_digg_count: number
  unique_products: number
  date: string
}

export interface GenreTimeseries {
  genre_name: string
  ad_count: number
  total_cost: number
  total_play_count: number
  total_digg_count: number
  unique_advertisers: number
  date: string
}

export interface RawAdData {
  product_id: string
  product_name: string
  advertiser_id: string
  advertiser_name: string
  genre_id: string
  genre_name: string
  transition_url: string
  creation_time: string
  app_name: string
  ad_sentence: string
  ad_start_sentence: string
  ad_all_sentence: string
  play_count: number
  digg_count: number
  cost: number
  date: string
  streaming_period: string
}

// LangChain用のドキュメント型
export interface AdDocument {
  pageContent: string
  metadata: {
    source: string
    date: string
    advertiser: string
    genre: string
    platform: string
    performance: {
      play_count: number
      cost: number
      engagement_rate: number
    }
  }
}

// データインデックス型
export interface DataIndex {
  dateRange: { start: string; end: string }
  platforms: string[]
  genres: string[]
  advertisers: string[]
  fileSize: number
  rowCount: number
}

// 検索フィルター
export interface SearchFilters {
  dateRange?: { start: string; end: string }
  platform?: string
  genre?: string
  advertiser?: string
  minPlayCount?: number
  minCost?: number
  limit?: number
}

// RAG検索結果
export interface RAGSearchResult {
  content: string
  metadata: AdDocument['metadata']
  relevanceScore: number
}