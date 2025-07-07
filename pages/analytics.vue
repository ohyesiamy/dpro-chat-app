<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <h2 class="text-2xl font-bold mb-6">データ分析ダッシュボード</h2>
    
    <div v-if="dataStore.isLoading" class="text-center py-12">
      <LoadingIndicator />
      <p class="mt-4 text-gray-500">データを読み込み中...</p>
    </div>
    
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <!-- 総広告数カード -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 class="text-sm font-medium text-gray-500 mb-2">総広告数</h3>
        <p class="text-3xl font-bold text-gray-900 dark:text-white">
          {{ formatNumber(dataStore.summary?.total_ads || 0) }}
        </p>
      </div>
      
      <!-- 総コストカード -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 class="text-sm font-medium text-gray-500 mb-2">総広告費</h3>
        <p class="text-3xl font-bold text-gray-900 dark:text-white">
          ¥{{ formatCurrency(dataStore.summary?.total_cost || 0) }}
        </p>
      </div>
      
      <!-- データ期間カード -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 class="text-sm font-medium text-gray-500 mb-2">データ期間</h3>
        <p class="text-lg font-medium text-gray-900 dark:text-white">
          {{ dataStore.summary?.date_range || '-' }}
        </p>
      </div>
      
      <!-- プラットフォーム別グラフ -->
      <div class="col-span-full lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 class="text-lg font-semibold mb-4">プラットフォーム別広告費</h3>
        <div class="space-y-4">
          <div v-for="platform in dataStore.platforms" :key="platform.platform_name">
            <div class="flex justify-between mb-1">
              <span class="text-sm font-medium">{{ platform.platform_name }}</span>
              <span class="text-sm text-gray-500">{{ platform.percentage }}%</span>
            </div>
            <div class="w-full h-6 bg-gray-200 rounded-full overflow-hidden">
              <div class="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                   :style="`width: ${platform.percentage}%`"></div>
            </div>
            <p class="text-xs text-gray-500 mt-1">
              {{ formatNumber(platform.total_ads) }}件 / ¥{{ formatCurrency(platform.total_cost) }}
            </p>
          </div>
        </div>
      </div>
      
      <!-- ジャンル別ランキング -->
      <div class="col-span-full lg:col-span-1 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 class="text-lg font-semibold mb-4">トップジャンル</h3>
        <div class="space-y-3">
          <div v-for="(genre, index) in dataStore.genres.slice(0, 10)" :key="genre.genre_name"
               class="flex items-center justify-between">
            <div class="flex items-center">
              <span class="text-sm font-semibold text-gray-500 w-6">{{ index + 1 }}</span>
              <span class="text-sm ml-2">{{ genre.genre_name }}</span>
            </div>
            <span class="text-sm font-medium">{{ formatNumber(genre.total_ads) }}件</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useDataStore } from '~/stores/data'

const dataStore = useDataStore()

useHead({
  title: '分析 - Dpro Chat'
})

onMounted(() => {
  if (!dataStore.hasData) {
    dataStore.fetchDataSummary()
  }
})

const formatNumber = (num: number) => {
  return num.toLocaleString('ja-JP')
}

const formatCurrency = (num: number) => {
  const trillion = num / 1_000_000_000_000
  if (trillion >= 1) {
    return `${trillion.toFixed(1)}兆`
  }
  const billion = num / 1_000_000_000
  if (billion >= 1) {
    return `${billion.toFixed(1)}億`
  }
  const million = num / 1_000_000
  if (million >= 1) {
    return `${million.toFixed(1)}万`
  }
  return formatNumber(Math.round(num))
}
</script>