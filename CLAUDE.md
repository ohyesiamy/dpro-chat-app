# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dpro Chat is a Nuxt 3 application that provides an AI-powered chat interface for analyzing advertising data from Instagram, Facebook, and other social media platforms. It processes ~350 million rows of advertising data using Firebase, Google Cloud Storage, and Google's Gemini API via a RAG (Retrieval-Augmented Generation) system.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Generate static site
npm run generate
```

## Architecture Overview

### Core Services (Singleton Pattern)

1. **ChatService** (`server/services/chatService.ts`)
   - Central orchestrator for chat functionality
   - Manages sessions (24-hour auto-cleanup)
   - Coordinates between DataService and RAGSystem
   - Decides between basic and enhanced RAG based on query content

2. **FirebaseService** (`server/services/firebaseService.ts`)
   - Handles Firebase Admin SDK initialization
   - Manages Firestore and Cloud Storage operations
   - Uses `novaspheregraph.firebasestorage.app` bucket

3. **DataService** (`server/services/dataService.ts`)
   - Loads and caches data summaries from Firebase Storage
   - Provides platform and genre statistics
   - Handles RAG data download (currently optional)

4. **EnhancedRAGSystem** (`server/utils/rag-enhanced.ts`)
   - Advanced RAG implementation with Parquet file support
   - Manages vector stores and document search
   - Handles time-series data queries
   - Falls back gracefully when Parquet processing fails

5. **RAGSystem** (`server/utils/rag.ts`)
   - Basic LangChain with Google Gemini integration
   - Creates vector store from advertising data summaries
   - Uses Gemini 1.5 Flash model

### Storage Architecture

The application uses two storage systems:
- **Firebase Storage**: Original project storage (`novaspheregraph.firebasestorage.app`)
- **GCS**: Data bucket (`dpro-ns`) containing time series data

### Data Path Structure

GCS data is stored with the following structure:
- `timeseries_data/by_genre/genre_timeseries.parquet`
- `timeseries_data/by_platform/platform_timeseries.parquet`
- `timeseries_data/by_advertiser/advertiser_timeseries.parquet`
- `timeseries_data/daily/daily_aggregation.parquet`
- `timeseries_data/monthly/monthly_aggregation.parquet`
- `timeseries_data/raw_consolidated/consolidated_YYYY_MM.parquet`
- `timeseries_data/trends/trend_analysis_report.json`

## API Endpoints

All API endpoints are defined in `server/api/`:
- `POST /api/chat` - Main chat endpoint
- `GET /api/status` - Health check
- `GET /api/data/summary` - Data overview
- `GET /api/data/platforms` - Platform statistics
- `GET /api/data/genres` - Genre statistics
- `GET /api/timeseries/daily` - Daily aggregation data
- `GET /api/timeseries/platform` - Platform-specific time series
- `POST /api/parquet/parse` - Parquet file parsing
- `POST /api/rag/query` - Direct RAG queries

## Environment Configuration

Create `.env` file with:
```env
# Firebase credentials (absolute path)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/firebase-admin-sdk.json
FIREBASE_PROJECT_ID=novaspheregraph

# Gemini API key
GOOGLE_API_KEY=your-gemini-api-key

# GCS settings for time series data
GCS_BUCKET_NAME=dpro-ns
GCS_KEY_PATH=/path/to/gcs-service-account.json
GCS_PROJECT_ID=gen-lang-client-0409194436

# Parquet processing (recommended: true due to ES module issues)
DISABLE_PARQUET_WASM=true
```

### Vercel Production Environment
For Vercel deployment, use Base64 encoded credentials:
- `GOOGLE_APPLICATION_CREDENTIALS_BASE64`
- `GCS_KEY_BASE64`

Use this command to encode: `base64 -i your-service-account.json | pbcopy`

## Key Implementation Details

### Nuxt Configuration
- SSR disabled (`ssr: false`) for client-side rendering
- Uses Vite plugins for WASM support (though currently disabled)
- Custom rollup plugin for CommonJS polyfills
- Payload extraction disabled for ES module compatibility

### Error Handling Strategy
- Services use try-catch with graceful fallbacks
- Parquet processing errors are caught and logged without breaking functionality
- Missing files trigger warnings but don't stop execution
- Enhanced RAG falls back to basic RAG on error

### Session Management
- Sessions stored in memory (not persisted)
- Auto-cleanup of sessions older than 24 hours
- UUID-based session IDs generated client-side

### Type Definitions
- `server/types/index.ts` - Chat and data interfaces
- `server/types/timeseries.ts` - Time series and RAG-specific types

## Current Known Issues

1. **Parquet WASM Module Error**
   - `parquet-wasm` causes "require is not defined" error in ES module context
   - Solution: Set `DISABLE_PARQUET_WASM=true` to use `parquetjs-lite` fallback
   - Error is logged but doesn't prevent app from running

2. **Missing RAG Data Warning**
   - `rag_optimized_data.parquet` is optional and warning has been suppressed
   - App functions normally without this file

3. **GCS Permissions**
   - Service account must have `Storage Object Viewer` role on `dpro-ns` bucket
   - Grant access with: `gcloud storage buckets add-iam-policy-binding gs://dpro-ns --member="serviceAccount:dpro-chat-app@gen-lang-client-0409194436.iam.gserviceaccount.com" --role="roles/storage.objectViewer"`

## Data Context

The application analyzes advertising data with:
- ~350 million rows across 440 CSV files
- Date range: 2023-10-06 to 2025-03-31 (with data gaps)
- Platforms: Instagram (60.4%), Facebook (28.8%), LAP (14.8%), X (9.5%), TikTok (0.4%)
- Primary focus: Beauty/health sector (70%)
- Data gaps: 2023-12-18 to 2024-01-11, 2024-04-24 to 2024-07-09

## Development Notes

### Query Processing Flow
1. User message → ChatInterface.vue → chatStore
2. chatStore → POST /api/chat → ChatService
3. ChatService analyzes query for time-based keywords
4. Routes to Enhanced RAG (time-series) or Basic RAG (general)
5. RAG system generates response with Gemini
6. Response streams back to user

### Adding New Features
- Services must be singleton instances (see existing patterns)
- API routes go in `server/api/`
- Use TypeScript interfaces in `server/types/`
- Handle errors gracefully with appropriate fallbacks
- Cache expensive operations where appropriate

### Testing Locally
1. Ensure all environment variables are set
2. Run `npm run dev`
3. Test chat functionality at `http://localhost:3000`
4. Monitor server console for error logs
5. Check browser console for client-side issues