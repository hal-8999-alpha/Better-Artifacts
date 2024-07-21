const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

const makeApiCall = async (model, userInput) => {
  try {
    if (model === 'GPT4o') {
      const response = await axios.post(`${API_URL}/openai`, {
        model: "gpt-4o",
        messages: [
          {"role": "system", "content": "The chatbot should respond in a friendly manner."},
          {"role": "user", "content": userInput}
        ]
      });
      return {
        content: response.data.choices[0].message.content,
        role: 'assistant'
      };
    } else if (model === 'Claude') {
      const response = await axios.post(`${API_URL}/anthropic`, {
        system: "Respond with an explanation and python code. For each new Python function, start with SCRIPT_X on a new line (where X is the script number), followed by the function in a Python code block. Only respond with what the user explicitly asks for",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: userInput
              }
            ]
          }
        ]
      });
      return {
        conversation: response.data.conversation,
        codeScripts: response.data.codeScripts,
        usage: response.data.usage,
        role: 'assistant'
      };
    }
  } catch (error) {
    console.error('Error making API call:', error);
    return {
      content: 'An error occurred while processing your request.',
      role: 'assistant'
    };
  }
};

const startProcess = async (formData) => {
  try {
    const response = await axios.post(`${API_URL}/start-process`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error starting process:', error);
    throw error;
  }
};

const getDatabaseContents = async () => {
  try {
    const response = await axios.get(`${API_URL}/database-contents`);
    return response.data;
  } catch (error) {
    console.error('Error fetching database contents:', error);
    throw error;
  }
};

const selectRelevantFilesAndFunctions = async (query, databaseContents) => {
  try {
    const response = await axios.post(`${API_URL}/select-files`, {
      query,
      databaseContents
    });
    return response.data;
  } catch (error) {
    console.error('Error selecting relevant files and functions:', error);
    throw error;
  }
};

const analyzeAndModifyCode = async (query, selectedFiles, databaseContents) => {
  try {
    const response = await axios.post(`${API_URL}/analyze-modify`, {
      query,
      selectedFiles,
      databaseContents
    });
    return response.data;
  } catch (error) {
    console.error('Error analyzing and modifying code:', error);
    throw error;
  }
};

const saveApiKeys = async (keys) => {
  try {
    const response = await axios.post(`${API_URL}/save-api-keys`, keys);
    return response.data;
  } catch (error) {
    console.error('Error saving API keys:', error);
    throw error;
  }
};

const getApiKeys = async () => {
  try {
    const response = await axios.get(`${API_URL}/get-api-keys`);
    return response.data;
  } catch (error) {
    console.error('Error getting API keys:', error);
    throw error;
  }
};

module.exports = {
  makeApiCall,
  startProcess,
  getDatabaseContents,
  selectRelevantFilesAndFunctions,
  analyzeAndModifyCode,
  saveApiKeys,
  getApiKeys
};