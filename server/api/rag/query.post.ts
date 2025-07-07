import enhancedRAGSystem from '../../utils/rag-enhanced'
import type { SearchFilters } from '../../types/timeseries'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { query, filters } = body as { query: string; filters?: SearchFilters }
  
  if (!query) {
    throw createError({
      statusCode: 400,
      statusMessage: 'クエリが必要です'
    })
  }
  
  try {
    // RAGシステムを初期化
    if (!enhancedRAGSystem.isInitialized()) {
      console.log('Enhanced RAGシステムを初期化中...')
      await enhancedRAGSystem.initialize()
    }
    
    // 検索を実行
    console.log(`RAG検索実行: "${query}"`)
    const searchResults = await enhancedRAGSystem.search(query, filters)
    
    // 応答を生成
    const response = await enhancedRAGSystem.generateResponse(query, searchResults)
    
    return {
      success: true,
      query,
      response,
      results: searchResults,
      resultsCount: searchResults.length,
      hasModel: enhancedRAGSystem.hasModel()
    }
  } catch (error: any) {
    console.error('RAG検索エラー:', error)
    
    throw createError({
      statusCode: 500,
      statusMessage: `RAG検索に失敗しました: ${error.message}`
    })
  }
})