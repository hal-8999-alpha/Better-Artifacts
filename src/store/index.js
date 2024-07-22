import { createStore } from 'vuex'

export default createStore({
  state: {
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalAssistantInputTokens: 0,
    totalAssistantOutputTokens: 0,
    totalCost: 0,
    selectedFiles: [],
    selectedMode: 'Code'
  },
  getters: {
    getTotalTokens: (state) => {
      console.log('getTotalTokens called', {
        inputTokens: state.totalInputTokens,
        outputTokens: state.totalOutputTokens,
        assistantInputTokens: state.totalAssistantInputTokens,
        assistantOutputTokens: state.totalAssistantOutputTokens
      });
      return state.totalInputTokens + state.totalOutputTokens + 
             state.totalAssistantInputTokens + state.totalAssistantOutputTokens;
    },
    getFormattedCost: (state) => {
      console.log('getFormattedCost called', state.totalCost);
      return `$${state.totalCost.toFixed(4)}`;
    },
    getSelectedFiles: (state) => {
      return state.selectedFiles;
    },
    getSelectedMode: (state) => {
      return state.selectedMode;
    }
  },
  mutations: {
    UPDATE_TOKENS(state, { inputTokens, outputTokens }) {
      console.log('UPDATE_TOKENS mutation called', inputTokens, outputTokens);
      state.totalInputTokens += inputTokens;
      state.totalOutputTokens += outputTokens;
    },
    UPDATE_ASSISTANT_TOKENS(state, { inputTokens, outputTokens }) {
      console.log('UPDATE_ASSISTANT_TOKENS mutation called', inputTokens, outputTokens);
      state.totalAssistantInputTokens += inputTokens;
      state.totalAssistantOutputTokens += outputTokens;
    },
    UPDATE_COST(state, cost) {
      console.log('UPDATE_COST mutation called', cost);
      state.totalCost = cost;
    },
    SET_SELECTED_FILES(state, files) {
      state.selectedFiles = files;
    },
    SET_SELECTED_MODE(state, mode) {
      state.selectedMode = mode;
    },
    RESET_TOKENS(state) {
      console.log('RESET_TOKENS mutation called');
      state.totalInputTokens = 0;
      state.totalOutputTokens = 0;
      state.totalAssistantInputTokens = 0;
      state.totalAssistantOutputTokens = 0;
      state.totalCost = 0;
    }
  },
  actions: {
    updateTokensAndCost({ commit, state }, { usage, isAssistantAPI }) {
      console.log('updateTokensAndCost action called', { usage, isAssistantAPI });
      
      if (isAssistantAPI) {
        commit('UPDATE_ASSISTANT_TOKENS', { 
          inputTokens: usage.prompt_tokens, 
          outputTokens: usage.completion_tokens 
        });
      } else {
        commit('UPDATE_TOKENS', { 
          inputTokens: usage.prompt_tokens, 
          outputTokens: usage.completion_tokens 
        });
      }
      
      const claudeInputCost = (state.totalInputTokens / 1000) * 0.015;
      const claudeOutputCost = (state.totalOutputTokens / 1000) * 0.075;
      const assistantInputCost = (state.totalAssistantInputTokens / 1000000) * 0.150;
      const assistantOutputCost = (state.totalAssistantOutputTokens / 1000000) * 0.600;
      
      const totalCost = claudeInputCost + claudeOutputCost + assistantInputCost + assistantOutputCost;
      
      commit('UPDATE_COST', totalCost);

      console.log('Updated token counts:', {
        claudeInput: state.totalInputTokens,
        claudeOutput: state.totalOutputTokens,
        assistantInput: state.totalAssistantInputTokens,
        assistantOutput: state.totalAssistantOutputTokens
      });
      console.log('Updated total cost:', totalCost);
    },
    setSelectedFiles({ commit }, files) {
      commit('SET_SELECTED_FILES', files);
    },
    setSelectedMode({ commit }, mode) {
      commit('SET_SELECTED_MODE', mode);
    },
    resetTokens({ commit }) {
      commit('RESET_TOKENS');
    }
  },
  modules: {
  }
})