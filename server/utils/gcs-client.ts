import { Storage } from '@google-cloud/storage'

let storage: Storage | null = null

export function getGCSClient(): Storage {
  if (!storage) {
    const config = useRuntimeConfig()
    
    // GCS認証情報の設定
    const keyPath = config.gcsKeyPath || config.googleApplicationCredentials
    
    if (!keyPath) {
      throw new Error('GCS認証情報が設定されていません')
    }
    
    storage = new Storage({
      keyFilename: keyPath,
      projectId: config.gcsProjectId || config.firebaseProjectId || 'gen-lang-client-0409194436'
    })
  }
  
  return storage
}

export async function readGCSFile(bucketName: string, fileName: string): Promise<Buffer> {
  try {
    const storage = getGCSClient()
    // バケット名の修正（.appを除去）
    const cleanBucketName = bucketName.replace('.firebasestorage.app', '').replace('.appspot.com', '')
    const bucket = storage.bucket(cleanBucketName)
    const file = bucket.file(fileName)
    
    // ファイルの存在確認
    const [exists] = await file.exists()
    if (!exists) {
      console.warn(`ファイルが見つかりません: ${cleanBucketName}/${fileName}`)
      throw new Error(`ファイルが見つかりません: ${fileName}`)
    }
    
    const [buffer] = await file.download()
    return buffer
  } catch (error: any) {
    // 権限エラーの場合は詳細なメッセージを表示
    if (error.message?.includes('storage.objects.get') || error.code === 403) {
      console.error(`GCSファイル読み込みエラー (${fileName}): 権限が不足しています。`)
      console.error(`バケット: ${bucketName}`)
      console.error(`サービスアカウントに適切な権限を付与してください。`)
    } else {
      console.error(`GCSファイル読み込みエラー (${fileName}):`, error)
    }
    throw error
  }
}

export async function listGCSFiles(bucketName: string, prefix: string): Promise<string[]> {
  try {
    const storage = getGCSClient()
    // バケット名の修正（.appを除去）
    const cleanBucketName = bucketName.replace('.firebasestorage.app', '').replace('.appspot.com', '')
    const bucket = storage.bucket(cleanBucketName)
    
    const [files] = await bucket.getFiles({ prefix })
    return files.map(file => file.name)
  } catch (error) {
    console.error(`GCSファイルリストエラー (${prefix}):`, error)
    throw error
  }
}

export async function getFileMetadata(bucketName: string, fileName: string) {
  try {
    const storage = getGCSClient()
    const bucket = storage.bucket(bucketName)
    const file = bucket.file(fileName)
    
    const [metadata] = await file.getMetadata()
    return {
      size: metadata.size,
      updated: metadata.updated,
      contentType: metadata.contentType,
      name: metadata.name
    }
  } catch (error) {
    console.error(`メタデータ取得エラー (${fileName}):`, error)
    throw error
  }
}

// ストリーミングダウンロード用
export function createReadStream(bucketName: string, fileName: string) {
  const storage = getGCSClient()
  const bucket = storage.bucket(bucketName)
  const file = bucket.file(fileName)
  
  return file.createReadStream()
}

// データギャップのチェック
export const DATA_GAPS = [
  { start: '2023-12-18', end: '2024-01-11' },
  { start: '2024-04-24', end: '2024-07-09' }
]

export function isInDataGap(date: string): boolean {
  return DATA_GAPS.some(gap => date >= gap.start && date <= gap.end)
}

// 月キーの生成（例: 2024-03 → 2024_03）
export function dateToMonthKey(date: string): string {
  const [year, month] = date.split('-')
  return `${year}_${month}`
}

// ファイルパスの構築
export function buildTimeseriesPath(type: string, fileName: string): string {
  // typeが空の場合はtimeseries_data/直下
  if (!type) {
    return `timeseries_data/${fileName}`
  }
  // typeがある場合は、余分な/を避ける
  return `timeseries_data/${type}/${fileName}`
}