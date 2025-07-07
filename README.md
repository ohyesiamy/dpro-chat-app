# Dpro Chat - 広告データ分析AIチャットボット

Dpro Chatは、Instagram、Facebook、X（旧Twitter）などのソーシャルメディア広告データを分析するためのAIチャットボットアプリケーションです。Firebase、Google Cloud Storage、Gemini APIを活用し、約3.5億行の広告データに対してRAG（Retrieval-Augmented Generation）ベースの高度な分析を提供します。

## 🚀 主な機能

- **リアルタイムチャット**: Gemini AIを活用した自然言語での広告データ分析
- **大規模データ処理**: 3.5億行（440ファイル、約112GB）の広告データを効率的に処理
- **プラットフォーム別分析**: Instagram、Facebook、X、TikTok、LAPの広告データを統合分析
- **時系列分析**: 2023年10月から2025年3月までのトレンド分析
- **RAGシステム**: 高度な検索拡張生成による正確な回答

## 📋 前提条件

- Node.js 18.x以上
- Firebase プロジェクト
- Google Cloud Storage バケット
- Gemini API キー

## 🛠️ セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.example`を`.env`にコピーして、必要な情報を設定してください：

```bash
cp .env.example .env
```

必要な環境変数：
- `GOOGLE_API_KEY`: Gemini APIキー
- `GOOGLE_APPLICATION_CREDENTIALS`: Firebase Admin SDKの認証情報ファイルパス
- `FIREBASE_PROJECT_ID`: FirebaseプロジェクトID
- `GCS_BUCKET_NAME`: Google Cloud Storageバケット名
- `GCS_KEY_PATH`: GCSサービスアカウントキーのパス
- `GCS_PROJECT_ID`: GCPプロジェクトID
- `DISABLE_PARQUET_WASM`: `true`に設定（推奨）

### 3. Firebase設定

1. Firebase Admin SDKの秘密鍵をダウンロード
2. 環境変数`GOOGLE_APPLICATION_CREDENTIALS`にパスを設定

### 4. GCS設定

1. GCSサービスアカウントを作成し、`Storage Object Viewer`権限を付与
2. サービスアカウントキーをダウンロード
3. 環境変数`GCS_KEY_PATH`にパスを設定

## 💻 開発

### 開発サーバーの起動

```bash
npm run dev
```

アプリケーションは`http://localhost:3000`で起動します。

### ビルド

```bash
npm run build
```

### プレビュー

```bash
npm run preview
```

## 🏗️ アーキテクチャ

### コアサービス（シングルトンパターン）

1. **ChatService**: チャット機能の中心的なオーケストレーター
2. **FirebaseService**: Firebase Admin SDKの管理
3. **DataService**: データサマリーのロードとキャッシュ
4. **EnhancedRAGSystem**: Parquetファイルサポート付き高度なRAG実装
5. **RAGSystem**: LangChainとGemini統合による基本RAG

### データストレージ

- **Firebase Storage**: オリジナルプロジェクトストレージ
- **Google Cloud Storage**: 時系列データバケット（`dpro-ns`）

### APIエンドポイント

- `POST /api/chat`: メインチャットエンドポイント
- `GET /api/status`: ヘルスチェック
- `GET /api/data/summary`: データ概要
- `GET /api/data/platforms`: プラットフォーム統計
- `GET /api/data/genres`: ジャンル統計
- `GET /api/timeseries/daily`: 日次集計データ
- `GET /api/timeseries/platform`: プラットフォーム別時系列

## 📊 データコンテキスト

分析対象の広告データ：
- **データ量**: 約3.5億行（440 CSVファイル）
- **期間**: 2023年10月6日〜2025年3月31日（一部欠損あり）
- **プラットフォーム構成**:
  - Instagram: 60.4%
  - Facebook: 28.8%
  - LAP: 14.8%
  - X: 9.5%
  - TikTok: 0.4%
- **主要分野**: 美容・健康セクター（70%）

## 🚀 Vercelへのデプロイ

### 1. Vercel CLIのインストール

```bash
npm i -g vercel
```

### 2. デプロイ

```bash
vercel
```

### 3. 環境変数の設定

Vercelダッシュボードで以下の環境変数を設定：
- すべての`.env`ファイルの変数
- サービスアカウントキーはBase64エンコードして設定

```bash
# サービスアカウントキーのBase64エンコード
base64 -i your-service-account.json | pbcopy
```

## 🔒 セキュリティ

- サービスアカウントキーは`.gitignore`に含まれています
- 本番環境では環境変数を使用してください
- APIキーは公開リポジトリにコミットしないでください

## 📝 ライセンス

MIT License

## 🤝 貢献

プルリクエストを歓迎します。大きな変更の場合は、まずイシューを開いて変更内容を議論してください。
