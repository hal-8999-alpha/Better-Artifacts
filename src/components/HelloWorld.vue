<template>
  <div class="container">
    <div class="left-column">
      <ConversationTabs
        :conversationTabs="conversationTabs"
        :activeTabIndex="activeTabIndex"
        @selectTab="selectTab"
        @addNewTab="addNewTab"
        @removeTab="removeTab"
        @updateTabName="updateTabName"
      />
      <Conversation :conversation="activeConversation" />
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
      <UserInput @sendMessage="handleSend" />
    </div>
    <div class="right-column">
      <div class="top-controls">
        <div class="left-controls">
          <transition name="fade">
            <div v-if="selectedMode === 'Project'" class="update-container">
              <button 
                @click="handleUpdate" 
                :disabled="!updateEnabled || isUpdating"
                class="update-button"
              >
                {{ isUpdating ? 'Updating...' : 'Update' }}
              </button>
              <div v-if="isUpdating" class="spinner"></div>
              <span v-if="lastUpdateTime && !isUpdating" class="last-update-time">
                Last updated: {{ lastUpdateTime }}
              </span>
            </div>
          </transition>
        </div>
        <div class="right-controls">
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
      </div>
      <CodeDisplay 
        :codeScripts="codeScripts" 
        :activeTab="activeTab"
        @setActiveTab="setActiveTab"
        @copyCode="copyCode"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useStore } from 'vuex';
import { makeApiCall, startProcess } from '../services';
import ConversationTabs from './ConversationTabs.vue';
import TopControls from './TopControls.vue';
import Conversation from './Conversation.vue';
import UserInput from './UserInput.vue';
import CodeDisplay from './CodeDisplay.vue';

const store = useStore();

const codeScripts = ref([]);
const activeTab = ref(0);
const models = ['Claude', 'GPT4o'];
const selectedModel = ref('Claude');
const modes = ['Code', 'Chat', 'Project'];
const selectedMode = ref('Code');
const updateEnabled = ref(false);
const lastUpdateTime = ref('');
const isUpdating = ref(false);
const fileInput = ref(null);

const conversationTabs = ref([
  { name: 'Conversation 1', conversation: [] }
]);
const activeTabIndex = ref(0);

const activeConversation = computed(() => conversationTabs.value[activeTabIndex.value].conversation);

const handleModelChange = () => {
  console.log(`Model changed to: ${selectedModel.value}`);
};

const handleModeChange = () => {
  console.log(`Mode changed to: ${selectedMode.value}`);
};

const handleUpdate = async () => {
  console.log('Update button clicked');
  isUpdating.value = true;
  updateEnabled.value = false;
  
  try {
    const result = await startProcess();
    if (result.status === 'success') {
      console.log(result.message);
      lastUpdateTime.value = formatDate(new Date());
    } else {
      console.error(result.message);
    }
  } catch (error) {
    console.error('Error during update:', error);
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

const handleSend = async (message) => {
  if (!message.trim()) return;

  const currentConversation = conversationTabs.value[activeTabIndex.value].conversation;
  currentConversation.push({ role: 'user', content: message });
  
  const response = await makeApiCall(selectedModel.value, message);
  
  if (selectedModel.value === 'GPT4o') {
    const codeBlockRegex = /```[\s\S]*?```/g;
    const codeBlocks = response.content.match(codeBlockRegex) || [];
    let conversationText = response.content;

    codeBlocks.forEach((block, index) => {
      conversationText = conversationText.replace(block, `[Code Block ${index + 1}]`);
    });

    currentConversation.push({ role: 'assistant', content: conversationText });
    
    if (codeBlocks.length > 0) {
      codeScripts.value = codeBlocks.map(block => block.replace(/```/g, '').trim());
    } else {
      codeScripts.value = [];
    }
  } else if (selectedModel.value === 'Claude') {
    currentConversation.push({ role: 'assistant', content: response.conversation });
    codeScripts.value = response.codeScripts;

    console.log('Updating tokens and cost:', response.usage);
    store.dispatch('updateTokensAndCost', {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens
    });
  }

  activeTab.value = 0;
  updateEnabled.value = true;
};

const copyConversation = () => {
  const conversationText = activeConversation.value
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

const openFileExplorer = () => {
  fileInput.value.click();
};

const handleFileSelection = (event) => {
  const files = event.target.files;
  if (files.length > 0) {
    const fileNames = Array.from(files).map(file => file.name);
    store.dispatch('setSelectedFiles', fileNames);
    console.log('Selected files:', fileNames);
  }
};

const selectTab = (index) => {
  activeTabIndex.value = index;
};

const addNewTab = () => {
  const newTabIndex = conversationTabs.value.length + 1;
  conversationTabs.value.push({
    name: `Conversation ${newTabIndex}`,
    conversation: []
  });
  activeTabIndex.value = conversationTabs.value.length - 1;
};

const removeTab = (index) => {
  if (conversationTabs.value.length > 1) {
    conversationTabs.value.splice(index, 1);
    if (activeTabIndex.value >= index && activeTabIndex.value > 0) {
      activeTabIndex.value--;
    }
  }
};

const updateTabName = (index, newName) => {
  conversationTabs.value[index].name = newName;
};

const setActiveTab = (index) => {
  activeTab.value = index;
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
</script>

<style scoped>
.container {
  display: flex;
  height: 100vh;
  font-family: 'Arial', sans-serif;
  background-color: #000000;
  color: #cccccc;
  overflow: hidden;
}

.left-column, .right-column {
  display: flex;
  flex-direction: column;
  width: 50%;
  padding: 1rem;
  position: relative;
  overflow-y: auto;
}

.content, .formatted-code {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
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

.copy-button {
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

.copy-button:hover {
  background-color: #444444;
}

.copy-button svg {
  stroke: currentColor;
}

.top-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  height: 36px; /* Set a fixed height to prevent shifting */
}

.left-controls {
  display: flex;
  align-items: center;
}

.right-controls {
  display: flex;
  gap: 0.5rem;
  align-items: center;
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

.update-button {
  height: 36px;
  border-radius: 20px;
  background-color: #8e44ad;
  color: white;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  padding: 0 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.update-button:disabled {
  background-color: #333333;
  color: #cccccc;
  cursor: not-allowed;
  opacity: 0.7;
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

select {
  height: 36px;
  border-radius: 20px;
  background-color: #333333;
  color: #cccccc;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  padding: 0 1rem;
}

select:focus {
  outline: none;
  box-shadow: 0 0 0 2px #3498db;
}

.file-button {
  background-color: transparent;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  width: 36px;
}

.file-button:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.file-button svg {
  width: 24px;
  height: 24px;
}

/* Fade transition styles */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>