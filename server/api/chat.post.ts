import chatService from '../services/chatService'
import { ChatRequest } from '../types'

export default defineEventHandler(async (event) => {
  try {
    // リクエストボディを取得
    const body = await readBody<ChatRequest>(event)
    
    if (!body.message || body.message.trim() === '') {
      throw createError({
        statusCode: 400,
        statusMessage: 'メッセージが空です'
      })
    }

    // チャットサービスが初期化されているか確認
    if (!chatService.isInitialized()) {
      await chatService.initialize()
    }

    // チャット応答を生成
    const response = await chatService.chat(body.message, body.session_id)

    // バックグラウンドで古いセッションをクリーンアップ
    setTimeout(() => {
      chatService.clearOldSessions()
    }, 0)

    return response
  } catch (error: any) {
    console.error('Chat API Error:', error)
    
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'チャット処理中にエラーが発生しました'
    })
  }
})