# Vercelデプロイメントガイド

このドキュメントでは、Dpro Chat AppをVercelにデプロイする手順を説明します。

## 前提条件

- Vercelアカウント
- GitHub リポジトリへのアクセス
- 必要な環境変数の値

## デプロイ手順

### 1. Vercelプロジェクトの作成

1. [Vercel](https://vercel.com)にログイン
2. "New Project"をクリック
3. GitHubリポジトリ `dpro-chat-app` をインポート
4. Framework Presetで「Nuxt.js」を選択

### 2. 環境変数の設定

Vercelダッシュボードの「Settings」→「Environment Variables」で以下を設定：

#### 必須環境変数

```
GOOGLE_API_KEY=<Gemini APIキー>
FIREBASE_PROJECT_ID=novaspheregraph
GCS_BUCKET_NAME=dpro-ns
GCS_PROJECT_ID=gen-lang-client-0409194436
DISABLE_PARQUET_WASM=true
```

#### Base64エンコードされた認証情報

以下のキーはBase64エンコードして設定する必要があります：

1. **GOOGLE_APPLICATION_CREDENTIALS_BASE64**
   - Firebase Admin SDKキーのBase64エンコード値
   - 既にクリップボードにコピー済み

2. **GCS_KEY_BASE64**
   - GCSサービスアカウントキーのBase64エンコード値
   - `/tmp/gcs-key-base64.txt`に保存済み

### 3. ビルド設定の確認

- **Build Command**: `npm run build`
- **Output Directory**: `.output/public`
- **Install Command**: `npm install`

### 4. デプロイ

1. すべての環境変数を設定後、「Deploy」をクリック
2. ビルドログを監視
3. デプロイ完了後、提供されたURLでアプリケーションにアクセス

## トラブルシューティング

### ビルドエラー

- Node.jsバージョンが18以上であることを確認
- 環境変数が正しく設定されているか確認

### 実行時エラー

- Firebaseの認証情報が正しくBase64エンコードされているか確認
- GCSバケットへのアクセス権限を確認

### Parquet関連のエラー

- `DISABLE_PARQUET_WASM=true`が設定されているか確認

## セキュリティ注意事項

- APIキーや認証情報は決して公開リポジトリにコミットしない
- Vercelの環境変数は安全に保管される
- 本番環境では最小権限の原則に従ってサービスアカウントを設定

## カスタムドメイン

Vercelダッシュボードの「Settings」→「Domains」からカスタムドメインを追加できます。

## 継続的デプロイ

GitHubリポジトリの`main`ブランチにプッシュすると、自動的にVercelにデプロイされます。