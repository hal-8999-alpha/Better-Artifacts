// envSetup.js

const fs = require('fs').promises;
const path = require('path');

async function setupEnvFile() {
  const envPath = path.resolve(__dirname, '.env');
  
  try {
    await fs.access(envPath);
    console.log('.env file already exists');
  } catch (error) {
    if (error.code === 'ENOENT') {
      const defaultEnvContent = `
VUE_APP_OPENAI_API_KEY=your_openai_api_key_here
VUE_APP_ANTHROPIC_API_KEY=your_anthropic_api_key_here
PORT=3000
`;
      
      try {
        await fs.writeFile(envPath, defaultEnvContent.trim());
        console.log('.env file created with default values');
      } catch (writeError) {
        console.error('Error creating .env file:', writeError);
      }
    } else {
      console.error('Error checking .env file:', error);
    }
  }
}

module.exports = { setupEnvFile };