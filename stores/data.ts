import { defineStore } from 'pinia'

interface DataSummary {
  total_ads: number
  total_cost: number
  date_range: string
  last_updated: string
}

interface PlatformStats {
  platform_name: string
  total_ads: number
  total_cost: number
  percentage: number
}

interface GenreStats {
  genre_name: string
  total_ads: number
  total_cost: number
  avg_cost_per_ad: number
}

interface DataState {
  summary: DataSummary | null
  platforms: PlatformStats[]
  genres: GenreStats[]
  isLoading: boolean
  error: string | null
}

export const useDataStore = defineStore('data', {
  state: (): DataState => ({
    summary: null,
    platforms: [],
    genres: [],
    isLoading: false,
    error: null
  }),

  getters: {
    hasData: (state) => state.summary !== null,
    topPlatforms: (state) => state.platforms.slice(0, 5),
    topGenres: (state) => state.genres.slice(0, 5)
  },

  actions: {
    async fetchDataSummary() {
      this.isLoading = true
      this.error = null
      
      try {
        const [summary, platforms, genres] = await Promise.all([
          $fetch<DataSummary>('/api/data/summary'),
          $fetch<PlatformStats[]>('/api/data/platforms'),
          $fetch<GenreStats[]>('/api/data/genres')
        ])
        
        this.summary = summary
        this.platforms = platforms
        this.genres = genres
        
      } catch (error: any) {
        this.error = error.data?.error || 'データの取得に失敗しました'
        console.error('Data fetch error:', error)
      } finally {
        this.isLoading = false
      }
    }
  }
})