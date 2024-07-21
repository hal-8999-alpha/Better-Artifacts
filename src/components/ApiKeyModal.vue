<template>
    <transition name="modal">
      <div v-if="show" class="modal-overlay" @click="closeModal">
        <div class="modal-content" @click.stop>
          <button @click="closeModal" class="close-button">&times;</button>
          <h2>API Keys</h2>
          <div v-if="error" class="error-message">{{ error }}</div>
          <div class="input-group">
            <label for="claude-api-key">Claude API Key:</label>
            <div class="input-with-toggle">
              <input 
                :type="showClaudeKey ? 'text' : 'password'" 
                id="claude-api-key" 
                v-model="claudeApiKey" 
                placeholder="Enter Claude API Key"
              >
              <button @click="toggleClaudeKeyVisibility" class="toggle-visibility">
                {{ showClaudeKey ? 'Hide' : 'Show' }}
              </button>
            </div>
          </div>
          <div class="input-group">
            <label for="openai-api-key">OpenAI API Key:</label>
            <div class="input-with-toggle">
              <input 
                :type="showOpenAIKey ? 'text' : 'password'" 
                id="openai-api-key" 
                v-model="openaiApiKey" 
                placeholder="Enter OpenAI API Key"
              >
              <button @click="toggleOpenAIKeyVisibility" class="toggle-visibility">
                {{ showOpenAIKey ? 'Hide' : 'Show' }}
              </button>
            </div>
          </div>
          <button @click="saveKeys" class="save-button">Save Keys</button>
        </div>
      </div>
    </transition>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue';
  import { saveApiKeys, getApiKeys } from '../services';
  
  const props = defineProps({
    show: Boolean
  });
  
  const emit = defineEmits(['close']);
  
  const claudeApiKey = ref('');
  const openaiApiKey = ref('');
  const showClaudeKey = ref(false);
  const showOpenAIKey = ref(false);
  const error = ref('');
  
  const closeModal = () => {
    emit('close');
  };
  
  const toggleClaudeKeyVisibility = () => {
    showClaudeKey.value = !showClaudeKey.value;
  };
  
  const toggleOpenAIKeyVisibility = () => {
    showOpenAIKey.value = !showOpenAIKey.value;
  };
  
  const saveKeys = async () => {
    try {
      await saveApiKeys({
        claudeApiKey: claudeApiKey.value,
        openaiApiKey: openaiApiKey.value
      });
      alert('API keys saved successfully!');
      closeModal();
    } catch (err) {
      console.error('Error saving API keys:', err);
      error.value = 'Failed to save API keys. Please try again.';
    }
  };
  
  const loadKeys = async () => {
    try {
      const keys = await getApiKeys();
      claudeApiKey.value = keys.claudeApiKey;
      openaiApiKey.value = keys.openaiApiKey;
      error.value = '';
    } catch (err) {
      console.error('Error loading API keys:', err);
      error.value = 'Failed to load API keys. Please try again.';
    }
  };
  
  onMounted(loadKeys);
  </script>
  
  <style scoped>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }
  
  .modal-content {
    background-color: #1e1e1e;
    padding: 2rem;
    border-radius: 8px;
    width: 90%;
    max-width: 500px;
    position: relative;
  }
  
  .close-button {
    position: absolute;
    top: 1rem;
    right: 1rem;
    font-size: 1.5rem;
    background: none;
    border: none;
    color: #cccccc;
    cursor: pointer;
  }
  
  .close-button:hover {
    color: #ffffff;
  }
  
  h2 {
    color: #61dafb;
    margin-bottom: 1.5rem;
  }
  
  .input-group {
    margin-bottom: 1rem;
  }
  
  label {
    display: block;
    margin-bottom: 0.5rem;
    color: #cccccc;
  }
  
  .input-with-toggle {
    display: flex;
    align-items: center;
  }
  
  input {
    flex-grow: 1;
    padding: 0.5rem;
    border: 1px solid #444444;
    background-color: #333333;
    color: #ffffff;
    border-radius: 4px 0 0 4px;
  }
  
  .toggle-visibility {
    padding: 0.5rem;
    background-color: #444444;
    color: #ffffff;
    border: none;
    border-radius: 0 4px 4px 0;
    cursor: pointer;
  }
  
  .save-button {
    background-color: #8e44ad;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
    transition: background-color 0.3s ease;
  }
  
  .save-button:hover {
    background-color: #9b59b6;
  }
  
  .modal-enter-active,
  .modal-leave-active {
    transition: opacity 0.3s ease;
  }
  
  .modal-enter-from,
  .modal-leave-to {
    opacity: 0;
  }
  
  .error-message {
    color: #ff6b6b;
    margin-bottom: 1rem;
  }
  </style>