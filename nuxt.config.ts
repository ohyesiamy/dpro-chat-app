// https://nuxt.com/docs/api/configuration/nuxt-config
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'

export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: true },
  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    '@vueuse/nuxt'
  ],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    // サーバー側のみアクセス可能な設定
    googleApiKey: process.env.GOOGLE_API_KEY || '',
    googleApplicationCredentials: process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
    gcsBucket: process.env.GCS_BUCKET_NAME || '',
    gcsKeyPath: process.env.GCS_KEY_PATH || '',
    gcsProjectId: process.env.GCS_PROJECT_ID || '',
    firebaseProjectId: process.env.FIREBASE_PROJECT_ID || '',
    
    // クライアント側でもアクセス可能な設定
    public: {
      apiBase: ''  // 同一オリジンのためベースURLは不要
    }
  },
  ssr: false,
  app: {
    head: {
      title: 'Dpro Chat - 広告データ分析AI',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: '広告データ分析のためのAIチャットボット' }
      ]
    }
  },
  nitro: {
    // preset: 'vercel', // 静的サイト生成のためコメントアウト
    prerender: {
      crawlLinks: true
    },
    // Node.js互換性を有効化
    experimental: {
      wasm: true
    },
    esbuild: {
      options: {
        target: 'esnext'
      }
    },
    // parquet関連のモジュールをサーバーサイドのみで処理
    externals: {
      deoptimize: ['parquetjs', 'parquet-wasm'],
      external: ['parquet-wasm']  // parquet-wasmを外部モジュールとして扱う
    },
    // CommonJS互換性のためのポリフィル
    rollupConfig: {
      plugins: [
        {
          name: 'polyfill-dirname',
          transform(code: string, id: string) {
            if (id.includes('parquet-wasm')) {
              return {
                code: `
                  import { fileURLToPath } from 'node:url';
                  import { dirname } from 'node:path';
                  const __filename = fileURLToPath(import.meta.url);
                  const __dirname = dirname(__filename);
                  ${code}
                `,
                map: null
              }
            }
          }
        }
      ]
    }
  },
  vite: {
    plugins: [
      wasm(),
      topLevelAwait()
    ],
    optimizeDeps: {
      exclude: ['parquet-wasm', 'parquetjs']
    },
    ssr: {
      noExternal: ['parquet-wasm']
    }
  },
  // Payload extraction無効化（ESモジュール互換性のため）
  experimental: {
    payloadExtraction: false
  }
})
