<template>
  <div class="flex flex-col h-full">
    <!-- メッセージエリア -->
    <div class="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
      <div v-if="!chatStore.hasMessages" class="text-center text-gray-500 mt-8">
        <p class="text-lg mb-4">広告データについて何でも聞いてください</p>
        <QuickQuestions @select="handleQuickQuestion" />
      </div>
      
      <div v-for="message in chatStore.messages" :key="message.id" 
           class="flex" :class="message.role === 'user' ? 'justify-end' : 'justify-start'">
        <MessageBubble :message="message" />
      </div>
      
      <div v-if="chatStore.isLoading" class="flex justify-start">
        <div class="message-bubble message-assistant">
          <LoadingIndicator />
        </div>
      </div>
    </div>
    
    <!-- エラー表示 -->
    <div v-if="chatStore.error" class="px-4 py-2 bg-red-100 text-red-700 text-sm">
      {{ chatStore.error }}
    </div>
    
    <!-- 入力エリア -->
    <div class="border-t p-4">
      <form @submit.prevent="sendMessage" class="flex gap-2">
        <input
          v-model="inputMessage"
          type="text"
          placeholder="メッセージを入力..."
          class="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
          :disabled="chatStore.isLoading"
        />
        <button
          type="submit"
          :disabled="!inputMessage.trim() || chatStore.isLoading"
          class="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          送信
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { useChatStore } from '~/stores/chat'

const chatStore = useChatStore()
const inputMessage = ref('')

const sendMessage = async () => {
  const message = inputMessage.value.trim()
  if (!message) return
  
  inputMessage.value = ''
  await chatStore.sendMessage(message)
  
  // 自動スクロール
  nextTick(() => {
    const container = document.querySelector('.custom-scrollbar')
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  })
}

const handleQuickQuestion = (question: string) => {
  inputMessage.value = question
  sendMessage()
}
</script>