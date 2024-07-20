<template>
    <div class="user-input">
      <textarea 
        ref="userInput" 
        v-model="userInputText" 
        placeholder="Enter text here..." 
        @keyup.enter.exact.prevent="handleSend"
        @input="adjustTextareaHeight"
      ></textarea>
      <button @click="handleSend" class="send-button">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"></line>
          <polyline points="12 5 19 12 12 19"></polyline>
        </svg>
      </button>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue';
  
  const emit = defineEmits(['sendMessage']);
  
  const userInput = ref(null);
  const userInputText = ref('');
  
  onMounted(() => {
    userInput.value.focus();
  });
  
  const handleSend = () => {
    if (userInputText.value.trim()) {
      emit('sendMessage', userInputText.value);
      userInputText.value = '';
      adjustTextareaHeight();
    }
  };
  
  const adjustTextareaHeight = () => {
    const textarea = userInput.value;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  };
  </script>
  
  <style scoped>
  .user-input {
    display: flex;
    gap: 0.5rem;
  }
  
  textarea {
    flex-grow: 1;
    padding: 0.75rem;
    border: none;
    border-radius: 4px;
    background-color: #333333;
    color: #cccccc;
    font-size: 1rem;
    resize: none;
    overflow-y: hidden;
    min-height: 2.5rem;
    max-height: 200px;
  }
  
  textarea:focus {
    outline: none;
    box-shadow: 0 0 0 2px #3498db;
  }
  
  .send-button {
    padding: 0.75rem;
    border: none;
    border-radius: 4px;
    background-color: transparent;
    color: #cccccc;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .send-button:hover {
    background-color: #444444;
  }
  
  .send-button svg {
    stroke: currentColor;
  }
  </style>