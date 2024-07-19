import { createStore } from 'vuex'

export default createStore({
  state: {
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCost: 0
  },
  getters: {
    getTotalTokens: (state) => {
      console.log('getTotalTokens called', state.totalInputTokens, state.totalOutputTokens);
      return state.totalInputTokens + state.totalOutputTokens;
    },
    getFormattedCost: (state) => {
      console.log('getFormattedCost called', state.totalCost);
      return `$${state.totalCost.toFixed(4)}`;
    }
  },
  mutations: {
    UPDATE_TOKENS(state, { inputTokens, outputTokens }) {
      console.log('UPDATE_TOKENS mutation called', inputTokens, outputTokens);
      state.totalInputTokens += inputTokens;
      state.totalOutputTokens += outputTokens;
    },
    UPDATE_COST(state, cost) {
      console.log('UPDATE_COST mutation called', cost);
      state.totalCost = cost;
    }
  },
  actions: {
    updateTokensAndCost({ commit, state }, { inputTokens, outputTokens }) {
      console.log('updateTokensAndCost action called', inputTokens, outputTokens);
      commit('UPDATE_TOKENS', { inputTokens, outputTokens });
      
      const inputCost = (state.totalInputTokens / 1000000) * 3;
      const outputCost = (state.totalOutputTokens / 1000000) * 15;
      const totalCost = inputCost + outputCost;
      
      commit('UPDATE_COST', totalCost);
    }
  },
  modules: {
  }
})