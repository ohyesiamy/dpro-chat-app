<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
      <h2 class="text-3xl font-bold mb-6">Dpro Chat について</h2>
      
      <div class="prose prose-lg dark:prose-invert max-w-none">
        <p class="text-lg text-gray-600 dark:text-gray-300 mb-6">
          Dpro Chatは、大規模な広告データを分析し、AIを活用して洞察を提供するチャットボットシステムです。
        </p>
        
        <h3 class="text-xl font-semibold mt-8 mb-4">主な機能</h3>
        <ul class="space-y-2">
          <li>✨ <strong>AIチャット</strong> - 自然言語で広告データについて質問できます</li>
          <li>📊 <strong>データ分析</strong> - 3.5億行以上の広告データを瞬時に分析</li>
          <li>🎯 <strong>プラットフォーム別分析</strong> - Instagram、Facebook、TikTokなどの比較</li>
          <li>🏷️ <strong>ジャンル別統計</strong> - 美容、健康、サプリメントなどカテゴリー別の分析</li>
        </ul>
        
        <h3 class="text-xl font-semibold mt-8 mb-4">データ概要</h3>
        <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
          <dl class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt class="text-sm font-medium text-gray-500">総データ行数</dt>
              <dd class="text-lg font-semibold">349,027,010行</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-gray-500">データサイズ</dt>
              <dd class="text-lg font-semibold">約112GB</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-gray-500">期間</dt>
              <dd class="text-lg font-semibold">2023年10月〜2025年3月</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-gray-500">CSVファイル数</dt>
              <dd class="text-lg font-semibold">440ファイル</dd>
            </div>
          </dl>
        </div>
        
        <h3 class="text-xl font-semibold mt-8 mb-4">技術スタック</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div class="text-2xl mb-2">🤖</div>
            <p class="text-sm font-medium">Gemini AI</p>
          </div>
          <div class="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div class="text-2xl mb-2">🔥</div>
            <p class="text-sm font-medium">Firebase</p>
          </div>
          <div class="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div class="text-2xl mb-2">⚡</div>
            <p class="text-sm font-medium">FastAPI</p>
          </div>
          <div class="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div class="text-2xl mb-2">💚</div>
            <p class="text-sm font-medium">Nuxt 3</p>
          </div>
        </div>
        
        <div class="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p class="text-sm text-blue-800 dark:text-blue-200">
            <strong>注意:</strong> このシステムは広告データの分析と洞察の提供を目的としています。
            投資判断や事業戦略の決定には、複数の情報源と専門家の意見を参考にしてください。
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'About - Dpro Chat'
})
</script>