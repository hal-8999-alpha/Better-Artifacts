const fs = require('fs').promises;
const path = require('path');
const { Level } = require('level');
const customGPT = require('./customGPT');
const crypto = require('crypto');

let db;
const DB_PATH = path.join(__dirname, 'codebase-db');

// Rate limit constants
const RPM_LIMIT = 5000;
const TPM_LIMIT = 80000;

// Tracking for rate limits
let requestsThisMinute = 0;
let tokensThisMinute = 0;
let lastResetTime = Date.now();

function resetRateLimitTracking() {
    requestsThisMinute = 0;
    tokensThisMinute = 0;
    lastResetTime = Date.now();
}

async function ensureDatabaseDirectory() {
    try {
        await fs.access(DB_PATH);
    } catch (error) {
        if (error.code === 'ENOENT') {
            await fs.mkdir(DB_PATH, { recursive: true });
            console.log('Database directory created:', DB_PATH);
        } else {
            console.error('Error accessing database directory:', error);
            throw error;
        }
    }
}

async function openDatabase() {
    if (!db) {
        try {
            await ensureDatabaseDirectory();
            db = new Level(DB_PATH, { valueEncoding: 'json' });
            await db.open();
            console.log('Database opened successfully:', DB_PATH);
        } catch (error) {
            console.error('Error opening database:', error);
            if (error.code === 'LEVEL_IO_ERROR') {
                console.error('IO Error details:', error.cause);
            }
            throw error;
        }
    }
}

async function closeDatabase() {
    if (db) {
        try {
            await db.close();
            console.log('Database closed successfully');
            db = null;
        } catch (error) {
            console.error('Error closing database:', error);
        }
    }
}

async function calculateFileHash(filePath) {
    try {
        const fileBuffer = await fs.readFile(filePath);
        const hashSum = crypto.createHash('sha256');
        hashSum.update(fileBuffer);
        return hashSum.digest('hex');
    } catch (error) {
        console.error(`Error calculating hash for ${filePath}:`, error);
        throw error;
    }
}

async function processFile(file, projectRoot) {
    console.log(`Processing file: ${file.relativePath}`);
    const fileContent = await readFile(file.absolutePath);

    if (fileContent !== null) {
        const currentHash = await calculateFileHash(file.absolutePath);
        const storedHash = await getStoredHash(file.relativePath);

        console.log(`File: ${file.relativePath}`);
        console.log(`Current hash: ${currentHash}`);
        console.log(`Stored hash: ${storedHash}`);

        if (currentHash !== storedHash) {
            console.log(`File ${file.relativePath} has changed, processing...`);
            try {
                const analysisResult = await analyzeFile(file.relativePath, fileContent);
                await storeAnalysisResult(analysisResult, projectRoot, currentHash);
                console.log(`Completed processing and storing file: ${file.relativePath}`);
            } catch (analysisError) {
                console.error(`Error analyzing file ${file.relativePath}:`, analysisError);
            }
        } else {
            console.log(`File ${file.relativePath} unchanged, skipping...`);
        }
    } else {
        console.log(`Skipped file: ${file.relativePath} due to read error`);
    }
}

async function startProcess(files, projectRoot, ignoredPaths) {
    console.log(`Starting process for ${files.length} files`);
    console.log('Project root:', projectRoot);
    console.log('Ignored paths:', ignoredPaths);
    try {
        await openDatabase();
        console.log('Database initialized');

        const { default: PQueue } = await import('p-queue');
        const queue = new PQueue({concurrency: 50}); // Adjust concurrency as needed

        const processFileWithRateLimit = async (file) => {
            // Check if we need to reset rate limit tracking
            if (Date.now() - lastResetTime >= 60000) {
                resetRateLimitTracking();
            }

            // Check if we're within rate limits
            if (requestsThisMinute >= RPM_LIMIT || tokensThisMinute >= TPM_LIMIT) {
                const delay = 60000 - (Date.now() - lastResetTime);
                await new Promise(resolve => setTimeout(resolve, delay));
                resetRateLimitTracking();
            }

            // Process the file
            await processFile(file, projectRoot);

            // Update rate limit tracking
            requestsThisMinute++;
            // Estimate token usage (you may need to adjust this based on your actual usage)
            tokensThisMinute += file.relativePath.length * 2; // Rough estimate
        };

        // Queue all file processing tasks
        await Promise.all(files.map(file => queue.add(() => processFileWithRateLimit(file))));

        console.log('Generating function call tree...');
        const tree = await generateFunctionCallTree(projectRoot);
        await db.put('functionCallTree', tree);

        console.log('Process completed successfully');
        return true;
    } catch (error) {
        console.error('Error in startProcess:', error);
        return false;
    } finally {
        await closeDatabase();
    }
}

async function getStoredHash(relativePath) {
    try {
        const key = `hash:${relativePath}`;
        return await db.get(key);
    } catch (error) {
        if (error.notFound) {
            return null;
        }
        console.error(`Error getting stored hash for ${relativePath}:`, error);
        throw error;
    }
}

async function analyzeFile(filePath, content) {
    console.log(`Analyzing file: ${filePath}`);
    try {
        const result = await customGPT.analyzeFile(content, filePath);
        console.log(`Analysis completed for file: ${filePath}`);
        return result;
    } catch (error) {
        console.error(`Error in analyzeFile for ${filePath}:`, error);
        throw error;
    }
}

function extractFunctions(content) {
    const functionRegex = /def\s+(\w+)\s*\([^)]*\):/g;
    const functions = [];
    let match;

    while ((match = functionRegex.exec(content)) !== null) {
        functions.push({
            function_name: match[1],
            summary: `Function ${match[1]}`,
            calls: []
        });
    }

    return functions;
}

function extractImports(content) {
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

async function storeAnalysisResult(analysisResult, projectRoot, fileHash) {
    console.log(`Storing analysis result for file: ${analysisResult.file_name}`);
    try {
        const key = `file:${path.join(projectRoot, analysisResult.file_name)}`;
        await db.put(key, {
            ...analysisResult,
            content: analysisResult.content
        });
        
        const hashKey = `hash:${analysisResult.file_name}`;
        await db.put(hashKey, fileHash);
        
        console.log(`Stored file content and hash for: ${analysisResult.file_name}`);
        
        for (const func of analysisResult.functions) {
            const functionKey = `function:${path.join(projectRoot, analysisResult.file_name)}:${func.function_name}`;
            await db.put(functionKey, {
                summary: func.summary,
                calls: func.calls
            });
        }
        
        const importKey = `imports:${path.join(projectRoot, analysisResult.file_name)}`;
        await db.put(importKey, analysisResult.imports);
        
        console.log(`Successfully stored analysis result for file: ${analysisResult.file_name}`);
    } catch (error) {
        console.error(`Error storing analysis result for ${analysisResult.file_name}:`, error);
        throw error;
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
            fileStructure: {}
        };

        for await (const [key, value] of db.iterator()) {
            if (key.startsWith('file:')) {
                const filePath = key.slice(5);
                contents.files[filePath] = value;
                
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