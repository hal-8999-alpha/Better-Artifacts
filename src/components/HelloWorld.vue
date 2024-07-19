<template>
  <div class="container">
    <div class="left-column">
      <div class="top-controls">
        <transition name="fade">
          <div v-if="selectedMode === 'Project'" class="update-container">
            <span v-if="lastUpdateTime && !isUpdating" class="last-update-time">
              Last updated: {{ lastUpdateTime }}
            </span>
            <div v-if="isUpdating" class="spinner"></div>
            <button 
              @click="handleUpdate" 
              :disabled="!updateEnabled || isUpdating"
              class="update-button"
            >
              {{ isUpdating ? 'Updating...' : 'Update' }}
            </button>
          </div>
        </transition>
      </div>
      <div class="content">
        <div v-for="(message, index) in conversation" :key="index" :class="{ 'message-space': index > 0 }">
          <p :class="{ 'user-message': message.role === 'user', 'ai-message': message.role === 'assistant' }">
            {{ message.content }}
          </p>
        </div>
      </div>
      <div class="info-row">
        <div class="info-column">Total Tokens: {{ $store.getters.getTotalTokens }}</div>
        <div class="info-column">Estimated Cost: {{ $store.getters.getFormattedCost }}</div>
        <div class="info-column">
          <button @click="copyConversation" class="copy-button">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
        </div>
      </div>
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
    </div>
    <div class="right-column">
      <div class="dropdowns">
        <transition name="fade">
          <button v-if="selectedMode === 'Project'" @click="openFileExplorer" class="file-button">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
          </button>
        </transition>
        <input 
          type="file" 
          ref="fileInput" 
          @change="handleFileSelection" 
          multiple 
          style="display: none;"
        >
        <select v-model="selectedMode" @change="handleModeChange">
          <option v-for="mode in modes" :key="mode" :value="mode">
            {{ mode }}
          </option>
        </select>
        <select v-model="selectedModel" @change="handleModelChange">
          <option v-for="model in models" :key="model" :value="model">
            {{ model }}
          </option>
        </select>
      </div>
      <div class="formatted-code">
        <p v-if="codeScripts.length === 0" class="default-text">Generated Code Will Go Here</p>
        <pre v-else><code>{{ codeScripts[activeTab] }}</code></pre>
        <button v-if="codeScripts.length > 0" @click="copyCode" class="copy-button code-copy-button">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        </button>
      </div>
      <div class="tabs" v-if="codeScripts.length > 0">
        <div 
          v-for="(tab, index) in codeScripts" 
          :key="index" 
          class="tab" 
          :class="{ 'active': activeTab === index }"
          @click="activeTab = index"
        >
          {{ index + 1 }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useStore } from 'vuex';
import { makeApiCall, startProcess } from '../services';

const store = useStore();

const userInput = ref(null);
const userInputText = ref('');
const conversation = ref([]);
const codeScripts = ref([]);
const activeTab = ref(0);
const models = ['Claude', 'GPT4o'];
const selectedModel = ref('Claude');
const modes = ['Code', 'Chat', 'Project'];
const selectedMode = ref('Code');
const updateEnabled = ref(false); // Disabled by default
const lastUpdateTime = ref('');
const isUpdating = ref(false);
const fileInput = ref(null);

onMounted(() => {
  userInput.value.focus();
});

const handleModelChange = () => {
  console.log(`Model changed to: ${selectedModel.value}`);
};

const handleModeChange = () => {
  console.log(`Mode changed to: ${selectedMode.value}`);
};

const handleUpdate = async () => {
  console.log('Update button clicked');
  isUpdating.value = true;
  updateEnabled.value = false; // Disable the button when clicked
  
  try {
    const result = await startProcess();
    if (result.status === 'success') {
      console.log(result.message);
      lastUpdateTime.value = formatDate(new Date());
    } else {
      console.error(result.message);
      // You might want to handle the error case here, e.g., show an error message to the user
    }
  } catch (error) {
    console.error('Error during update:', error);
    // Handle any unexpected errors here
  } finally {
    isUpdating.value = false;
  }
};

const formatDate = (date) => {
  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/New_York',
    timeZoneName: 'short'
  };
  return date.toLocaleString('en-US', options);
};

