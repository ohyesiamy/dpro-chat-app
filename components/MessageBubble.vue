<template>
  <div class="message-bubble" :class="messageClass">
    <div class="text-sm opacity-75 mb-1">
      {{ message.role === 'user' ? 'あなた' : 'AI' }}
    </div>
    <div v-if="message.role === 'assistant'" class="markdown-content" v-html="formattedContent"></div>
    <div v-else>{{ message.content }}</div>
    <div class="text-xs opacity-50 mt-1">
      {{ formatTime(message.timestamp) }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  message: {
    id: string
    content: string
    role: 'user' | 'assistant'
    timestamp: Date
    sources?: any[]
  }
}>()

const messageClass = computed(() => {
  return props.message.role === 'user' ? 'message-user' : 'message-assistant'
})

const formattedContent = computed(() => {
  // 簡易的なマークダウン処理
  let content = props.message.content
  
  // 改行を<br>に変換
  content = content.replace(/\n/g, '<br>')
  
  // 数値のフォーマット（カンマ区切り）
  content = content.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,')
  
  // リスト項目
  content = content.replace(/^- (.+)$/gm, '• $1')
  
  // 太字
  content = content.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  
  return content
})

const formatTime = (timestamp: Date) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('ja-JP', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}
</script>