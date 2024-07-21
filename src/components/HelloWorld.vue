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
                :disabled="!selectedDirectory || isUpdating"
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
            <div v-if="selectedMode === 'Project'" class="directory-selection">
              <button @click="openDirectoryDialog" class="file-button">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                </svg>
              </button>
              <span v-if="selectedDirectory" class="selected-directory" @click="toggleDatabaseViewer">
                {{ selectedDirectoryName }}
              </span>
            </div>
          </transition>
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
  v-if="!showDatabaseViewer"
  :codeScripts="codeScripts" 
  :activeTab="activeTab"
  @setActiveTab="setActiveTab"
  @copyCode="copyCode"
/>
      <transition name="modal">
      <div v-if="showDatabaseViewer" class="modal-overlay">
        <div class="modal-content">
          <button @click="toggleDatabaseViewer" class="close-button">&times;</button>
          <DatabaseViewer />
        </div>
      </div>
    </transition>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useStore } from 'vuex';
import { makeApiCall, startProcess, getDatabaseContents, selectRelevantFilesAndFunctions, analyzeAndModifyCode } from '../services';
import ConversationTabs from './ConversationTabs.vue';
import Conversation from './Conversation.vue';
import UserInput from './UserInput.vue';
import CodeDisplay from './CodeDisplay.vue';
import DatabaseViewer from './DatabaseViewer.vue';
import { readFileAsText } from '../utils/fileUtils';

const store = useStore();

const codeScripts = ref([]);
const activeTab = ref(0);
const models = ['Claude', 'GPT4o'];
const selectedModel = ref('Claude');
const modes = ['Code', 'Chat', 'Project'];
const selectedMode = ref('Code');
const selectedDirectory = ref(null);
const selectedDirectoryName = ref('');
const isUpdating = ref(false);
const lastUpdateTime = ref('');
const showDatabaseViewer = ref(false);


const conversationTabs = ref([
  { name: 'Conversation 1', conversation: [] }
]);
const activeTabIndex = ref(0);

const activeConversation = computed(() => conversationTabs.value[activeTabIndex.value].conversation);

const databaseContents = ref(null);
const analysisResult = ref(null);

const handleModelChange = () => {
  console.log(`Model changed to: ${selectedModel.value}`);
};

const handleModeChange = () => {
  console.log(`Mode changed to: ${selectedMode.value}`);
};

const openDirectoryDialog = async () => {
  try {
    if ('showDirectoryPicker' in window) {
      const directoryHandle = await window.showDirectoryPicker();
      selectedDirectory.value = directoryHandle;
      selectedDirectoryName.value = directoryHandle.name;
      
      // Get all files in the directory and subdirectories
      const files = await getFilesRecursively(directoryHandle);
      
      console.log('Selected files:', files);
      
      selectedDirectory.value = { 
        name: directoryHandle.name, 
        handle: directoryHandle,
        files: files 
      };
    } else {
      alert("Your browser doesn't support directory selection. Please use a modern browser.");
    }
  } catch (error) {
    console.error('Error selecting directory:', error);
    selectedDirectory.value = null;
    selectedDirectoryName.value = '';
  }
};

const getFilesRecursively = async (directoryHandle, path = '') => {
  const files = [];
  for await (const entry of directoryHandle.values()) {
    const entryPath = path ? `${path}/${entry.name}` : entry.name;
    if (entry.kind === 'file') {
      files.push({
        handle: entry,
        path: entryPath
      });
    } else if (entry.kind === 'directory') {
      files.push(...await getFilesRecursively(entry, entryPath));
    }
  }
  return files;
};

