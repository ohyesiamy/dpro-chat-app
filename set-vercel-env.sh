#!/bin/bash

# Vercel環境変数設定スクリプト

echo "Vercel環境変数を設定します..."

# 必須環境変数
vercel env add GOOGLE_API_KEY production
vercel env add FIREBASE_PROJECT_ID production
vercel env add GCS_BUCKET_NAME production
vercel env add GCS_PROJECT_ID production
vercel env add DISABLE_PARQUET_WASM production

# Base64エンコードされた認証情報
echo "Firebase Admin SDKキーをBase64エンコードしてください:"
vercel env add GOOGLE_APPLICATION_CREDENTIALS_BASE64 production

echo "GCSサービスアカウントキーをBase64エンコードしてください:"
vercel env add GCS_KEY_BASE64 production

echo "環境変数の設定が完了しました"