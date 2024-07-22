const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

const makeApiCall = async (mode, model, userInput) => {
  try {
    let response;
    console.log(`Making API call for mode: ${mode}, model: ${model}`);
    switch (mode) {
      case 'Project':
        response = await makeProjectApiCall(model, userInput);
        console.log('Project API call response:', response);
        return response;
      case 'Chat':
        response = await makeChatApiCall(model, userInput);
        console.log('Chat API call response:', response);
        return {
          content: response.content || response.conversation,
          usage: response.usage
        };
      case 'Code':
        response = await makeCodeApiCall(model, userInput);
        console.log('Code API call response:', response);
        return {
          content: response.content || response.conversation,
          codeScripts: response.codeScripts,
          usage: response.usage
        };
      case 'File':
        response = await makeFileApiCall(model, userInput);
        console.log('File API call response:', response);
        return {
          filename: response.filename,
          usage: response.usage
        };
      default:
        throw new Error(`Invalid mode: ${mode}`);
    }
  } catch (error) {
    console.error(`Error making API call for ${mode} mode:`, error);
    console.error('Error details:', error.response ? error.response.data : 'No response data');
    throw error;
  }
};

const makeFileApiCall = async (model, userInput) => {
  console.log('Making file API call with model:', model);
  const endpoint = `${API_URL}/file`;
  const response = await axios.post(endpoint, { ...userInput, model });
  console.log('File API response:', response.data);
  return response.data;
};

const makeCodeApiCall = async (model, userInput) => {
  console.log('Making code API call with model:', model);
  const endpoint = `${API_URL}/code`;
  const response = await axios.post(endpoint, { model, message: userInput });
  console.log('Code API response:', response.data);
  return response.data;
};

const makeProjectApiCall = async (model, userInput) => {
  console.log('Making project API call with model:', model);
  if (model === 'GPT4o') {
    const response = await axios.post(`${API_URL}/openai`, {
      model: "gpt-4o",
      messages: [
        {"role": "system", "content": "The chatbot should respond in a friendly manner."},
        {"role": "user", "content": userInput}
      ]
    });
    console.log('GPT4o response:', response.data);
    return {
      content: response.data.choices[0].message.content,
      usage: response.data.usage,
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
    console.log('Claude response:', response.data);
    return {
      conversation: response.data.conversation,
      codeScripts: response.data.codeScripts,
      usage: response.data.usage,
      role: 'assistant'
    };
  }
  throw new Error(`Unsupported model for project mode: ${model}`);
};

const makeChatApiCall = async (model, userInput) => {
  const endpoint = model === 'GPT4o' ? `${API_URL}/openai` : `${API_URL}/anthropic`;
  const systemMessage = "You are a helpful assistant engaging in general conversation.";
  
  const payload = model === 'GPT4o' ? {
    model: "gpt-4o",
    messages: [
      {"role": "system", "content": systemMessage},
      {"role": "user", "content": userInput}
    ]
  } : {
    system: systemMessage,
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
  };

  const response = await axios.post(endpoint, payload);

  if (model === 'GPT4o') {
    return {
      content: response.data.choices[0].message.content,
      usage: response.data.usage
    };
  } else {
    return {
      conversation: response.data.conversation,
      usage: response.data.usage
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
    return response.data;  // This should already include the usage information
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
    return response.data;  // This should already include the usage information
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