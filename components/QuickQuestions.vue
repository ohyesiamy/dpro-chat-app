<template>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-2xl mx-auto">
    <button
      v-for="question in questions"
      :key="question"
      @click="$emit('select', question)"
      class="p-3 text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
    >
      <span class="text-sm text-gray-700 dark:text-gray-300">{{ question }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
defineEmits<{
  select: [question: string]
}>()

const questions = [
  '最新の月次データの傾向を教えてください',
  'Instagram広告の平均コストはいくらですか？',
  '美容系ジャンルのパフォーマンスはどうですか？',
  '2024年の広告トレンドを分析してください'
]
</script>