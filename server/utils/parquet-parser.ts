import { Readable } from 'stream'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

//! ESモジュール対応：__dirnameと__filenameのポリフィル
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

//! グローバルに__dirnameとmoduleを設定（parquet-wasmが内部で使用するため）
if (typeof globalThis.__dirname === 'undefined') {
  ;(globalThis as any).__dirname = __dirname
}
if (typeof globalThis.__filename === 'undefined') {
  ;(globalThis as any).__filename = __filename
}
if (typeof globalThis.module === 'undefined') {
  ;(globalThis as any).module = { exports: {} }
}
if (typeof globalThis.exports === 'undefined') {
  ;(globalThis as any).exports = {}
}

//! parquet-wasmのインスタンスを保持する変数
let parquetWasm: any = null
//! parquet-wasmの初期化に失敗したかどうかのフラグ
let parquetWasmFailed = false

//! parquetjs-liteのインスタンスを保持する変数
let parquetjs: any = null

//! 環境変数でparquet-wasmを無効化できるようにする
const DISABLE_PARQUET_WASM = process.env.DISABLE_PARQUET_WASM === 'true'

//! parquet-wasmを遅延初期化する関数（parquetjs-liteにフォールバック）
async function ensureParquetWasm() {
  // parquet-wasmが明示的に無効化されている場合
  if (DISABLE_PARQUET_WASM) {
    if (!parquetjs) {
      try {
        // デフォルトエクスポートとして読み込む
        const module = await import('parquetjs-lite')
        parquetjs = module.default || module
        console.log('parquetjs-liteを使用します（parquet-wasm無効）')
        return parquetjs
      } catch (error) {
        console.error('parquetjs-liteの読み込みに失敗:', error)
        return null
      }
    }
    return parquetjs
  }
  
  if (parquetWasmFailed && !parquetjs) {
    try {
      //! parquetjs-liteをフォールバックとして使用
      const module = await import('parquetjs-lite')
      parquetjs = module.default || module
      console.log('parquetjs-liteを使用します')
      return parquetjs
    } catch (error) {
      console.error('parquetjs-liteの読み込みに失敗:', error)
      return null
    }
  }
  
  if (!parquetWasm && !parquetjs) {
    try {
      //! 動的インポートでparquet-wasmを読み込む（エラーをキャッチ）
      const wasm = await import('parquet-wasm').catch(err => {
        console.warn('parquet-wasmの読み込みをスキップ（ES moduleエラー）')
        return null
      })
      
      if (wasm) {
        //! WASMの初期化を実行
        await wasm.default()
        parquetWasm = wasm
        console.log('parquet-wasmを初期化しました')
        return parquetWasm
      } else {
        //! parquetjs-liteにフォールバック
        const module = await import('parquetjs-lite')
        parquetjs = module.default || module
        console.log('parquetjs-liteを使用します')
        parquetWasmFailed = true
        return parquetjs
      }
    } catch (error) {
      //! parquetjs-liteにフォールバック
      try {
        const module = await import('parquetjs-lite')
        parquetjs = module.default || module
        console.log('parquetjs-liteを使用します（フォールバック）')
        parquetWasmFailed = true
        return parquetjs
      } catch (fallbackError) {
        console.error('parquetjs-liteの読み込みにも失敗:', fallbackError)
        return null
      }
    }
  }
  return parquetWasm || parquetjs
}

export async function parseParquet<T>(buffer: Buffer): Promise<T[]> {
  try {
    //! parquet-wasmまたはparquetjs-liteを初期化して取得
    const lib = await ensureParquetWasm()
    
    //! ライブラリが使えない場合は空配列を返す
    if (!lib) {
      console.warn('Parquetライブラリが使用できません。空配列を返します。')
      return []
    }
    
    //! parquetjs-liteを使用している場合
    if (parquetjs && lib === parquetjs) {
      try {
        // parquetjs-liteのParquetReaderを正しく取得
        const reader = await lib.ParquetReader.openBuffer(buffer)
        const cursor = reader.getCursor()
        const records: T[] = []
        
        let record = null
        while (record = await cursor.next()) {
          records.push(record as T)
        }
        
        await reader.close()
        return records
      } catch (error) {
        console.error('parquetjs-liteでのパースエラー:', error)
        return []
      }
    }
    
    //! parquet-wasmを使用している場合
    const table = lib.readParquet(new Uint8Array(buffer))
    const records: T[] = []
    
    // テーブルの行数を取得
    const numRows = table.numRows
    
    // 各行をオブジェクトに変換
    for (let i = 0; i < numRows; i++) {
      const row = table.getRow(i)
      if (row) {
        records.push(row.toJSON() as T)
      }
    }
    
    return records
  } catch (error) {
    console.error('Parquetパース エラー:', error)
    // エラーが発生した場合も空配列を返す
    return []
  }
}

