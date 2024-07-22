const OpenAI = require('openai');
const dotenv = require('dotenv');

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.VUE_APP_OPENAI_API_KEY
});

const ASSISTANT_ID = process.env.VUE_APP_OPENAI_ASSISTANT_ID;

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
        functions: content.functions.map(f => f.function_name),
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
      return response;
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
  const maxRetries = 3;
  const timeout = 60000; // 60 seconds timeout

  return new Promise(async (resolve, reject) => {
    const globalTimeout = setTimeout(() => {
      reject(new Error(`Global timeout reached for ${fileName}`));
    }, timeout * 2); // Double the timeout for the entire function

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt} for ${fileName}`);

        // Create a thread
        console.log(`Creating thread (Attempt ${attempt})`);
        const thread = await Promise.race([
          openai.beta.threads.create(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Thread creation timeout')), timeout))
        ]);
        console.log('Thread created:', thread.id);

        // Add a message to the thread
        console.log('Adding message to thread');
        await Promise.race([
          openai.beta.threads.messages.create(thread.id, {
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
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Message creation timeout')), timeout))
        ]);

        // Run the assistant
        console.log(`Running assistant (Attempt ${attempt})`);
        const run = await Promise.race([
          openai.beta.threads.runs.create(thread.id, { assistant_id: ASSISTANT_ID }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Run creation timeout')), timeout))
        ]);

        // Wait for the run to complete
        console.log('Waiting for run to complete');
        let runStatus;
        const startTime = Date.now();
        while (true) {
          runStatus = await Promise.race([
            openai.beta.threads.runs.retrieve(thread.id, run.id),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Run status check timeout')), 10000))
          ]);
          console.log('Run status:', runStatus.status);
          if (runStatus.status === 'completed') break;
          if (Date.now() - startTime > timeout) {
            throw new Error('Run timed out');
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Retrieve the messages
        console.log('Retrieving messages');
        const messages = await Promise.race([
          openai.beta.threads.messages.list(thread.id),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Message retrieval timeout')), timeout))
        ]);

        // Get the last assistant message
        const lastAssistantMessage = messages.data
          .filter(message => message.role === 'assistant')
          .pop();

        if (lastAssistantMessage) {
          console.log('Assistant response received');
          const analysisResult = JSON.parse(lastAssistantMessage.content[0].text.value);
          analysisResult.content = fileContent;
          console.log('Analysis result:', analysisResult);
          clearTimeout(globalTimeout);
          resolve(analysisResult);
          return;
        } else {
          throw new Error('No response from assistant');
        }
      } catch (error) {
        console.error(`Error in analyzeFile for ${fileName} (Attempt ${attempt}):`, error);
        if (attempt === maxRetries) {
          clearTimeout(globalTimeout);
          reject(error);
          return;
        }
        console.log(`Retrying in 5 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  });
}

module.exports = {
  selectRelevantFiles,
  analyzeFile
};