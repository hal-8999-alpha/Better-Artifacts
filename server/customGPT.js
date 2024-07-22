const OpenAI = require('openai');
const dotenv = require('dotenv');

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.VUE_APP_OPENAI_API_KEY
});

const ASSISTANT_ID = process.env.VUE_APP_OPENAI_ASSISTANT_ID;

const MAX_REQUESTS_PER_MINUTE = 500;
const RATE_LIMIT_WINDOW = 30000; // 1 minute in milliseconds
let requestsThisMinute = 0;
let windowStart = Date.now();

async function rateLimitedApiCall(apiCallFn) {
  const now = Date.now();
  if (now - windowStart > RATE_LIMIT_WINDOW) {
    requestsThisMinute = 0;
    windowStart = now;
  }

  if (requestsThisMinute >= MAX_REQUESTS_PER_MINUTE) {
    const timeToWait = RATE_LIMIT_WINDOW - (now - windowStart);
    console.log(`Rate limit reached. Waiting ${timeToWait}ms before next request.`);
    await new Promise(resolve => setTimeout(resolve, timeToWait));
    return rateLimitedApiCall(apiCallFn);
  }

  requestsThisMinute++;
  return apiCallFn();
}

async function selectRelevantFiles(query, databaseContents) {
  console.log('Starting selectRelevantFiles function');
  try {
    // Create a thread
    console.log('Creating thread');
    const thread = await openai.beta.threads.create();
    console.log('Thread created:', thread.id);

    // Prepare a simplified version of the database contents
    console.log('Preparing simplified database contents');
    const simplifiedContents = {
      files: Object.values(databaseContents.files).map(content => ({
        fileName: content.file_name,
        summary: content.file_summary,
        functions: (content.functions || []).map(f => f.function_name),
        imports: content.imports
      }))
    };

    // Add a message to the thread
    console.log('Adding message to thread');
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
    console.log('Running assistant');
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: ASSISTANT_ID
    });

    // Wait for the run to complete
    console.log('Waiting for run to complete');
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    while (runStatus.status !== 'completed') {
      console.log('Run status:', runStatus.status);
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    }

    // Retrieve the messages
    console.log('Retrieving messages');
    const messages = await openai.beta.threads.messages.list(thread.id);

    // Get the last assistant message
    const lastAssistantMessage = messages.data
      .filter(message => message.role === 'assistant')
      .pop();

    if (lastAssistantMessage) {
      console.log('Assistant response received');
      const response = JSON.parse(lastAssistantMessage.content[0].text.value);
      console.log('Parsed response:', response);
      return {
        ...response,
        usage: runStatus.usage
      };
    } else {
      throw new Error('No response from assistant');
    }
  } catch (error) {
    console.error('Error in selectRelevantFiles:', error);
    throw error;
  }
}

async function analyzeFile(fileContent, fileName) {
  console.log(`Starting analyzeFile function for ${fileName}`);
  const maxRetries = 5;
  const baseTimeout = 30000; // 30 seconds

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt} for ${fileName}`);

      const thread = await rateLimitedApiCall(() => openai.beta.threads.create());
      console.log('Thread created:', thread.id);

      await rateLimitedApiCall(() => openai.beta.threads.messages.create(thread.id, {
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
      }));

      const run = await rateLimitedApiCall(() => openai.beta.threads.runs.create(thread.id, { assistant_id: ASSISTANT_ID }));

      const timeout = baseTimeout * Math.pow(2, attempt - 1);
      const runResult = await waitForRunCompletion(thread.id, run.id, timeout);

      const messages = await rateLimitedApiCall(() => openai.beta.threads.messages.list(thread.id));

      const lastAssistantMessage = messages.data
        .filter(message => message.role === 'assistant')
        .pop();

      if (lastAssistantMessage) {
        console.log('Assistant response received');
        const analysisResult = JSON.parse(lastAssistantMessage.content[0].text.value);
        analysisResult.content = fileContent;
        analysisResult.usage = runResult.usage;
        console.log('Analysis result:', analysisResult);
        return analysisResult;
      } else {
        throw new Error('No response from assistant');
      }
    } catch (error) {
      console.error(`Error in analyzeFile for ${fileName} (Attempt ${attempt}):`, error);
      if (attempt === maxRetries) {
        throw error;
      }
      const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
      console.log(`Retrying in ${delay / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
async function waitForRunCompletion(threadId, runId, timeout) {
  const startTime = Date.now();
  while (true) {
    const runStatus = await rateLimitedApiCall(() => openai.beta.threads.runs.retrieve(threadId, runId));
    console.log('Run status:', runStatus.status);
    if (runStatus.status === 'completed') {
      return runStatus;
    }
    if (Date.now() - startTime > timeout) {
      throw new Error('Run timed out');
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

module.exports = {
  selectRelevantFiles,
  analyzeFile
};