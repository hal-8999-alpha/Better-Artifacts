<template>
    <div class="code-display">
      <div class="formatted-code">
        <p v-if="codeScripts.length === 0" class="default-text">Generated Code Will Go Here</p>
        <pre v-else><code>{{ codeScripts[activeTab] }}</code></pre>
        <button v-if="codeScripts.length > 0" @click="$emit('copyCode')" class="copy-button code-copy-button">
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
          @click="$emit('setActiveTab', index)"
        >
          {{ index + 1 }}
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  defineProps(['codeScripts', 'activeTab']);
  defineEmits(['setActiveTab', 'copyCode']);
  </script>
  
  <style scoped>
  .code-display {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  
  .formatted-code {
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
  
  .formatted-code::-webkit-scrollbar {
    width: 8px;
  }
  
  .formatted-code::-webkit-scrollbar-track {
    background: #222222;
  }
  
  .formatted-code::-webkit-scrollbar-thumb {
    background-color: #444444;
    border-radius: 4px;
    border: 2px solid #222222;
  }
  
  .formatted-code pre {
    text-align: left;
    margin: 0;
    white-space: pre-wrap;
    word-wrap: break-word;
  }
  
  .default-text {
    color: #666;
    text-align: center;
    margin-top: 2rem;
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
  </style>