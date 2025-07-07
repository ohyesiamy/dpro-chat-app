import chatService from '../services/chatService'

export default defineEventHandler(async (event) => {
  try {
    const status = chatService.getSystemStatus()
    return status
  } catch (error: any) {
    console.error('Status API Error:', error)
    
    throw createError({
      statusCode: 500,
      statusMessage: 'ステータス取得中にエラーが発生しました'
    })
  }
})