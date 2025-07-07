import { v4 as uuidv4 } from 'uuid'
import ragSystem from '../utils/rag'
import enhancedRAGSystem from '../utils/rag-enhanced'
import dataService from './dataService'
import { ChatResponse, SessionHistory } from '../types'
import type { SearchFilters } from '../types/timeseries'

class ChatService {
  private static instance: ChatService
  private sessions: Map<string, SessionHistory[]> = new Map()
  private startTime = new Date()
  private initialized = false

  private constructor() {}

  static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService()
    }
    return ChatService.instance
  }

  async initialize(): Promise<boolean> {
    if (this.initialized) {
      return true
    }

    try {
      // データサービスとRAGシステムを初期化
      const dataLoaded = await dataService.loadDataSummaries()
      const ragInitialized = await ragSystem.initialize()

      this.initialized = dataLoaded && ragInitialized
      
      if (this.initialized) {
        console.log('✓ チャットサービスの初期化完了')
        
        // Enhanced RAGシステムを初期化（バックグラウンドで）
        enhancedRAGSystem.initialize().then(initialized => {
          if (initialized) {
            console.log('✓ Enhanced RAGシステムを初期化しました')
          } else {
            console.warn('Enhanced RAGシステムの初期化に失敗しました')
          }
        }).catch(error => {
          console.error('Enhanced RAGシステム初期化エラー:', error)
        })
      } else {
        console.error('チャットサービスの初期化に失敗')
      }
      
      return this.initialized
    } catch (error) {
      console.error('チャットサービス初期化エラー:', error)
      return false
    }
  }

  async chat(message: string, sessionId?: string | null): Promise<ChatResponse> {
    if (!this.initialized) {
      await this.initialize()
    }

    // セッションIDの生成または検証
    const currentSessionId = sessionId || uuidv4()

    // セッション履歴の初期化
    if (!this.sessions.has(currentSessionId)) {
      this.sessions.set(currentSessionId, [])
    }

    try {
      // Enhanced RAGシステムが利用可能か確認
      const useEnhancedRAG = await this.shouldUseEnhancedRAG(message)
      
      let responseMessage: string
      let sources: any[] = []
      
      if (useEnhancedRAG) {
        // Enhanced RAGシステムを使用
        console.log('Enhanced RAGシステムを使用して応答生成')
        
        // クエリからフィルタを抽出
        const filters = this.extractFilters(message)
        
        // 検索を実行
        const searchResults = await enhancedRAGSystem.search(message, filters)
        
        // 応答を生成
        responseMessage = await enhancedRAGSystem.generateResponse(message, searchResults)
        
        // ソース情報を抽出
        sources = searchResults.slice(0, 5).map(result => ({
          source: result.metadata.source,
          content: result.content.substring(0, 200) + '...',
          platform: result.metadata.platform,
          date: result.metadata.date,
          relevance: (result.relevanceScore * 100).toFixed(1) + '%'
        }))
      } else {
        // 従来のRAGシステムを使用
        console.log('従来のRAGシステムを使用して応答生成')
        
        // 関連ドキュメントを検索
        const relevantDocs = await ragSystem.search(message, 5)
        
        // コンテキストを構築
        let context = ''
        
        for (const doc of relevantDocs) {
          context += doc.pageContent + '\n\n'
          sources.push({
            source: doc.metadata.source,
            content: doc.pageContent.substring(0, 200) + '...'
          })
        }

        // 応答を生成
        responseMessage = await ragSystem.generateResponse(message, context)
      }

      // セッション履歴に追加
      const history = this.sessions.get(currentSessionId) || []
      history.push({
        timestamp: new Date().toISOString(),
        message,
        response: responseMessage
      })
      this.sessions.set(currentSessionId, history)

      return {
        message: responseMessage,
        session_id: currentSessionId,
        timestamp: new Date(),
        sources
      }
    } catch (error) {
      console.error('チャット処理エラー:', error)
      
      // エラー時のフォールバック応答
      return {
        message: 'エラーが発生しました。もう一度お試しください。',
        session_id: currentSessionId,
        timestamp: new Date(),
        sources: []
      }
    }
  }

  async getDataSummary() {
    return dataService.getDataSummary()
  }

  async getPlatformStats() {
    return dataService.getPlatformStats()
  }

  async getGenreStats() {
    return dataService.getGenreStats()
  }

  getSystemStatus() {
    const uptime = (new Date().getTime() - this.startTime.getTime()) / 1000

    return {
      status: this.initialized ? 'healthy' : 'initializing',
      version: '2.0.0',
      model_loaded: ragSystem.hasModel(),
      data_loaded: dataService.isDataLoaded(),
      uptime: Math.round(uptime * 100) / 100,
      active_sessions: this.sessions.size
    }
  }

  private async shouldUseEnhancedRAG(message: string): Promise<boolean> {
    // Enhanced RAGシステムが初期化されているか確認
    if (!enhancedRAGSystem.isInitialized()) {
      const initialized = await enhancedRAGSystem.initialize()
      if (!initialized) {
        return false
      }
    }
    
    // クエリの内容に基づいて判断
    const lowerMessage = message.toLowerCase()
    
    // 時系列データや詳細な分析が必要なクエリ
    const needsEnhanced = 
      lowerMessage.includes('推移') ||
      lowerMessage.includes('トレンド') ||
      lowerMessage.includes('比較') ||
      lowerMessage.includes('分析') ||
      lowerMessage.includes('instagram') ||
      lowerMessage.includes('facebook') ||
      lowerMessage.includes('期間') ||
      lowerMessage.includes('月別') ||
      lowerMessage.includes('日別') ||
      lowerMessage.includes('ジャンル') ||
      lowerMessage.includes('広告主')
    
    return needsEnhanced
  }
  
  private extractFilters(message: string): SearchFilters {
    const filters: SearchFilters = {}
    const lowerMessage = message.toLowerCase()
    
    // プラットフォームの抽出
    if (lowerMessage.includes('instagram')) filters.platform = 'Instagram'
    else if (lowerMessage.includes('facebook')) filters.platform = 'Facebook'
    else if (lowerMessage.includes('tiktok')) filters.platform = 'TikTok'
    else if (lowerMessage.includes('x') || lowerMessage.includes('twitter')) filters.platform = 'X'
    else if (lowerMessage.includes('lap')) filters.platform = 'LAP'
    
    // 数値フィルタの抽出（簡易的な実装）
    const playCountMatch = message.match(/再生数.*?(\d+)/i)
    if (playCountMatch) {
      filters.minPlayCount = parseInt(playCountMatch[1])
    }
    
    const costMatch = message.match(/コスト.*?(\d+)/i)
    if (costMatch) {
      filters.minCost = parseInt(costMatch[1])
    }
    
    // 期間の抽出
    const yearMonthPattern = /(\d{4})[年-](\d{1,2})[月-]/g
    const matches = [...message.matchAll(yearMonthPattern)]
    if (matches.length > 0) {
      const dates = matches.map(m => `${m[1]}-${m[2].padStart(2, '0')}`)
      filters.dateRange = {
        start: dates[0],
        end: dates[dates.length - 1]
      }
    }
    
    return filters
  }

  clearOldSessions(maxAgeHours: number = 24) {
    const now = new Date()
    const maxAgeMs = maxAgeHours * 60 * 60 * 1000
    const toRemove: string[] = []

    for (const [sessionId, history] of this.sessions) {
      if (history.length > 0) {
        const lastActivity = new Date(history[history.length - 1].timestamp)
        if (now.getTime() - lastActivity.getTime() > maxAgeMs) {
          toRemove.push(sessionId)
        }
      }
    }

    for (const sessionId of toRemove) {
      this.sessions.delete(sessionId)
    }

    console.log(`✓ ${toRemove.length}個の古いセッションを削除しました`)
  }

  isInitialized(): boolean {
    return this.initialized
  }
}

export default ChatService.getInstance()