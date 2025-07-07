import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { Storage } from '@google-cloud/storage'
import { Firestore } from '@google-cloud/firestore'
import { resolve } from 'path'
import { useRuntimeConfig } from '#imports'
import { readFileSync } from 'fs'

class FirebaseService {
  private static instance: FirebaseService
  private app: any = null
  private db: Firestore | null = null
  private bucket: any = null
  private initialized = false

  private constructor() {}

  static getInstance(): FirebaseService {
    if (!FirebaseService.instance) {
      FirebaseService.instance = new FirebaseService()
    }
    return FirebaseService.instance
  }

  async initialize() {
    if (this.initialized) {
      return
    }

    try {
      // Firebase認証情報のパスを環境変数から取得
      const config = useRuntimeConfig()
      const credentialsPath = config.googleApplicationCredentials || 
        process.env.GOOGLE_APPLICATION_CREDENTIALS ||
        resolve(process.cwd(), '../../../../novaspheregraph-firebase-adminsdk-fbsvc-b1ee897140.json')

      // 認証情報ファイルを読み込む
      let serviceAccount
      try {
        serviceAccount = JSON.parse(readFileSync(credentialsPath, 'utf8'))
      } catch (error) {
        console.error('認証情報ファイルの読み込みエラー:', error)
        throw new Error(`認証情報ファイルが見つかりません: ${credentialsPath}`)
      }

      if (getApps().length === 0) {
        this.app = initializeApp({
          credential: cert(serviceAccount),
          storageBucket: 'novaspheregraph.firebasestorage.app'
        })
      } else {
        this.app = getApp()
      }

      // Firestoreクライアント
      this.db = getFirestore(this.app)

      // Storageバケット
      this.bucket = getStorage(this.app).bucket()

      this.initialized = true
      console.log('✓ Firebase初期化完了')
    } catch (error) {
      console.error('Firebase初期化エラー:', error)
      throw error
    }
  }

  getFirestore(): Firestore {
    if (!this.db) {
      throw new Error('Firestoreが初期化されていません')
    }
    return this.db
  }

  getStorageBucket(): any {
    if (!this.bucket) {
      throw new Error('Storage Bucketが初期化されていません')
    }
    return this.bucket
  }

  async downloadFile(filePath: string): Promise<Buffer> {
    const bucket = this.getStorageBucket()
    const file = bucket.file(filePath)
    
    try {
      const [buffer] = await file.download()
      return buffer
    } catch (error: any) {
      // エラーメッセージを簡潔に
      if (error.code === 404 || error.message?.includes('No such object')) {
        console.warn(`ファイルが存在しません: ${filePath}`)
      } else {
        console.error(`ファイルダウンロードエラー (${filePath}):`, error.message || error)
      }
      throw error
    }
  }

  async listFiles(prefix: string): Promise<string[]> {
    const bucket = this.getStorageBucket()
    
    try {
      const [files] = await bucket.getFiles({ prefix })
      return files.map(file => file.name)
    } catch (error) {
      console.error(`ファイルリストエラー (${prefix}):`, error)
      throw error
    }
  }

  async saveToFirestore(collection: string, docId: string, data: any) {
    const db = this.getFirestore()
    
    try {
      await db.collection(collection).doc(docId).set(data, { merge: true })
    } catch (error) {
      console.error(`Firestore保存エラー:`, error)
      throw error
    }
  }

  async getFromFirestore(collection: string, docId: string): Promise<any> {
    const db = this.getFirestore()
    
    try {
      const doc = await db.collection(collection).doc(docId).get()
      return doc.exists ? doc.data() : null
    } catch (error) {
      console.error(`Firestore取得エラー:`, error)
      throw error
    }
  }

  async queryFirestore(collection: string, conditions: any[] = []): Promise<any[]> {
    const db = this.getFirestore()
    let query: any = db.collection(collection)
    
    // 条件を適用
    for (const condition of conditions) {
      query = query.where(condition.field, condition.operator, condition.value)
    }
    
    try {
      const snapshot = await query.get()
      return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }))
    } catch (error) {
      console.error(`Firestoreクエリエラー:`, error)
      throw error
    }
  }
}

export default FirebaseService.getInstance()