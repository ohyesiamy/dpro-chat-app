import { defineStore } from 'pinia'

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
  sources?: any[]
}

interface ChatState {
  messages: Message[]
  sessionId: string | null
  isLoading: boolean
  error: string | null
}

export const useChatStore = defineStore('chat', {
  state: (): ChatState => ({
    messages: [],
    sessionId: null,
    isLoading: false,
    error: null
  }),

  getters: {
    hasMessages: (state) => state.messages.length > 0,
    lastMessage: (state) => state.messages[state.messages.length - 1]
  },

  actions: {
    async sendMessage(content: string) {
      // ユーザーメッセージを追加
      const userMessage: Message = {
        id: Date.now().toString(),
        content,
        role: 'user',
        timestamp: new Date()
      }
      this.messages.push(userMessage)
      
      this.isLoading = true
      this.error = null
      
      try {
        const response = await $fetch('/api/chat', {
          method: 'POST',
          body: {
            message: content,
            session_id: this.sessionId
          }
        })
        
        // セッションIDを保存
        if (!this.sessionId && response.session_id) {
          this.sessionId = response.session_id
        }
        
        // アシスタントメッセージを追加
        const assistantMessage: Message = {
          id: Date.now().toString(),
          content: response.message,
          role: 'assistant',
          timestamp: new Date(),
          sources: response.sources
        }
        this.messages.push(assistantMessage)
        
      } catch (error: any) {
        this.error = error.data?.error || 'メッセージの送信に失敗しました'
        console.error('Chat error:', error)
      } finally {
        this.isLoading = false
      }
    },
    
    clearMessages() {
      this.messages = []
      this.sessionId = null
      this.error = null
    }
  }
})