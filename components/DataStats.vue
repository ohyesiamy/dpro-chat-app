<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
    <h3 class="text-lg font-semibold mb-4">データ統計</h3>
    
    <div v-if="dataStore.isLoading" class="text-center py-8">
      <LoadingIndicator />
    </div>
    
    <div v-else-if="dataStore.hasData" class="space-y-4">
      <!-- サマリー -->
      <div v-if="dataStore.summary" class="grid grid-cols-2 gap-4">
        <div>
          <p class="text-sm text-gray-500">総広告数</p>
          <p class="text-xl font-bold">{{ formatNumber(dataStore.summary.total_ads) }}</p>
        </div>
        <div>
          <p class="text-sm text-gray-500">総コスト</p>
          <p class="text-xl font-bold">¥{{ formatNumber(Math.round(dataStore.summary.total_cost)) }}</p>
        </div>
        <div class="col-span-2">
          <p class="text-sm text-gray-500">データ期間</p>
          <p class="text-sm">{{ dataStore.summary.date_range }}</p>
        </div>
      </div>
      
      <!-- プラットフォーム統計 -->
      <div>
        <h4 class="text-sm font-medium mb-2">プラットフォーム別</h4>
        <div class="space-y-2">
          <div v-for="platform in dataStore.topPlatforms" :key="platform.platform_name" 
               class="flex justify-between items-center">
            <span class="text-sm">{{ platform.platform_name }}</span>
            <div class="text-right">
              <span class="text-sm font-medium">{{ platform.percentage }}%</span>
              <div class="w-20 h-2 bg-gray-200 rounded-full ml-2 inline-block">
                <div class="h-full bg-blue-500 rounded-full" 
                     :style="`width: ${platform.percentage}%`"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- ジャンル統計 -->
      <div>
        <h4 class="text-sm font-medium mb-2">トップジャンル</h4>
        <div class="space-y-1">
          <div v-for="genre in dataStore.topGenres" :key="genre.genre_name" 
               class="flex justify-between text-sm">
            <span>{{ genre.genre_name }}</span>
            <span class="text-gray-500">{{ formatNumber(genre.total_ads) }}件</span>
          </div>
        </div>
      </div>
    </div>
    
    <div v-else-if="dataStore.error" class="text-red-500 text-sm">
      {{ dataStore.error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useDataStore } from '~/stores/data'

const dataStore = useDataStore()

onMounted(() => {
  dataStore.fetchDataSummary()
})

const formatNumber = (num: number) => {
  return num.toLocaleString('ja-JP')
}
</script>