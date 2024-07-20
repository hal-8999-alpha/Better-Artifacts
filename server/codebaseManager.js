const fs = require('fs').promises;
const path = require('path');
const { Level } = require('level');

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

async function startProcess(files, projectRoot) {
    console.log(`Starting process for ${files.length} files`);
    try {
        await openDatabase();
        console.log('Database initialized');

        await clearDatabase();
        console.log('Database cleared');

        for (const file of files) {
            console.log(`Processing file: ${file.relativePath}`);
            const fileContent = await readFile(file.absolutePath);

            if (fileContent !== null) {
                const analysisResult = await analyzeFile(file.relativePath, fileContent);
                await storeAnalysisResult(analysisResult, projectRoot);
                console.log(`Completed processing and storing file: ${file.relativePath}`);
            } else {
                console.log(`Skipped file: ${file.relativePath} due to read error`);
            }
        }

        const tree = await generateFunctionCallTree(projectRoot);
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

async function analyzeFile(filePath, content) {
    // This function now delegates to customGPT.js for analysis
    const customGPT = require('./customGPT');
    return await customGPT.analyzeFile(content, filePath);
}

function extractFunctions(content) {
    // Keeping this function for backwards compatibility
    const functionRegex = /def\s+(\w+)\s*\([^)]*\):/g;
    const functions = [];
    let match;

    while ((match = functionRegex.exec(content)) !== null) {
        functions.push({
            function_name: match[1],
            summary: `Function ${match[1]}`,
            calls: [] // You might want to implement a way to detect function calls
        });
    }

    return functions;
}

function extractImports(content) {
    // Keeping this function for backwards compatibility
    const importRegex = /^(?:from\s+(\S+)\s+)?import\s+(.+)$/gm;
    const imports = [];
    let match;

    while ((match = importRegex.exec(content)) !== null) {
        if (match[1]) {
            imports.push(`from ${match[1]} import ${match[2]}`);
        } else {
            imports.push(`import ${match[2]}`);
        }
    }

    return imports;
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

async function storeAnalysisResult(analysisResult, projectRoot) {
    console.log(`Storing analysis result for file: ${analysisResult.file_name}`);
    try {
        const key = `file:${path.join(projectRoot, analysisResult.file_name)}`;
        await db.put(key, analysisResult);
        
        // Store functions
        for (const func of analysisResult.functions) {
            const functionKey = `function:${path.join(projectRoot, analysisResult.file_name)}:${func.function_name}`;
            await db.put(functionKey, {
                summary: func.summary,
                calls: func.calls
            });
        }
        
        // Store imports
        const importKey = `imports:${path.join(projectRoot, analysisResult.file_name)}`;
        await db.put(importKey, analysisResult.imports);
    } catch (error) {
        console.error(`Error storing analysis result for ${analysisResult.file_name}:`, error);
    }
}

async function clearDatabase() {
    for await (const key of db.keys()) {
        await db.del(key);
    }
}

async function generateFunctionCallTree(projectRoot) {
    const tree = {};

    for await (const [key, value] of db.iterator()) {
        if (key.startsWith('function:')) {
            const [_, filePath, functionName] = key.split(':');
            const relativePath = path.relative(projectRoot, filePath);
            if (!tree[relativePath]) {
                tree[relativePath] = {};
            }
            tree[relativePath][functionName] = value.calls;
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
            functionCallTree: {},
            fileStructure: {} // New field to store file structure
        };

        for await (const [key, value] of db.iterator()) {
            if (key.startsWith('file:')) {
                const filePath = key.slice(5);
                contents.files[filePath] = value;
                
                // Build file structure
                const pathParts = filePath.split('/');
                let currentLevel = contents.fileStructure;
                pathParts.forEach((part, index) => {
                    if (index === pathParts.length - 1) {
                        currentLevel[part] = 'file';
                    } else {
                        if (!currentLevel[part]) {
                            currentLevel[part] = {};
                        }
                        currentLevel = currentLevel[part];
                    }
                });
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

        console.log('Retrieved database contents:', JSON.stringify(contents, null, 2));

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