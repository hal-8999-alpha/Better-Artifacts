require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

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

    res.json({
      conversation: conversationText,
      codeScripts: scripts
    });
  } catch (error) {
    console.error('Anthropic API Error:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: error.response ? error.response.data : error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Environment variables:');
  console.log('OPENAI_API_KEY:', process.env.VUE_APP_OPENAI_API_KEY ? 'Set' : 'Not set');
  console.log('ANTHROPIC_API_KEY:', process.env.VUE_APP_ANTHROPIC_API_KEY ? 'Set' : 'Not set');
});