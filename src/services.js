import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

export const makeApiCall = async (model, userInput) => {
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
        system: "Respond with an explanation and python code. For each new Python function, start with SCRIPT_X on a new line (where X is the script number), followed by the function in a Python code block. Only resond with what the user explicitly asks for",
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

export const getDatabaseContents = async () => {
    try {
      const response = await axios.get(`${API_URL}/database-contents`);
      return response.data;
    } catch (error) {
      console.error('Error fetching database contents:', error);
      throw error;
    }
  };

  export const selectRelevantFilesAndFunctions = async (query, databaseContents) => {
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

  export const analyzeAndModifyCode = async (query, selectedFiles, databaseContents) => {
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

export const startProcess = async (directoryInfo) => {
    try {
      console.log('Starting process with directory info:', directoryInfo);
      const response = await axios.post(`${API_URL}/start-process`, directoryInfo);
      
      console.log('Server response:', response.data);
      
      if (response.status === 200) {
        console.log('Process started successfully');
        return {
          status: 'success',
          message: response.data.message
        };
      } else {
        console.error('Unexpected response status:', response.status);
        return {
          status: 'error',
          message: 'Unexpected response from server'
        };
      }
    } catch (error) {
      console.error('Error starting process:', error);
      return {
        status: 'error',
        message: error.response?.data?.error || 'An error occurred while starting the process'
      };
    }
  };