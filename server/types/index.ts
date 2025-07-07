// API Request/Response Types

export interface ChatRequest {
  message: string
  session_id?: string | null
}

export interface ChatResponse {
  message: string
  session_id: string
  timestamp: Date
  sources: any[]
}

export interface DataSummary {
  total_ads: number
  total_cost: number
  date_range: string
  last_updated: Date
}

export interface PlatformStats {
  platform_name: string
  total_ads: number
  total_cost: number
  percentage: number
}

export interface GenreStats {
  genre_name: string
  total_ads: number
  total_cost: number
  avg_cost_per_ad: number
}

export interface SystemStatus {
  status: string
  version: string
  model_loaded: boolean
  data_loaded: boolean
  uptime: number
  active_sessions: number
}

export interface ErrorResponse {
  error: string
  detail?: string
  timestamp: string
}

// Session Types
export interface SessionHistory {
  timestamp: string
  message: string
  response: string
}

// Data Processing Types
export interface AdData {
  product_id: string
  product_name: string
  advertiser_id: string
  advertiser_name: string
  genre_id: string
  genre_name: string
  ad_sentence: string
  ad_start_sentence: string
  ad_all_sentence: string
  play_count: number
  digg_count: number
  cost: number
  app_name: string
  creation_time: string
  streaming_period: string
  transition_url: string
}

export interface DataSummaryFile {
  file_name: string
  description: string
  columns?: string[]
  row_count?: number
  sample_data?: any[]
  summary_stats?: any
  total_ads?: number
  total_cost?: number
  date_range?: string
  platforms?: any[]
  top_genres?: any[]
}