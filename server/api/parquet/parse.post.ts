import { parseParquet } from '~/server/utils/parquet-parser'

export default defineEventHandler(async (event) => {
  try {
    //! リクエストボディからバッファデータを取得
    const body = await readBody(event)
    
    if (!body || !body.buffer) {
      throw new Error('バッファデータが提供されていません')
    }
    
    //! Base64エンコードされたデータをBufferに変換
    const buffer = Buffer.from(body.buffer, 'base64')
    
    //! Parquetデータを解析
    const data = await parseParquet(buffer)
    
    return {
      success: true,
      data,
      count: data.length
    }
  } catch (error) {
    console.error('Parquet解析エラー:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
})