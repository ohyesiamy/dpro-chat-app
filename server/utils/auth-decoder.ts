// Vercel環境でBase64エンコードされた認証情報をデコードするユーティリティ

import { writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

/**
 * Base64エンコードされた認証情報をデコードして一時ファイルに保存
 * @param base64String Base64エンコードされた文字列
 * @param filename 保存するファイル名
 * @returns 一時ファイルのパス
 */
export function decodeAndSaveCredentials(base64String: string, filename: string): string {
  try {
    // Base64デコード
    const decoded = Buffer.from(base64String, 'base64').toString('utf-8')
    
    // 一時ディレクトリにファイルを保存
    const tempPath = join(tmpdir(), filename)
    writeFileSync(tempPath, decoded)
    
    return tempPath
  } catch (error) {
    console.error(`認証情報のデコードエラー (${filename}):`, error)
    throw new Error(`Failed to decode credentials for ${filename}`)
  }
}

/**
 * 環境変数から認証情報のパスを取得（Vercel対応）
 */
export function getCredentialsPath(): {
  firebasePath: string
  gcsPath: string
} {
  // Vercel環境かどうかチェック
  const isVercel = process.env.VERCEL === '1'
  
  if (isVercel) {
    // Vercel環境：Base64エンコードされた認証情報をデコード
    const firebaseBase64 = process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64
    const gcsBase64 = process.env.GCS_KEY_BASE64
    
    if (!firebaseBase64 || !gcsBase64) {
      throw new Error('Base64エンコードされた認証情報が環境変数に設定されていません')
    }
    
    return {
      firebasePath: decodeAndSaveCredentials(firebaseBase64, 'firebase-admin-sdk.json'),
      gcsPath: decodeAndSaveCredentials(gcsBase64, 'gcs-service-account.json')
    }
  } else {
    // ローカル環境：通常のパスを使用
    return {
      firebasePath: process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
      gcsPath: process.env.GCS_KEY_PATH || ''
    }
  }
}