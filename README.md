# Better Artifacts
GPT4o mini + Claude 3.5 Sonnet for Large Projects
(Vue 3 and Node.js)

## Compatibility
- Chrome, Edge, Opera (Web File System Access API) 
- Tested on Windows (Should work on all systems)
- Currently only supports coding in Python (this will change very soon)

## TL;DR
Claude's Artifacts is great but is lacking with large projects. This repo uses a similar artifacts system with multiple models including Claude 3.5 Sonnet and GPT4o mini to have much better command over your project and still get all the benefits of using frontier models.

## WHAT IS IT?

This repo provides a simple dark themed browser interface that replicates the functionality of Anthropic's Artifacts and Projects using GPT4o as a semantic router (both to organize and pick relevant data) and Claude 3.5 Sonnet via the API to write code.

## THE PROBLEM

Claude 3.5 Sonnet is excellent at writing code. The issue is that, despite its long context window, it tends to struggle with accuracy at long context length.

- Entire functions may be omitted/changed
- Features are removed/added that were never intended
- Claude will hallucinate with affirmation bias

## SOLUTION

- Use GPT4o mini as a cheap, high intelligence semantic router
- Use GPT4o mini to fully enrich the codebase with metadata
- Give Claude 3.5 Sonnet lean, high quality context and clear redundant directions

This project does not include a conversation log because it's not needed. The longer a conversation goes the lower quality the context becomes. Each request you send to Claude will have exactly the code Claude needs to see and precise instructions on what needs to be achieved.

## SETUP

1. Install dependencies:
   ```
   npm install dotenv
   ```

2. Start the Server:
   ```
   cd server
   node server.js
   ```

3. Open a new terminal and run:
   ```
   npm run serve
   ```

4. Create an OpenAI API Key
5. Create an Anthropic API Key
6. Create an OpenAI assistant:
   - Model: GPT4o Mini
   - Use this prompt/instructions:

   **PROMPT:**
   ```
   Your task is to analyze a provided code file, identify all the functions within it, summarize what each function does, list the functions it calls, and the imports it relies on. You should output your response in the following JSON format:
   {
     "file_name": "Name of the code file",
     "file_summary": "A brief summary of the entire script or code file.",
     "functions": [
       {
         "function_name": "Name of the function",
         "summary": "A brief summary of what the function does.",
         "calls": ["List", "of", "functions", "it", "calls"]
       },
       ...
     ],
     "imports": [
       "List",
       "of",
       "individual",
       "imports"
     ]
   }
   ```
   - Enable JSON Object as a response format
   - Copy the Assistant ID

7. Open http://localhost:8080/
8. Click the key button to the right of the estimated cost
9. Enter your Claude, OpenAI keys and your assistant ID

**WARNING**: The current state of the project is not using JWT. It will be added later. Make sure you are on a secure network.

## HOW TO USE

On the right side of the screen there are two drop-down menus. One for the active model and one for the active mode. The three current modes are Chat, Code and Project. GPT4o currently only works for Chat.

*Currently there is no conversation history enabled. That will be added later as it's not core to this app*

### Code Mode
This mode lets you ask one-off code questions. This is not connected to a directory. Currently, this project only supports Python but that will change soon to include all major programming languages.

### Project Mode
This is the main feature of this app. Before you begin:

1. Look through your project and decide what you do not want being sent to Claude (e.g., your pycache).
2. Create a `.ai_ignore` file in your root directory and list anything you do not want to include. The format is the same as a `.gitignore` file.
3. When you select Project, a folder icon will appear to the left. Click the folder icon and select the root directory folder of the project you wish to work on.
4. This will now upload your entire directory to a local neo4j graph database.
5. GPT4o will then go through all your files and enrich them, storing:
   - Your scripts
   - A summary of each script
   - A list of imports for each script
   - A list of function names for each script
   - A summary of what each function does
   - A list of functions that each function calls

Now when you ask a question, Claude 3.5 Sonnet will be given:
- Your project's exact file structure
- An index that includes a summary of the project
- Specific instructions
- Most importantly, it will be given only the scripts needed for your question, including:
  - The summary of each script
  - What each function does
  - How each function connects to other functions in your project

*This project is 2 Days old as of writing this and is a prototype. Expect bugs.*

## To Contribute
- Submit issues 
- Branch and Submit PRs (I'll check daily for a little while)
- If adding a new feature, please be as specific as possible as to what the feature is, what it does and how it relates within the project.

## Roadmap
1. Put up barely working prototype to make the internet angry (Completed 7/21/24)
2. Get current prototype polished and looking Chad level excellent
3. Add one-click refactor that creates a copy of your codebase, refactors it and provides insights on performance improvements
4. Add one-click unit testing that writes tests for every script/function in your codebase and runs them in a sandbox
5. Implement with an Agent framework(s) to make ourselves obsolete
6. Give it Scarlett Johansson's voice and then pretend that we totally didn't think that people would think it's weird

## UPDATES
7/22/24 - Added a File option as a temporary workaround and to help save on cost. File will take a large project (that doesn't work with the Claude API right now) and spit out a massive prompt. The prompt can be passed into Claude or GPT4o directly giving the LLM all of the needed context without being confused by your whole project. Tests work great. I took a 130 file project and passed in the correct 3-5 files based on their graph relations each time. The interface for this isn't pretty right now but it will be soon. Use this on large projects that get errors from the Claude API or because you have a pro membership and think you can save money. 