// ストリーミング処理用
export async function* streamParquet<T>(buffer: Buffer): AsyncGenerator<T> {
  try {
    //! parquet-wasmを初期化して取得
    const wasm = await ensureParquetWasm()
    
    //! parquet-wasmが使えない場合は空のイテレータを返す
    if (!wasm) {
      console.warn('parquet-wasmが使用できません。空のイテレータを返します。')
      return
    }
    
    // parquetjs-liteとparquet-wasmで異なる処理
    if (DISABLE_PARQUET_WASM || parquetjs) {
      // parquetjs-liteを使用
      try {
        // parquetjs-liteのParquetReaderを正しく取得
        const reader = await wasm.ParquetReader.openBuffer(buffer)
        const cursor = reader.getCursor()
        let record = null
        while (record = await cursor.next()) {
          yield record as T
        }
        await reader.close()
      } catch (err) {
        console.error('parquetjs-lite読み込みエラー:', err)
        return
      }
    } else if (wasm && wasm.readParquet) {
      // parquet-wasmを使用
      try {
        const table = wasm.readParquet(new Uint8Array(buffer))
        const numRows = table.numRows
        
        // 各行を順次yield
        for (let i = 0; i < numRows; i++) {
          const row = table.getRow(i)
          if (row) {
            yield row.toJSON() as T
          }
        }
      } catch (err) {
        console.error('parquet-wasm読み込みエラー:', err)
        return
      }
    } else {
      console.warn('Parquetライブラリが利用できません')
      return
    }
  } catch (error) {
    console.error('Parquetストリーミング エラー:', error)
    // エラーが発生した場合は何も返さない
    return
  }
}

// ファイルから直接ストリーミング
export async function* streamParquetFromFile<T>(
  filePath: string
): AsyncGenerator<T> {
  try {
    // Node.jsのfsを使用してファイルを読み込む
    const { readFileSync } = await import('fs')
    const buffer = readFileSync(filePath)
    
    // bufferからストリーミング
    yield* streamParquet<T>(buffer)
  } catch (error) {
    console.error('Parquetファイルストリーミング エラー:', error)
    throw error
  }
}

// スキーマ情報の取得
export async function getParquetSchema(buffer: Buffer) {
  try {
    //! parquet-wasmまたはparquetjs-liteを初期化して取得
    const lib = await ensureParquetWasm()
    
    //! ライブラリが使えない場合は空のスキーマを返す
    if (!lib) {
      console.warn('Parquetライブラリが使用できません。空のスキーマを返します。')
      return { fields: [] }
    }
    
    //! parquetjs-liteを使用している場合
    if (parquetjs && lib === parquetjs) {
      try {
        const reader = await lib.ParquetReader.openBuffer(buffer)
        const schema = reader.getSchema()
        const fields = []
        
        // parquetjs-liteのスキーマ形式からフィールド情報を抽出
        for (const field of schema.fields) {
          fields.push({
            name: field.name,
            type: field.type,
            nullable: field.optional || false
          })
        }
        
        await reader.close()
        return { fields }
      } catch (error) {
        console.error('parquetjs-liteでのスキーマ取得エラー:', error)
        return { fields: [] }
      }
    }
    
    //! parquet-wasmを使用している場合
    const table = lib.readParquet(new Uint8Array(buffer))
    
    // スキーマ情報を構築
    const schema: any = {
      fields: []
    }
    
    // カラム情報を取得
    const numColumns = table.numColumns
    for (let i = 0; i < numColumns; i++) {
      const column = table.getColumn(i)
      if (column) {
        schema.fields.push({
          name: column.name,
          type: column.dataType.toString(),
          nullable: column.nullable
        })
      }
    }
    
    return schema
  } catch (error) {
    console.error('スキーマ取得エラー:', error)
    // エラーが発生した場合は空のスキーマを返す
    return { fields: [] }
  }
}

// フィルタリング付きのストリーミング読み込み
export async function* streamParquetWithFilter<T>(
  buffer: Buffer,
  filter: (record: T) => boolean,
  maxResults?: number
): AsyncGenerator<T> {
  try {
    let count = 0
    
    for await (const record of streamParquet<T>(buffer)) {
      if (filter(record)) {
        yield record
        count++
        
        if (maxResults && count >= maxResults) {
          break
        }
      }
    }
  } catch (error) {
    console.error('streamParquetWithFilter エラー:', error)
    // エラーが発生しても空のイテレータとして正常終了
    return
  }
}

// バッチ処理用のヘルパー
export async function processParquetInBatches<T>(
  buffer: Buffer,
  batchSize: number,
  processor: (batch: T[]) => Promise<void>
): Promise<number> {
  //! parquet-wasmが使えるか確認
  const wasm = await ensureParquetWasm()
  if (!wasm) {
    //! parquet-wasmが使えない場合は0を返す
    console.warn('parquet-wasmが使用できません。処理をスキップします。')
    return 0
  }
  
  let batch: T[] = []
  let totalProcessed = 0
  
  for await (const record of streamParquet<T>(buffer)) {
    batch.push(record)
    
    if (batch.length >= batchSize) {
      await processor(batch)
      totalProcessed += batch.length
      batch = []
    }
  }
  
  // 残りのバッチを処理
  if (batch.length > 0) {
    await processor(batch)
    totalProcessed += batch.length
  }
  
  return totalProcessed
}

// メモリ効率的な集計処理
export async function aggregateParquet<T, R>(
  buffer: Buffer,
  initialValue: R,
  aggregator: (accumulator: R, current: T) => R
): Promise<R> {
  //! parquet-wasmが使えるか確認
  const wasm = await ensureParquetWasm()
  if (!wasm) {
    //! parquet-wasmが使えない場合は初期値を返す
    console.warn('parquet-wasmが使用できません。初期値を返します。')
    return initialValue
  }
  
  let result = initialValue
  
  for await (const record of streamParquet<T>(buffer)) {
    result = aggregator(result, record)
  }
  
  return result
}