const OpenAI = require('openai');
const dotenv = require('dotenv');

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.VUE_APP_OPENAI_API_KEY
});

const ASSISTANT_ID = process.env.VUE_APP_OPENAI_ASSISTANT_ID;

async function selectRelevantFiles(query, databaseContents) {
  try {
    // Create a thread
    const thread = await openai.beta.threads.create();

    // Prepare a simplified version of the database contents
    const simplifiedContents = {
      files: Object.values(databaseContents.files).map(content => ({
        fileName: content.file_name,
        summary: content.file_summary,
        functions: content.functions.map(f => f.function_name),
        imports: content.imports
      }))
    };

    // Add a message to the thread
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: `Given the following database contents representing a codebase:
${JSON.stringify(simplifiedContents, null, 2)}

And the user query: "${query}"

Please analyze the codebase and select the most relevant files and functions that would need to be examined or modified to address the user's query. Return your response as a JSON object with the following structure:
{
  "relevantFiles": [
    {
      "fileName": "example.py",
      "relevantFunctions": ["function1", "function2"]
    }
  ],
  "explanation": "A brief explanation of why these files and functions were selected."
}`
    });

    // Run the assistant
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: ASSISTANT_ID
    });

    // Wait for the run to complete
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    while (runStatus.status !== 'completed') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    }

    // Retrieve the messages
    const messages = await openai.beta.threads.messages.list(thread.id);

    // Get the last assistant message
    const lastAssistantMessage = messages.data
      .filter(message => message.role === 'assistant')
      .pop();

    if (lastAssistantMessage) {
      return JSON.parse(lastAssistantMessage.content[0].text.value);
    } else {
      throw new Error('No response from assistant');
    }
  } catch (error) {
    console.error('Error in selectRelevantFiles:', error);
    throw error;
  }
}

async function analyzeFile(fileContent, fileName) {
  try {
    // Create a thread
    const thread = await openai.beta.threads.create();

    // Add a message to the thread
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: `Please analyze the following file content for ${fileName}. Provide a summary of the file, list all functions with their summaries and the functions they call, and list all imports. Return the response as a JSON object with the following structure:

{
  "file_name": "${fileName}",
  "file_summary": "Brief summary of the file's purpose",
  "functions": [
    {
      "function_name": "example_function",
      "summary": "Brief description of what the function does",
      "calls": ["other_function1", "other_function2"]
    }
  ],
  "imports": ["import1", "import2"]
}

Here's the file content:

${fileContent}`
    });

    // Run the assistant
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: ASSISTANT_ID
    });

    // Wait for the run to complete
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    while (runStatus.status !== 'completed') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    }

    // Retrieve the messages
    const messages = await openai.beta.threads.messages.list(thread.id);

    // Get the last assistant message
    const lastAssistantMessage = messages.data
      .filter(message => message.role === 'assistant')
      .pop();

    if (lastAssistantMessage) {
      const analysisResult = JSON.parse(lastAssistantMessage.content[0].text.value);
      // Add the file content to the analysis result
      analysisResult.content = fileContent;
      return analysisResult;
    } else {
      throw new Error('No response from assistant');
    }
  } catch (error) {
    console.error('Error in analyzeFile:', error);
    throw error;
  }
}

module.exports = {
  selectRelevantFiles,
  analyzeFile
};