const handleSend = async () => {
  if (!userInputText.value.trim()) return;

  conversation.value.push({ role: 'user', content: userInputText.value });
  const response = await makeApiCall(selectedModel.value, userInputText.value);
  
  if (selectedModel.value === 'GPT4o') {
    const codeBlockRegex = /```[\s\S]*?```/g;
    const codeBlocks = response.content.match(codeBlockRegex) || [];
    let conversationText = response.content;

    codeBlocks.forEach((block, index) => {
      conversationText = conversationText.replace(block, `[Code Block ${index + 1}]`);
    });

    conversation.value.push({ role: 'assistant', content: conversationText });
    
    if (codeBlocks.length > 0) {
      codeScripts.value = codeBlocks.map(block => block.replace(/```/g, '').trim());
    } else {
      codeScripts.value = [];
    }
  } else if (selectedModel.value === 'Claude') {
    conversation.value.push({ role: 'assistant', content: response.conversation });
    codeScripts.value = response.codeScripts;

    console.log('Updating tokens and cost:', response.usage);
    store.dispatch('updateTokensAndCost', {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens
    });
  }

  userInputText.value = '';
  activeTab.value = 0;
  adjustTextareaHeight();
  updateEnabled.value = true; // Enable the update button after receiving a response
};

const copyConversation = () => {
  const conversationText = conversation.value
    .map(message => `${message.role}: ${message.content}`)
    .join('\n\n');
  navigator.clipboard.writeText(conversationText)
    .then(() => {
      console.log('Conversation copied to clipboard');
    })
    .catch(err => {
      console.error('Failed to copy conversation: ', err);
    });
};

const copyCode = () => {
  if (codeScripts.value.length > 0) {
    navigator.clipboard.writeText(codeScripts.value[activeTab.value])
      .then(() => {
        console.log('Code copied to clipboard');
      })
      .catch(err => {
        console.error('Failed to copy code: ', err);
      });
  }
};

const adjustTextareaHeight = () => {
  const textarea = userInput.value;
  textarea.style.height = 'auto';
  textarea.style.height = textarea.scrollHeight + 'px';
};

const openFileExplorer = () => {
  fileInput.value.click();
};

const handleFileSelection = (event) => {
  const files = event.target.files;
  if (files.length > 0) {
    // Note: Due to browser security restrictions, we can only access file names, not full paths
    const fileNames = Array.from(files).map(file => file.name);
    store.dispatch('setSelectedFiles', fileNames);
    console.log('Selected files:', fileNames);
  }
};
</script>

<style scoped>
.container {
  display: flex;
  height: 100vh;
  font-family: 'Arial', sans-serif;
  background-color: #000000;
  color: #cccccc;
}

.left-column, .right-column {
  display: flex;
  flex-direction: column;
  width: 50%;
  padding: 1rem;
  position: relative;
}

.top-controls {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 1rem;
}

.update-container {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.last-update-time {
  font-size: 0.9rem;
  color: #cccccc;
}

.dropdowns {
  display: flex;
  gap: 0.5rem;
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 1000;
}

.content, .formatted-code {
  flex-grow: 1;
  overflow-y: auto;
  padding: 1rem;
  border-radius: 8px;
  background-color: #000000;
  box-shadow: 0 4px 6px rgba(255, 255, 255, 0.1);
  position: relative;
  margin-bottom: 1rem;
}

.content p, .formatted-code pre {
  text-align: left;
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.user-message {
  color: #4a9eff;
  margin-bottom: 0.5rem;
}

.ai-message {
  color: #cccccc;
  margin-bottom: 0.5rem;
}

.message-space {
  margin-top: 1rem;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.info-column {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

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

.send-button, .copy-button {
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

.send-button:hover, .copy-button:hover {
  background-color: #444444;
}

.copy-button svg, .send-button svg {
  stroke: currentColor;
}

.code-copy-button {
  position: absolute;
  bottom: 0.5rem;
  right: 0.5rem;
}

.tabs {
  display: flex;
  gap: 0.5rem;
  height: 50px;
  background-color: #000000;
  border-radius: 25px;
  padding: 5px;
  overflow-x: auto;
}

.tab {
  flex: 0 0 auto;
  min-width: 50px;
  max-width: 120px;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #333333;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9rem;
  padding: 0 15px;
}

.tab:hover, .tab.active {
  background-color: #444444;
}

select, .update-button {
  padding: 0.5rem;
  border-radius: 20px;
  background-color: #333333;
  color: #cccccc;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  min-width: 100px;
}

select:focus, .update-button:focus {
  outline: none;
  box-shadow: 0 0 0 2px #3498db;
}

.update-button:not(:disabled) {
  background-color: #8e44ad;
  color: white;
}

.update-button:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.default-text {
  color: #666;
  text-align: center;
  margin-top: 2rem;
}

.file-button {
  background-color: transparent;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.file-button:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.file-button svg {
  width: 24px;
  height: 24px;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #cccccc;
  border-top: 2px solid #8e44ad;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Fade transition styles */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.content, .formatted-code {
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

.content::-webkit-scrollbar, .formatted-code::-webkit-scrollbar {
  width: 8px;
}

.content::-webkit-scrollbar-track, .formatted-code::-webkit-scrollbar-track {
  background: #222222;
}

.content::-webkit-scrollbar-thumb, .formatted-code::-webkit-scrollbar-thumb {
  background-color: #444444;
  border-radius: 4px;
  border: 2px solid #222222;
}
</style>