const handleUpdate = async () => {
  if (!selectedDirectory.value) {
    console.error('No directory selected');
    return;
  }

  console.log('Update button clicked');
  isUpdating.value = true;
  
  try {
    const formData = new FormData();
    formData.append('rootDirectory', selectedDirectory.value.name);

    // Read the current content of each file
    for (const fileInfo of selectedDirectory.value.files) {
      try {
        console.log(`Reading file: ${fileInfo.path}`);
        const file = await fileInfo.handle.getFile();
        const currentContent = await file.text();
        console.log(`File content read successfully for: ${fileInfo.path}`);
        const blob = new Blob([currentContent], { type: 'text/plain' });
        formData.append('files', blob, fileInfo.path);
        formData.append('filePaths', fileInfo.path);
      } catch (readError) {
        console.error(`Error reading file ${fileInfo.path}:`, readError);
        throw new Error(`Failed to read file ${fileInfo.path}`);
      }
    }

    console.log('Sending files:', selectedDirectory.value.files.map(f => f.path));

    const result = await startProcess(formData);
    if (result.success) {
      console.log(result.message);
      lastUpdateTime.value = formatDate(new Date());
      await fetchDatabaseContents();
    } else {
      console.error(result.message);
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('Error during update:', error);
    // You might want to show this error to the user in the UI
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

const fetchDatabaseContents = async () => {
  try {
    console.log('Fetching database contents...');
    databaseContents.value = await getDatabaseContents();
    console.log('Fetched database contents:', databaseContents.value);
    
    if (!databaseContents.value || Object.keys(databaseContents.value.files).length === 0) {
      console.warn('Database contents are empty after fetching.');
    }
  } catch (error) {
    console.error('Error fetching database contents:', error);
    throw new Error('Failed to fetch database contents. Please try uploading files again.');
  }
};

const handleSend = async (message) => {
  if (!message.trim()) return;

  const currentConversation = conversationTabs.value[activeTabIndex.value].conversation;
  currentConversation.push({ role: 'user', content: message });
  
  try {
    // Attempt to fetch database contents if they're not available
    if (!databaseContents.value || Object.keys(databaseContents.value.files).length === 0) {
      console.log('Database contents not available, attempting to fetch...');
      await fetchDatabaseContents();
      
      // Check again if database contents are available
      if (!databaseContents.value || Object.keys(databaseContents.value.files).length === 0) {
        throw new Error('Database contents are empty. Please ensure files are uploaded and processed correctly.');
      }
    }

    console.log('Database contents:', databaseContents.value);

    // First stage: Select relevant files and functions
    const relevantFiles = await selectRelevantFilesAndFunctions(message, databaseContents.value);
    console.log('Relevant files:', relevantFiles);

    // Second stage: Analyze and modify code
    const result = await analyzeAndModifyCode(message, relevantFiles.relevantFiles, databaseContents.value);
    analysisResult.value = result;

    // Format the response
    const formattedResponse = `
Analysis complete. Here's a summary of the changes:

Explanation:
${result.explanation}

Modifications:
${result.modifications.map(mod => `
File: ${mod.fileName.split('\\').pop()}
Changes: ${mod.changes}
`).join('\n')}

To see the updated code, please check the code display panel.
    `.trim();

    // Update the conversation with the formatted results
    currentConversation.push({ 
      role: 'assistant', 
      content: formattedResponse
    });

    // Update code scripts with modified content
    codeScripts.value = result.modifications.flatMap(mod => 
      mod.scripts.map(script => {
        // Check if content is an array, if so, join it
        let contentStr = Array.isArray(script.content) ? script.content.join('\n') : script.content;
        // Remove 'SCRIPT_X' and 'python' lines
        contentStr = contentStr.replace(/^SCRIPT_\d+\n/, '').replace(/^python\n/, '');
        return contentStr.trim();
      })
    );
    activeTab.value = 0;

    console.log('Updated codeScripts:', codeScripts.value);

  } catch (error) {
    console.error('Error processing query:', error);
    currentConversation.push({ 
      role: 'assistant', 
      content: `An error occurred while processing your request: ${error.message}. Please ensure that files are uploaded and processed correctly before querying.`
    });
  }
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

const toggleDatabaseViewer = () => {
  showDatabaseViewer.value = !showDatabaseViewer.value;
};

onMounted(async () => {
  await fetchDatabaseContents();
});
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
  height: 36px;
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

.directory-selection {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.selected-directory {
  font-size: 0.9rem;
  color: #cccccc;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  transition: color 0.3s ease;
}

.selected-directory:hover {
  color: #ffffff;
  text-decoration: underline;
}

/* Fade transition styles */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

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
  height: 90%;
  overflow-y: auto;
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

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

</style>