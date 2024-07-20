<template>
    <div class="top-row">
      <div class="menu-column">
        <button class="icon-button">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="tabs-column">
        <div class="conversation-tabs" ref="tabsContainer" @mousedown="startDragging" @mousemove="drag" @mouseup="stopDragging" @mouseleave="stopDragging">
          <div 
            v-for="(tab, index) in conversationTabs" 
            :key="index" 
            :class="['tab-button', { 'active-tab': index === activeTabIndex }]"
            @click="selectTab(index)"
          >
            <span v-if="!tab.isEditing" @dblclick="startEditing(index)" class="tab-text">{{ tab.name }}</span>
            <input
              v-else
              v-model="tab.editName"
              @keyup.enter="finishEditing(index)"
              ref="tabNameInput"
              class="tab-input"
            />
            <span class="remove-tab" @click.stop="$emit('removeTab', index)">×</span>
          </div>
          <button @click="$emit('addNewTab')" class="tab-button plus-button">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, nextTick, onMounted, onUnmounted } from 'vue';
  
  const props = defineProps(['conversationTabs', 'activeTabIndex']);
  const emit = defineEmits(['selectTab', 'addNewTab', 'removeTab', 'updateTabName']);
  
  const tabsContainer = ref(null);
  const tabNameInput = ref(null);
  const isDragging = ref(false);
  const startX = ref(0);
  const scrollLeft = ref(0);
  const editingIndex = ref(-1);
  
  const startEditing = (index) => {
    editingIndex.value = index;
    props.conversationTabs[index].isEditing = true;
    props.conversationTabs[index].editName = props.conversationTabs[index].name;
    nextTick(() => {
      if (tabNameInput.value && tabNameInput.value[index]) {
        tabNameInput.value[index].focus();
      }
    });
  };
  
  const finishEditing = (index) => {
    const newName = props.conversationTabs[index].editName.trim();
    if (newName) {
      emit('updateTabName', index, newName);
    }
    props.conversationTabs[index].isEditing = false;
    editingIndex.value = -1;
  };
  
  const selectTab = (index) => {
    if (!props.conversationTabs[index].isEditing) {
      emit('selectTab', index);
    }
  };
  
  const handleGlobalClick = (event) => {
    if (editingIndex.value !== -1) {
      const isClickInsideInput = event.target.closest('.tab-input');
      if (!isClickInsideInput) {
        finishEditing(editingIndex.value);
      }
    }
  };
  
  onMounted(() => {
    document.addEventListener('click', handleGlobalClick);
  });
  
  onUnmounted(() => {
    document.removeEventListener('click', handleGlobalClick);
  });
  
  const startDragging = (e) => {
    isDragging.value = true;
    startX.value = e.pageX - tabsContainer.value.offsetLeft;
    scrollLeft.value = tabsContainer.value.scrollLeft;
  };
  
  const stopDragging = () => {
    isDragging.value = false;
  };
  
  const drag = (e) => {
    if (!isDragging.value) return;
    e.preventDefault();
    const x = e.pageX - tabsContainer.value.offsetLeft;
    const walk = (x - startX.value) * 2;
    tabsContainer.value.scrollLeft = scrollLeft.value - walk;
  };
  </script>
  
  <style scoped>
  .top-row {
    display: flex;
    margin-bottom: 1rem;
  }
  
  .menu-column {
    width: 8%;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  
  .tabs-column {
    width: 92%;
  }
  
  .conversation-tabs {
    display: flex;
    gap: 0.5rem;
    overflow-x: auto;
    padding-bottom: 0.5rem;
    cursor: grab;
    scrollbar-width: thin;
    scrollbar-color: #444444 #222222;
  }
  
  .conversation-tabs::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  
  .conversation-tabs::-webkit-scrollbar-track {
    background: #222222;
  }
  
  .conversation-tabs::-webkit-scrollbar-thumb {
    background-color: #444444;
    border-radius: 4px;
    border: 2px solid #222222;
  }
  
  .conversation-tabs:active {
    cursor: grabbing;
  }
  
  .tab-button {
    padding: 0.5rem 1rem;
    border-radius: 20px;
    background-color: #333333;
    color: #cccccc;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    white-space: nowrap;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 36px;
    min-width: 150px;
  }

  .active-tab {
    background-color: #444444;
  }

  .tab-text {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding-right: 20px;
  }

  .tab-input {
    flex: 1;
    background-color: #444444;
    color: #ffffff;
    border: none;
    border-radius: 10px;
    font-size: 1rem;
    padding: 0.25rem 0.5rem;
    margin-right: 20px;
    outline: none;
  }

  .remove-tab {
    color: red;
    font-size: 1.2rem;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .tab-button:hover .remove-tab {
    opacity: 1;
  }

  .plus-button {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.25rem;
    width: 28px;
    height: 28px;
    min-width: 28px;
  }

  .plus-button svg {
    width: 16px;
    height: 16px;
  }
  
  .icon-button {
    background: none;
    border: none;
    cursor: pointer;
    color: #cccccc;
  }
  </style>