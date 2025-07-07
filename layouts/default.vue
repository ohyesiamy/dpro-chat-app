<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- ヘッダー -->
    <header class="bg-white dark:bg-gray-800 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <div class="flex items-center">
            <h1 class="text-xl font-bold text-gray-900 dark:text-white">
              Dpro Chat
            </h1>
            <span class="ml-2 text-sm text-gray-500">広告データ分析AI</span>
          </div>
          
          <nav class="flex items-center space-x-4">
            <NuxtLink to="/" class="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
              チャット
            </NuxtLink>
            <NuxtLink to="/analytics" class="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
              分析
            </NuxtLink>
            <NuxtLink to="/about" class="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
              About
            </NuxtLink>
            
            <!-- ダークモードトグル -->
            <button @click="toggleDarkMode" class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
              <svg v-if="isDark" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"></path>
              </svg>
              <svg v-else class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path>
              </svg>
            </button>
          </nav>
        </div>
      </div>
    </header>
    
    <!-- メインコンテンツ -->
    <main class="flex-1">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useDark, useToggle } from '@vueuse/core'

const isDark = useDark()
const toggleDarkMode = useToggle(isDark)
</script>