import chatService from '../../services/chatService'

export default defineEventHandler(async (event) => {
  try {
    // チャットサービスが初期化されているか確認
    if (!chatService.isInitialized()) {
      await chatService.initialize()
    }

    const genres = await chatService.getGenreStats()
    return genres
  } catch (error: any) {
    console.error('Genre Stats API Error:', error)
    
    throw createError({
      statusCode: 500,
      statusMessage: 'ジャンル統計取得中にエラーが発生しました'
    })
  }
})