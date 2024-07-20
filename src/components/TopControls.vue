<template>
    <div class="top-controls">
      <transition name="fade">
        <div v-if="selectedMode === 'Project'" class="update-container">
          <span v-if="lastUpdateTime && !isUpdating" class="last-update-time">
            Last updated: {{ lastUpdateTime }}
          </span>
          <div v-if="isUpdating" class="spinner"></div>
          <button 
            @click="$emit('handleUpdate')" 
            :disabled="!updateEnabled || isUpdating"
            class="update-button"
          >
            {{ isUpdating ? 'Updating...' : 'Update' }}
          </button>
        </div>
      </transition>
    </div>
  </template>
  
  <script setup>
  defineProps(['selectedMode', 'lastUpdateTime', 'isUpdating', 'updateEnabled']);
  defineEmits(['handleUpdate']);
  </script>
  
  <style scoped>
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
  
  .update-button {
    padding: 0.5rem;
    border-radius: 20px;
    background-color: #8e44ad;
    color: white;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    min-width: 100px;
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
  
  /* Fade transition styles */
  .fade-enter-active, .fade-leave-active {
    transition: opacity 0.5s ease;
  }
  
  .fade-enter-from, .fade-leave-to {
    opacity: 0;
  }
  </style>