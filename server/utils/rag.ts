import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { Document } from '@langchain/core/documents'
import { MemoryVectorStore } from 'langchain/vectorstores/memory'
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai'
import dataService from '../services/dataService'
import path from 'path'

export class RAGSystem {
  private model: ChatGoogleGenerativeAI | null = null
  private embeddings: GoogleGenerativeAIEmbeddings | null = null
  private vectorStore: MemoryVectorStore | null = null
  private documents: Document[] = []
  private initialized = false

  constructor() {
    try {
      // runtimeConfigから環境変数を取得
      const config = useRuntimeConfig()
      const apiKey = config.googleApiKey || process.env.GOOGLE_API_KEY || ''
      
      // APIキーの検証
      if (!apiKey || apiKey === '' || apiKey === 'your-gemini-api-key-here') {
        console.warn('Gemini APIキーが設定されていません。RAG機能は制限されます。')
        return
      }
      
      // APIキーが文字列であることを確認
      const apiKeyString = String(apiKey).trim()
      if (!apiKeyString) {
        console.warn('Gemini APIキーが空です。RAG機能は制限されます。')
        return
      }
      
      console.log('RAGシステム初期化: APIキーの長さ =', apiKeyString.length)
      
      // モデルの初期化
      this.model = new ChatGoogleGenerativeAI({
        apiKey: apiKeyString,
        model: 'gemini-1.5-flash',  // modelNameではなくmodel
        temperature: 0.7,
        maxOutputTokens: 2048
      })
      
      this.embeddings = new GoogleGenerativeAIEmbeddings({
        apiKey: apiKeyString,
        model: 'embedding-001'  // modelNameではなくmodel
      })
      
      console.log('RAGシステム初期化成功')
    } catch (error) {
      console.error('RAGシステムの初期化エラー:', error)
      // エラーが発生してもアプリケーションは継続
    }
  }

  async initialize(): Promise<boolean> {
    if (this.initialized) {
      return true
    }

    try {
      // データサマリーを読み込み
      await dataService.loadDataSummaries()

      // データサマリーからドキュメントを作成
      const summaries = dataService.getDataSummaries()
      
      for (const [filePath, summary] of summaries) {
        // 基本情報
        const content = `
ファイル: ${filePath}
説明: ${summary.description}
${summary.total_ads ? `総広告数: ${summary.total_ads.toLocaleString()}件` : ''}
${summary.total_cost ? `総費用: ${summary.total_cost.toLocaleString()}円` : ''}
${summary.date_range ? `期間: ${summary.date_range}` : ''}

${summary.summary_stats ? this.formatSummaryStats(summary.summary_stats) : ''}
${summary.platforms ? this.formatPlatforms(summary.platforms) : ''}
${summary.top_genres ? this.formatGenres(summary.top_genres) : ''}
        `.trim()

        this.documents.push(new Document({
          pageContent: content,
          metadata: {
            source: filePath,
            type: 'summary'
          }
        }))
      }

      // RAGデータをダウンロード（オプション）
      const ragBuffer = await dataService.downloadRagData()
      if (ragBuffer) {
        console.log('✓ RAGデータをダウンロードしました')
        // 将来的にはParquetデータから追加のドキュメントを作成
      }

      // ベクトルストアを作成
      if (this.embeddings && this.documents.length > 0) {
        this.vectorStore = await MemoryVectorStore.fromDocuments(
          this.documents,
          this.embeddings
        )
        console.log(`✓ ${this.documents.length}個のドキュメントでベクトルストアを作成しました`)
      }

      this.initialized = true
      return true
    } catch (error) {
      console.error('RAGシステム初期化エラー:', error)
      return false
    }
  }

  private formatSummaryStats(stats: any): string {
    if (!stats) return ''
    
    let result = '統計情報:\n'
    for (const [key, value] of Object.entries(stats)) {
      if (typeof value === 'number') {
        result += `  - ${key}: ${value.toLocaleString()}\n`
      } else {
        result += `  - ${key}: ${value}\n`
      }
    }
    return result
  }

  private formatPlatforms(platforms: any[]): string {
    if (!platforms || platforms.length === 0) return ''
    
    let result = '\nプラットフォーム別統計:\n'
    for (const platform of platforms.slice(0, 5)) {
      result += `  - ${platform.app_name}: ${platform.total_ads?.toLocaleString() || 0}件, ${platform.total_cost?.toLocaleString() || 0}円\n`
    }
    return result
  }

  private formatGenres(genres: any[]): string {
    if (!genres || genres.length === 0) return ''
    
    let result = '\nジャンル別統計 (トップ10):\n'
    for (const genre of genres.slice(0, 10)) {
      result += `  - ${genre.genre_name}: ${genre.total_ads?.toLocaleString() || 0}件, ${genre.total_cost?.toLocaleString() || 0}円\n`
    }
    return result
  }

  async search(query: string, k: number = 5): Promise<Document[]> {
    if (!this.vectorStore) {
      return []
    }

    try {
      const results = await this.vectorStore.similaritySearch(query, k)
      return results
    } catch (error) {
      console.error('検索エラー:', error)
      return []
    }
  }

  async generateResponse(query: string, context: string): Promise<string> {
    if (!this.model) {
      // Gemini APIが設定されていない場合は、データ表示のみ
      return this.generateDataOnlyResponse(query, context)
    }

    try {
      const prompt = `
あなたは広告データ分析の専門家です。以下のコンテキストを参考に、ユーザーの質問に答えてください。

コンテキスト:
${context}

質問: ${query}

回答は日本語で、具体的な数値やデータを含めて分かりやすく説明してください。
      `.trim()

      const response = await this.model.invoke(prompt)
      return response.content as string
    } catch (error) {
      console.error('応答生成エラー:', error)
      return 'エラーが発生しました。もう一度お試しください。'
    }
  }

  private generateDataOnlyResponse(query: string, context: string): string {
    // シンプルなデータ表示
    const lowerQuery = query.toLowerCase()
    
    let response = '以下のデータが見つかりました:\n\n'
    response += context
    
    // 簡単なキーワードマッチング
    if (lowerQuery.includes('広告') || lowerQuery.includes('総数')) {
      response += '\n\n広告データに関する情報を表示しています。'
    } else if (lowerQuery.includes('プラットフォーム')) {
      response += '\n\nプラットフォーム別のデータを確認してください。'
    } else if (lowerQuery.includes('ジャンル')) {
      response += '\n\nジャンル別の統計情報を表示しています。'
    }
    
    return response
  }

  isInitialized(): boolean {
    return this.initialized
  }

  hasModel(): boolean {
    return this.model !== null
  }
}

// シングルトンインスタンス
const ragSystem = new RAGSystem()
export default ragSystem