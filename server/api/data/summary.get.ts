import chatService from '../../services/chatService'

export default defineEventHandler(async (event) => {
  try {
    // チャットサービスが初期化されているか確認
    if (!chatService.isInitialized()) {
      await chatService.initialize()
    }

    const summary = await chatService.getDataSummary()
    return summary
  } catch (error: any) {
    console.error('Data Summary API Error:', error)
    
    throw createError({
      statusCode: 500,
      statusMessage: 'データサマリー取得中にエラーが発生しました'
    })
  }
})