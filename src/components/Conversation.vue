<template>
    <div class="content">
      <div v-for="(message, index) in conversation" :key="index" :class="{ 'message-space': index > 0 }">
        <p :class="{ 'user-message': message.role === 'user', 'ai-message': message.role === 'assistant' }">
          <span v-if="message.role === 'user'">{{ message.content }}</span>
          <span v-else v-html="formatMessage(message.content)"></span>
        </p>
      </div>
    </div>
  </template>
  
  <script setup>
  import { defineProps } from 'vue';
  
  const props = defineProps(['conversation']);
  
  const formatMessage = (content) => {
    return content.replace(/\n/g, '<br>');
  };
  </script>
  
  <style scoped>
  .content {
    flex-grow: 1;
    overflow-y: auto;
    padding: 1rem;
    border-radius: 8px;
    background-color: #000000;
    box-shadow: 0 4px 6px rgba(255, 255, 255, 0.1);
    position: relative;
    margin-bottom: 1rem;
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
  </style>