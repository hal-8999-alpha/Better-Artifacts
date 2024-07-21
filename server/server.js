require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
const codebaseManager = require('./codebaseManager');
const customGPT = require('./customGPT');
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');
const { makeApiCall } = require('../src/services');

const app = express();
app.use(cors());
app.use(express.json());

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
      cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
    }
});

const upload = multer({ dest: 'uploads/' });

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

app.post('/api/start-process', upload.array('files'), async (req, res) => {
    console.log('Received start-process request');
    try {
        if (!req.files || req.files.length === 0) {
            console.error('No files were uploaded');
            return res.status(400).json({ error: 'No files were uploaded' });
        }

        const rootDirectory = req.body.rootDirectory;
        const projectRoot = path.join(process.cwd(), 'projects', rootDirectory);

        // Ensure the project root directory exists
        await fs.mkdir(projectRoot, { recursive: true });

        // Get the file paths from the request body
        const filePaths = req.body.filePaths;
        if (!Array.isArray(filePaths)) {
            filePaths = [filePaths];
        }

        // First, create all necessary directories
        for (const filePath of filePaths) {
            const absolutePath = path.join(projectRoot, filePath);
            await fs.mkdir(path.dirname(absolutePath), { recursive: true });
        }

        // Now, move all files
        const files = await Promise.all(req.files.map(async (file, index) => {
            const relativePath = filePaths[index];
            const absolutePath = path.join(projectRoot, relativePath);
            
            // Move the file to its correct location
            await fs.rename(file.path, absolutePath);

            console.log(`File moved to: ${absolutePath}`);

            return { relativePath, absolutePath };
        }));

        console.log('Files processed:', files);

        const result = await codebaseManager.startProcess(files, projectRoot);
        console.log('Process result:', result);
        
        res.status(200).json({ 
            message: result ? 'Process completed successfully' : 'Process failed',
            success: result
        });
    } catch (error) {
        console.error('Process Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/select-files', async (req, res) => {
  try {
    const { query, databaseContents } = req.body;
    const result = await customGPT.selectRelevantFiles(query, databaseContents);
    
    if (!result.relevantFiles || result.relevantFiles.length === 0) {
      return res.status(400).json({ error: 'No relevant files found for the given query.' });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error in file selection:', error);
    res.status(500).json({ error: 'Error in file selection process' });
  }
});

app.post('/api/analyze-modify', async (req, res) => {
    try {
      console.log('Received request for analyze-modify');
      const { query, selectedFiles, databaseContents } = req.body;
      
      if (!query || !selectedFiles || !databaseContents) {
        console.error('Missing required fields in request body');
        return res.status(400).json({ error: 'Missing required fields in request body' });
      }
    
      console.log('Query:', query);
      console.log('Selected Files:', JSON.stringify(selectedFiles, null, 2));
      console.log('Database Contents Keys:', Object.keys(databaseContents));
    
      console.log('Processing relevant files');
      const relevantFilesContent = selectedFiles.map(file => {
        // Find the matching file in the database contents
        const fileEntry = Object.entries(databaseContents.files).find(([path, data]) => data.file_name === file.fileName);
        
        if (!fileEntry) {
          console.error(`File data not found for ${file.fileName}`);
          return null;
        }
        
        const [filePath, fileData] = fileEntry;
        return {
          fileName: file.fileName,
          filePath: filePath,
          content: fileData.content,
          summary: fileData.file_summary,
          functions: (fileData.functions || []).filter(f => file.relevantFunctions.includes(f.function_name))
        };
      }).filter(Boolean);
    
      if (relevantFilesContent.length === 0) {
        console.error('No relevant file data found');
        return res.status(400).json({ error: 'No relevant file data found' });
      }
    
      console.log('Relevant files content:', JSON.stringify(relevantFilesContent, null, 2));
    
      console.log('Preparing prompt for API call');
      const prompt = `Given the following relevant files and their contents:
  ${relevantFilesContent.map(file => `
  File: ${file.fileName}
  Content:
  ${file.content}
  
  Summary: ${file.summary}
  
  Relevant Functions:
  ${file.functions.map(f => `- ${f.function_name}: ${f.summary}`).join('\n')}
  `).join('\n')}
  
  And the following file structure:
  ${JSON.stringify(databaseContents.fileStructure, null, 2)}
  
  And the user query: "${query}"
  
  Please analyze the code and provide:
  1. An explanation of how the code relates to the query, taking into account the file structure
  2. Any suggested modifications to address the query, ensuring that imports and file paths are correct given the file structure
  3. The updated code for each file that needs changes
  4. Include the entire code including the import statements
  
  Pay special attention to the functions identified as relevant and the file structure when suggesting imports or calls between files.
  
  For each new or modified Python function, start with SCRIPT_X on a new line (where X is the script number), followed by the function in a Python code block. Only respond with what the user explicitly asks for.
  
  Return your response as a JSON object with the following structure:
  {
    "explanation": "Your explanation here",
    "modifications": [
      {
        "fileName": "path/to/example.py",
        "changes": "A description of the changes made",
        "scripts": [
          {
            "name": "function_name",
            "content": "The full content of the function"
          }
        ]
      }
    ]
  }`;
  
      console.log('Full prompt being sent to the analyzing LLM:');
      console.log(prompt);
    
      console.log('Making API call');
      const response = await makeApiCall('Claude', prompt);
      console.log('Received response from API:', JSON.stringify(response, null, 2));
    
      if (!response) {
        console.error('No response received from API');
        return res.status(500).json({ error: 'No response received from API service' });
      }
    
      if (typeof response !== 'object' || !response.conversation) {
        console.error('Unexpected API response structure:', response);
        return res.status(500).json({ error: 'Unexpected response structure from API service' });
      }
    
      let result;
      try {
        result = JSON.parse(response.conversation);
        console.log('Parsed result:', JSON.stringify(result, null, 2));
      } catch (parseError) {
        console.error('Error parsing API response:', parseError);
        return res.status(500).json({ error: 'Invalid response from API service' });
      }
    
      if (!result || !result.explanation || !Array.isArray(result.modifications)) {
        console.error('Unexpected response structure after parsing:', result);
        return res.status(500).json({ error: 'Unexpected response structure from API service' });
      }
    
      console.log('Processing modifications');
      const safeModifications = result.modifications.map(mod => {
        if (!mod) {
          console.error('Encountered null or undefined modification');
          return null;
        }
        return {
          fileName: mod.fileName || 'Unknown File',
          changes: mod.changes || 'No changes described',
          scripts: Array.isArray(mod.scripts) ? mod.scripts.map(script => {
            if (!script) {
              console.error('Encountered null or undefined script');
              return null;
            }
            // Split the content by SCRIPT_X markers
            const scriptParts = script.content.split(/SCRIPT_\d+\n/);
            // Remove any empty strings from the array
            const cleanScripts = scriptParts.filter(part => part.trim() !== '');
            return {
              name: script.name || 'Unnamed Script',
              content: cleanScripts
            };
          }).filter(Boolean) : []
        };
      }).filter(Boolean);
  
      console.log('Final response:', JSON.stringify({
        explanation: result.explanation,
        modifications: safeModifications
      }, null, 2));
  
      console.log('Sending response');
      res.json({
        explanation: result.explanation,
        modifications: safeModifications
      });
    } catch (error) {
      console.error('Error in code analysis and modification:', error);
      res.status(500).json({ error: 'Error in code analysis and modification process' });
    }
  });

  app.post('/api/save-api-keys', async (req, res) => {
    try {
      const { claudeApiKey, openaiApiKey } = req.body;
  
      if (!claudeApiKey && !openaiApiKey) {
        return res.status(400).json({ error: 'At least one API key must be provided' });
      }
  
      const envPath = path.resolve(__dirname, '../server/.env');
      let envContent = await fs.readFile(envPath, 'utf8');
  
      if (claudeApiKey) {
        const claudeKeyRegex = /VUE_APP_ANTHROPIC_API_KEY=.*/;
        if (claudeKeyRegex.test(envContent)) {
          envContent = envContent.replace(claudeKeyRegex, `VUE_APP_ANTHROPIC_API_KEY=${claudeApiKey}`);
        } else {
          envContent += `\nVUE_APP_ANTHROPIC_API_KEY=${claudeApiKey}`;
        }
      }
  
      if (openaiApiKey) {
        const openaiKeyRegex = /VUE_APP_OPENAI_API_KEY=.*/;
        if (openaiKeyRegex.test(envContent)) {
          envContent = envContent.replace(openaiKeyRegex, `VUE_APP_OPENAI_API_KEY=${openaiApiKey}`);
        } else {
          envContent += `\nVUE_APP_OPENAI_API_KEY=${openaiApiKey}`;
        }
      }
  
      await fs.writeFile(envPath, envContent);
  
      // Refresh environment variables
      require('dotenv').config();
  
      res.json({ message: 'API keys saved successfully' });
    } catch (error) {
      console.error('Error saving API keys:', error);
      res.status(500).json({ error: 'Failed to save API keys' });
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

app.get('/api/get-api-keys', (req, res) => {
    res.json({
      claudeApiKey: process.env.VUE_APP_ANTHROPIC_API_KEY || 'No Key',
      openaiApiKey: process.env.VUE_APP_OPENAI_API_KEY || ''
    });
  });

startServer(BASE_PORT);