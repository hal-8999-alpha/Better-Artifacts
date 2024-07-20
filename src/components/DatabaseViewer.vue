<template>
    <div class="database-viewer">
      <h1 class="title">Database Contents</h1>
      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        Loading...
      </div>
      <div v-else-if="error" class="error">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        Error: {{ error }}
      </div>
      <div v-else-if="contents" class="content">
        <div class="control-flow-tree">
          <h2>Control Flow Tree</h2>
          <div class="tree-container">
            <ul>
              <li v-for="(fileData, fileName) in processedTreeData" :key="fileName">
                {{ fileName }}
                <ul v-if="fileData.children && fileData.children.length">
                  <li v-for="func in fileData.children" :key="func.name">
                    {{ func.name }}
                    <ul v-if="func.children && func.children.length">
                      <li v-for="call in func.children" :key="call.name">
                        {{ call.name }}
                      </li>
                    </ul>
                  </li>
                </ul>
              </li>
            </ul>
          </div>
        </div>
        <div v-for="(fileData, fileName) in contents.files" :key="fileName" class="card" :class="{ 'expanded': expandedCards[fileName] }" @click="toggleCard(fileName)">
          <div class="card-header">
            <h2 class="file-name">{{ fileData.file_name }}</h2>
            <span class="expand-icon">{{ expandedCards[fileName] ? '▲' : '▼' }}</span>
          </div>
          <div class="file-details">
            <div class="detail">
              <span class="label">File Summary:</span>
              <span>{{ fileData.file_summary }}</span>
            </div>
            <template v-if="expandedCards[fileName]">
              <div class="detail">
                <span class="label">Functions:</span>
                <ul v-if="fileData.functions && fileData.functions.length">
                  <li v-for="(func, index) in fileData.functions" :key="index" class="function-item">
                    <strong>{{ func.function_name }}</strong>
                    <p>{{ func.summary }}</p>
                    <span class="label">Calls:</span>
                    <ul v-if="func.calls && func.calls.length">
                      <li v-for="(call, callIndex) in func.calls" :key="callIndex">{{ call }}</li>
                    </ul>
                    <span v-else>No calls</span>
                  </li>
                </ul>
                <span v-else>No functions found</span>
              </div>
              <div class="detail">
                <span class="label">Imports:</span>
                <ul v-if="fileData.imports && fileData.imports.length">
                  <li v-for="(importItem, index) in fileData.imports" :key="index">{{ importItem }}</li>
                </ul>
                <span v-else>No imports found</span>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  import { ref, reactive, onMounted, computed } from 'vue';
  import { getDatabaseContents } from '../services';
  
  export default {
    setup() {
      const contents = ref(null);
      const loading = ref(true);
      const error = ref(null);
      const expandedCards = reactive({});
  
      const toggleCard = (key) => {
        expandedCards[key] = !expandedCards[key];
      };
  
      const processedTreeData = computed(() => {
        if (!contents.value || !contents.value.functionCallTree) return {};
  
        const treeData = {};
        for (const [fileName, fileData] of Object.entries(contents.value.functionCallTree)) {
          treeData[fileName] = {
            name: fileName,
            children: Object.entries(fileData).map(([funcName, calls]) => ({
              name: funcName,
              children: calls.map(call => ({ name: call }))
            }))
          };
        }
        return treeData;
      });
  
      onMounted(async () => {
        try {
          contents.value = await getDatabaseContents();
          console.log('Raw Database Contents:', JSON.stringify(contents.value, null, 2));
          
          for (const key in contents.value.files) {
            expandedCards[key] = false;
          }
        } catch (e) {
          error.value = e.message;
        } finally {
          loading.value = false;
        }
      });
  
      return {
        contents,
        loading,
        error,
        expandedCards,
        toggleCard,
        processedTreeData
      };
    }
  };
  </script>
  
  <style scoped>
  .database-viewer {
    background-color: #1e1e1e;
    color: #d4d4d4;
    padding: 2rem;
    font-family: 'Arial', sans-serif;
    text-align: left;
  }
  
  .title {
    color: #61dafb;
    margin-bottom: 2rem;
    text-align: left;
  }
  
  .loading, .error {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    height: 200px;
    font-size: 1.2rem;
  }
  
  .spinner {
    border: 4px solid rgba(255, 255, 255, 0.1);
    border-left-color: #61dafb;
    border-radius: 50%;
    width: 30px;
    height: 30px;
    animation: spin 1s linear infinite;
    margin-right: 10px;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .error {
    color: #ff6b6b;
  }
  
  .error svg {
    margin-right: 10px;
  }
  
  .content {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }
  
  .control-flow-tree {
    background-color: #2d2d2d;
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 2rem;
  }
  
  .tree-container {
    width: 100%;
    height: 600px;
    overflow: auto;
  }
  
  .card {
    background-color: #2d2d2d;
    border-radius: 8px;
    padding: 1.5rem;
    cursor: pointer;
    transition: all 0.3s ease;
  }
  
  .card:hover {
    background-color: #3d3d3d;
  }
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .expand-icon {
    font-size: 1.2em;
    color: #61dafb;
  }
  
  .file-name {
    color: #4ec9b0;
    margin-bottom: 1rem;
    font-size: 1.5em;
    text-align: left;
  }
  
  .file-details {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    align-items: flex-start;
  }
  
  .detail {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    align-items: flex-start;
    width: 100%;
  }
  
  .label {
    color: #569cd6;
    font-weight: bold;
    text-align: left;
  }
  
  span, p {
    word-break: break-word;
    text-align: left;
    white-space: pre-wrap;
    width: 100%;
    margin: 0;
  }
  
  ul {
    list-style-type: disc;
    padding-left: 1.5rem;
    margin: 0.5rem 0;
    width: 100%;
  }
  
  li {
    margin-bottom: 0.25rem;
  }
  
  .function-item {
    margin-bottom: 1rem;
  }
  
  .function-item > ul {
    list-style-type: circle;
  }
  
  strong {
    color: #ce9178;
  }
  
  .card:not(.expanded) .file-details > *:not(:nth-child(-n+2)) {
    display: none;
  }
  
  /* Styles for the control flow tree */
  .link {
    fill: none;
    stroke: #555;
    stroke-opacity: 0.4;
    stroke-width: 1.5px;
  }
  
  .node circle {
    fill: #fff;
    stroke: #4ec9b0;
    stroke-width: 1.5px;
  }
  
  .node text {
    font: 10px sans-serif;
    fill: #d4d4d4;
  }
  
  .node--internal text {
    text-shadow: 0 1px 0 #000, 0 -1px 0 #000, 1px 0 0 #000, -1px 0 0 #000;
  }

  .tree-container {
  background-color: #2d2d2d;
  padding: 1rem;
  border-radius: 8px;
  max-height: 400px;
  overflow-y: auto;
}

.tree-container ul {
  list-style-type: none;
  padding-left: 20px;
}

.tree-container li {
  margin-bottom: 5px;
}

.tree-container > ul {
  padding-left: 0;
}
  </style>