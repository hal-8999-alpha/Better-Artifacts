import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

export const makeApiCall = async (model, userInput) => {
  try {
    if (model === 'GPT4o') {
      const response = await axios.post(`${API_URL}/openai`, {
        model: "gpt-3.5-turbo",
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