const express = require('express');
const OpenAI = require('openai');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(express.json());

const client = new OpenAI({ apiKey: process.env.VUE_APP_OPENAI_API_KEY });



async function retrieveThread(threadId) {
    const allMessages = await client.beta.threads.messages.list(threadId);
    const responseData = {
        all_messages: []
    };

    if (allMessages.data) {
        for (const message of allMessages.data) {
            for (const contentItem of message.content) {
                if (contentItem.type === 'text') {
                    responseData.all_messages.push(contentItem.text.value);
                    break;
                }
            }
        }
    }

    return responseData;
}

async function startNewConversation(assistantId, message) {
    try {
        const thread = await client.beta.threads.create();
        await client.beta.threads.messages.create({
            thread_id: thread.id,
            role: "user",
            content: message
        });
        return { assistantId, threadId: thread.id };
    } catch (error) {
        console.error(`Error starting new conversation: ${error.message}`);
        return { assistantId: null, threadId: null };
    }
}

async function executeRun(threadId, assistantId) {
    try {
        const existingAssistant = await client.beta.assistants.retrieve(assistantId);
        const run = await client.beta.threads.runs.create({
            thread_id: threadId,
            assistant_id: assistantId,
            instructions: existingAssistant.instructions
        });

        while (true) {
            const updatedRun = await client.beta.threads.runs.retrieve(run.id, threadId);

            if (updatedRun.status === 'completed') {
                const messages = await client.beta.threads.messages.list(threadId);
                const messagesList = messages.data;
                const lastMessage = messagesList[0] || null;
                return { messagesList, lastMessage, assistantId, threadId };
            } else if (updatedRun.status === "requires_action") {
                const toolOutputs = [];
                for (const toolCall of updatedRun.required_action.submit_tool_outputs.tool_calls) {
                    const { name, arguments: args } = toolCall.function;
                    const toolCallId = toolCall.id;

                    const func = gptFunctions[name];
                    if (typeof func === 'function') {
                        const parsedArgs = typeof args === 'string' ? JSON.parse(args) : args;
                        const output = func(parsedArgs);
                        if (output !== undefined) {
                            toolOutputs.push({
                                tool_call_id: toolCallId,
                                output
                            });
                        } else {
                            console.log(`The function ${name} returned undefined, which is not allowed.`);
                        }
                    } else {
                        console.log(`No function defined for tool: ${name}`);
                    }
                }

                if (toolOutputs.length > 0) {
                    await client.beta.threads.runs.submitToolOutputs(threadId, run.id, {
                        tool_outputs: toolOutputs
                    });
                }
            }

            console.log(updatedRun.status);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    } catch (error) {
        console.error(`Error executing run: ${error.message}`);
    }
}

async function customGptResponse(req, res) {
    const { assistant_id, thread_id, message, create, name, instructions, model, tools, files } = req.body;

    try {
        if (create) {
            if (!name || !instructions) {
                return res.status(400).json({ error: "A name and instructions must be provided to create a new assistant." });
            }
            const newAssistantId = await createAssistant(name, instructions, model, tools, files);
            if (!newAssistantId) {
                return res.status(500).json({ error: "Failed to create a new assistant." });
            }
            if (!message) {
                return res.json({ assistant_id: newAssistantId });
            }
        }

        if (!message) {
            return res.status(400).json({ error: "No message was passed." });
        }

        let currentAssistantId = assistant_id;
        let currentThreadId = thread_id;

        if (!currentAssistantId) {
            const { assistantId, threadId } = await startNewConversation(currentAssistantId, message);
            if (!assistantId || !threadId) {
                return res.status(500).json({ error: "Failed to start a new conversation." });
            }
            currentAssistantId = assistantId;
            currentThreadId = threadId;
        } else if (currentThreadId) {
            await continueConversation(currentThreadId, currentAssistantId, message);
        } else {
            const { assistantId, threadId } = await startNewConversation(currentAssistantId, message);
            if (!assistantId || !threadId) {
                return res.status(500).json({ error: "Failed to create a new conversation." });
            }
            currentAssistantId = assistantId;
            currentThreadId = threadId;
        }

        const { messagesList, lastMessage } = await executeRun(currentThreadId, currentAssistantId);

        const responseData = {
            assistant_id: currentAssistantId,
            thread_id: currentThreadId,
            all_messages: messagesList.map(message => 
                message.content[0]?.type === 'text' ? message.content[0].text.value : 'No text content in a message'
            ),
            last_message: lastMessage?.content[0]?.type === 'text' ? lastMessage.content[0].text.value : 'No text content in the last message'
        };

        res.json(responseData);
    } catch (error) {
        console.error(`Error in customGptResponse: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
}

// app.post('/gpt-response', customGptResponse);

// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));