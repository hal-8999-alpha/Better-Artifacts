require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
const codebaseManager = require('./codebaseManager');
const customGPT = require('./customGPT');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const BASE_PORT = process.env.PORT || 3000;

const anthropic = new Anthropic({
  apiKey: process.env.VUE_APP_ANTHROPIC_API_KEY,
});

app.post('/api/openai', async (req, res) => {
  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', req.body, {
      headers: {
        'Authorization': `Bearer ${process.env.VUE_APP_OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('OpenAI API Error:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: error.response ? error.response.data : error.message });
  }
});

app.get('/api/database-contents', async (req, res) => {
  try {
    const contents = await codebaseManager.getDatabaseContents();
    res.json(contents);
  } catch (error) {
    console.error('Error fetching database contents:', error);
    res.status(500).json({ error: 'Failed to fetch database contents' });
  }
});

app.get('/api/function-call-tree', async (req, res) => {
  try {
    const contents = await codebaseManager.getDatabaseContents();
    res.json(contents.functionCallTree);
  } catch (error) {
    console.error('Error fetching function call tree:', error);
    res.status(500).json({ error: 'Failed to fetch function call tree' });
  }
});

app.post('/api/anthropic', async (req, res) => {
  try {
    const msg = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 1024,
      messages: [{ role: "user", content: req.body.messages[0].content[0].text }],
      system: req.body.system
    });

    const fullResponse = msg.content[0].text;
    
    // Parse the response to separate conversation and code
    const scriptRegex = /SCRIPT_\d+\n```python\n([\s\S]*?)```/g;
    const scripts = [];
    let match;
    let conversationText = fullResponse;

    while ((match = scriptRegex.exec(fullResponse)) !== null) {
      scripts.push(match[1].trim());
      conversationText = conversationText.replace(match[0], `[Script ${scripts.length}]`);
    }

    // Remove any remaining ``` markers and trim the conversation text
    conversationText = conversationText.replace(/```/g, '').trim();

    console.log(msg.usage)

    res.json({
      conversation: conversationText,
      codeScripts: scripts,
      usage: msg.usage
    });
  } catch (error) {
    console.error('Anthropic API Error:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: error.response ? error.response.data : error.message });
  }
});

app.post('/api/start-process', async (req, res) => {
  console.log('Received start-process request');
  try {
    const { name, files } = req.body;
    console.log('Received directory name:', name);
    console.log('Received files:', files);
    console.log('Current working directory:', process.cwd());
    
    if (!name || !files) {
      console.error('Directory information is missing');
      return res.status(400).json({ error: 'Directory information is required' });
    }
    
    const result = await codebaseManager.startProcess(name, files);
    console.log('Process result:', result);
    
    res.status(200).json({ 
      message: result ? 'Process completed successfully' : 'Process failed',
      success: result
    });
  } catch (error) {
    console.error('Process Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/select-files', async (req, res) => {
  try {
    const { query, databaseContents } = req.body;
    const result = await customGPT.selectRelevantFiles(query, databaseContents);
    res.json(result);
  } catch (error) {
    console.error('Error in file selection:', error);
    res.status(500).json({ error: 'Error in file selection process' });
  }
});

app.post('/api/analyze-modify', async (req, res) => {
  try {
    const { query, selectedFiles, databaseContents } = req.body;
    const relevantFilesContent = selectedFiles.map(file => {
      const fileData = databaseContents.files[file.fileName];
      return {
        fileName: file.fileName,
        content: fileData.content,
        summary: fileData.file_summary,
        functions: fileData.functions.filter(f => file.relevantFunctions.includes(f.function_name))
      };
    });

    const prompt = `Given the following relevant files and their contents:
${JSON.stringify(relevantFilesContent, null, 2)}

And the user query: "${query}"

Please analyze the code and provide:
1. An explanation of how the code relates to the query
2. Any suggested modifications to address the query
3. The updated code for each file that needs changes

Pay special attention to the functions identified as relevant.

Do not change anything that exists in the code currently unless it needs to be corrected in order to solve the user query.

Return your response as a JSON object with the following structure:
{
  "explanation": "Your explanation here",
  "modifications": [
    {
      "fileName": "example.py",
      "updatedContent": "The full updated content of the file",
      "changes": "A description of the changes made"
    }
  ]
}`;

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }]
    });

    const result = JSON.parse(response.content[0].text);
    res.json(result);
  } catch (error) {
    console.error('Error in code analysis and modification:', error);
    res.status(500).json({ error: 'Error in code analysis and modification process' });
  }
});

function startServer(port) {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log('Environment variables:');
    console.log('OPENAI_API_KEY:', process.env.VUE_APP_OPENAI_API_KEY ? 'Set' : 'Not set');
    console.log('ANTHROPIC_API_KEY:', process.env.VUE_APP_ANTHROPIC_API_KEY ? 'Set' : 'Not set');
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} is busy, trying with port ${port + 1}`);
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
    }
  });
}

startServer(BASE_PORT);