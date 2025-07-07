import chatService from '../../services/chatService'

export default defineEventHandler(async (event) => {
  try {
    // チャットサービスが初期化されているか確認
    if (!chatService.isInitialized()) {
      await chatService.initialize()
    }

    const platforms = await chatService.getPlatformStats()
    return platforms
  } catch (error: any) {
    console.error('Platform Stats API Error:', error)
    
    throw createError({
      statusCode: 500,
      statusMessage: 'プラットフォーム統計取得中にエラーが発生しました'
    })
  }
})