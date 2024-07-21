<template>
    <div class="content-wrapper">
      <div class="content" ref="chatContainer">
        <div v-for="(message, index) in conversation" :key="index" :class="{ 'message-space': index > 0 }">
          <p :class="{ 'user-message': message.role === 'user', 'ai-message': message.role === 'assistant' }">
            <span v-if="message.role === 'user'">{{ message.content }}</span>
            <span v-else v-html="formatMessage(message.content)"></span>
          </p>
        </div>
      </div>
      <button @click="clearConversation" class="clear-button" title="Refresh conversation">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M23 4v6h-6"></path>
          <path d="M1 20v-6h6"></path>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
        </svg>
      </button>
    </div>
  </template>
  
  <script setup>
  import { defineProps, defineEmits, ref, watch, nextTick } from 'vue';
  
  const props = defineProps(['conversation']);
  const emit = defineEmits(['clear']);
  
  const chatContainer = ref(null);
  
  const formatMessage = (content) => {
    return content.replace(/\n/g, '<br>');
  };
  
  const clearConversation = () => {
    emit('clear');
  };
  
  const scrollToBottom = () => {
    nextTick(() => {
      if (chatContainer.value) {
        chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
      }
    });
  };
  
  watch(() => props.conversation, () => {
    scrollToBottom();
  }, { deep: true });
  </script>
  
  <style scoped>
  .content-wrapper {
    position: relative;
    height: 100%; /* This ensures the wrapper takes full height of its container */
  }
  
  .content {
    height: 95%;
    overflow-y: auto;
    padding: 1rem;
    border-radius: 8px;
    background-color: #000000;
    box-shadow: 0 4px 6px rgba(255, 255, 255, 0.1);
    scrollbar-width: thin;
    scrollbar-color: #444444 #222222;
  }
  
  .content::-webkit-scrollbar {
    width: 8px;
  }
  
  .content::-webkit-scrollbar-track {
    background: #222222;
  }
  
  .content::-webkit-scrollbar-thumb {
    background-color: #444444;
    border-radius: 4px;
    border: 2px solid #222222;
  }
  
  .user-message, .ai-message {
    text-align: left;
    margin-bottom: 0.5rem;
    white-space: pre-wrap;
  }
  
  .user-message {
    color: #4a9eff;
  }
  
  .ai-message {
    color: #cccccc;
  }
  
  .message-space {
    margin-top: 1rem;
  }
  
  .clear-button {
    position: absolute;
    bottom: 1rem;
    right: 1rem;
    background-color: rgba(68, 68, 68, 0.7);
    color: #cccccc;
    border: none;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background-color 0.3s ease;
  }
  
  .clear-button:hover {
    background-color: rgba(68, 68, 68, 1);
  }
  </style>