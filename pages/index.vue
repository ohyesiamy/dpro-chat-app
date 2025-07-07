<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-10rem)]">
      <!-- チャットエリア -->
      <div class="lg:col-span-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg flex flex-col">
        <div class="p-4 border-b">
          <h2 class="text-lg font-semibold">AIチャット</h2>
        </div>
        <div class="flex-1 overflow-hidden">
          <ChatInterface />
        </div>
      </div>
      
      <!-- サイドバー -->
      <div class="lg:col-span-1 space-y-4">
        <DataStats />
        
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h3 class="text-sm font-semibold mb-2">使い方</h3>
          <ul class="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li>• 広告データについて質問してください</li>
            <li>• 統計情報や傾向を分析できます</li>
            <li>• 具体的な数値を含む回答を提供します</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'チャット - Dpro Chat'
})
</script>