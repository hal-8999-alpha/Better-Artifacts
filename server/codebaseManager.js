const fs = require('fs').promises;
const path = require('path');
const { Level } = require('level');
const customGPT = require('./customGPT');

let db;

async function openDatabase() {
    if (!db) {
        db = new Level('./codebase-db', { valueEncoding: 'json' });
        await db.open();
    }
}

async function closeDatabase() {
    if (db) {
        await db.close();
        db = null;
    }
}

async function startProcess(directoryName, files) {
    console.log(`Starting process for directory: ${directoryName}`);
    try {
        await openDatabase();
        console.log('Database initialized');

        // Clear the database
        await clearDatabase();
        console.log('Database cleared');

        console.log(`Found ${files.length} files to process`);

        // Get the parent directory of the current working directory
        const parentDir = path.dirname(process.cwd());

        const filesToAnalyze = [];

        // Process each file
        for (const file of files) {
            console.log(`Processing file: ${file}`);
            const filePath = path.join(parentDir, directoryName, file);
            console.log(`Resolved file path: ${filePath}`);
            const fileContent = await readFile(filePath);

            if (fileContent !== null) {
                filesToAnalyze.push({ name: file, content: fileContent });
            } else {
                console.log(`Skipped file: ${file} due to read error`);
            }
        }

        // Analyze files using GPT
        const analysisResults = await customGPT.processFiles(filesToAnalyze);

        // Store analysis results
        for (const result of analysisResults) {
            if (result.error) {
                console.log(`Error analyzing file ${result.fileName}: ${result.error}`);
            } else {
                await storeAnalysisResult(result);
                console.log(`Completed processing file: ${result.fileName}`);
            }
        }

        // Generate and store the function call tree
        const tree = await generateFunctionCallTree();
        await db.put('functionCallTree', tree);

        console.log('Process completed successfully');
        return true;
    } catch (error) {
        console.error('Error in startProcess:', error);
        return false;
    } finally {
        await closeDatabase();
        console.log('Database closed');
    }
}

async function clearDatabase() {
    for await (const key of db.keys()) {
        await db.del(key);
    }
}

async function readFile(filePath) {
    console.log(`Attempting to read file: ${filePath}`);
    try {
        const content = await fs.readFile(filePath, 'utf8');
        console.log(`Successfully read file: ${filePath}`);
        return content;
    } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
        return null;
    }
}

async function storeAnalysisResult(analysisResult) {
    console.log(`Storing analysis result for file: ${analysisResult.fileName}`);
    try {
        // Store the raw analysis along with the full file content
        await db.put(`file:${analysisResult.fileName}`, {
            ...analysisResult.analysis,
            content: analysisResult.content  // Add the full file content
        });
        
        // Store functions
        for (const func of analysisResult.analysis.functions) {
            await db.put(`function:${analysisResult.fileName}:${func.function_name}`, {
                summary: func.summary,
                calls: func.calls
            });
        }
        
        // Store imports
        await db.put(`imports:${analysisResult.fileName}`, analysisResult.analysis.imports);
    } catch (error) {
        console.error(`Error storing analysis result for ${analysisResult.fileName}:`, error);
    }
}

async function generateFunctionCallTree() {
    const tree = {};

    for await (const [key, value] of db.iterator()) {
        if (key.startsWith('function:')) {
            const [_, filePath, functionName] = key.split(':');
            if (!tree[filePath]) {
                tree[filePath] = {};
            }
            tree[filePath][functionName] = value.calls;
        }
    }

    return tree;
}

async function getDatabaseContents() {
    try {
        await openDatabase();

        const contents = {
            files: {},
            functions: {},
            imports: {},
            functionCallTree: {}
        };

        for await (const [key, value] of db.iterator()) {
            if (key.startsWith('file:')) {
                contents.files[key.slice(5)] = value;
            } else if (key.startsWith('function:')) {
                const [_, filePath, functionName] = key.split(':');
                if (!contents.functions[filePath]) {
                    contents.functions[filePath] = {};
                }
                contents.functions[filePath][functionName] = value;
            } else if (key.startsWith('imports:')) {
                contents.imports[key.slice(8)] = value;
            } else if (key === 'functionCallTree') {
                contents.functionCallTree = value;
            }
        }

        return contents;
    } catch (error) {
        console.error('Error getting database contents:', error);
        throw error;
    } finally {
        await closeDatabase();
    }
}

module.exports = {
    startProcess,
    getDatabaseContents
};