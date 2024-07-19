<template>
  <div class="container">
    <div class="left-column">
      <div class="content">
        <div v-for="(message, index) in conversation" :key="index">
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
        <input 
          type="text" 
          ref="userInput" 
          v-model="userInputText" 
          placeholder="Enter text here..." 
          @keyup.enter="handleSend"
        >
        <button @click="handleSend" class="send-button">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </button>
      </div>
    </div>
    <div class="right-column">
      <div class="dropdown">
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
import { makeApiCall } from '../services';

const store = useStore();

const userInput = ref(null);
const userInputText = ref('');
const conversation = ref([]);
const codeScripts = ref([]);
const activeTab = ref(0);
const models = ['Claude', 'GPT4o'];
const selectedModel = ref('Claude');

onMounted(() => {
  userInput.value.focus();
});

const handleModelChange = () => {
  console.log(`Model changed to: ${selectedModel.value}`);
};

const handleSend = async () => {
  if (!userInputText.value.trim()) return;

  conversation.value.push({ role: 'user', content: userInputText.value });
  const response = await makeApiCall(selectedModel.value, userInputText.value);
  
  if (selectedModel.value === 'GPT4o') {
    // Parse OpenAI response (unchanged)
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

input {
  flex-grow: 1;
  padding: 0.75rem;
  border: none;
  border-radius: 4px;
  background-color: #333333;
  color: #cccccc;
  font-size: 1rem;
}

input:focus {
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

.dropdown {
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 1000;
}

select {
  padding: 0.5rem;
  border-radius: 20px;
  background-color: #333333;
  color: #cccccc;
  border: none;
  cursor: pointer;
}

select:focus {
  outline: none;
  box-shadow: 0 0 0 2px #3498db;
}

.default-text {
  color: #666;
  text-align: center;
  margin-top: 2rem;
}
</style>