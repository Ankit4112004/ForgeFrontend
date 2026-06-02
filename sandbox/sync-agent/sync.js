import "dotenv/config";
import chokidar from 'chokidar';
import fs from 'fs';
import path from 'path';

const projectId = process.env.PROJECT_ID;
const localDirectory = '/workspace';
// Persistent local store (a hostPath volume on the node), one folder per project.
// This survives sandbox pod restarts so a reopened project keeps its files.
const persistDirectory = path.join('/persist', projectId || 'default');

const shouldSkip = (filePath) =>
    filePath.includes('node_modules') || filePath.includes('.env');

// Recursively collect all files under a directory (absolute paths).
function listFilesRecursive(dir) {
    const out = [];
    if (!fs.existsSync(dir)) return out;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name === 'node_modules' || entry.name === '.git') continue;
            out.push(...listFilesRecursive(full));
        } else {
            out.push(full);
        }
    }
    return out;
}

// Restore the project's saved files from the persistent store into the workspace.
function restoreFiles() {
    const files = listFilesRecursive(persistDirectory);
    console.log(`Restoring ${files.length} file(s) for project ${projectId} from local store...`);
    for (const file of files) {
        const relativePath = path.relative(persistDirectory, file);
        const localFilePath = path.join(localDirectory, relativePath);
        fs.mkdirSync(path.dirname(localFilePath), { recursive: true });
        fs.copyFileSync(file, localFilePath);
        console.log(`Restored ${relativePath}`);
    }
}

// Persist a single workspace file into the local store.
function saveFile(filePath) {
    try {
        if (shouldSkip(filePath)) return;
        const relativePath = path.relative(localDirectory, filePath);
        const destPath = path.join(persistDirectory, relativePath);
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        fs.copyFileSync(filePath, destPath);
        console.log(`Saved ${relativePath} to local store`);
    } catch (err) {
        console.error(`Error saving ${filePath} to local store:`, err);
    }
}

// Remove a file from the local store when it's deleted in the workspace.
function removeFile(filePath) {
    try {
        if (shouldSkip(filePath)) return;
        const relativePath = path.relative(localDirectory, filePath);
        const destPath = path.join(persistDirectory, relativePath);
        if (fs.existsSync(destPath)) {
            fs.rmSync(destPath, { force: true });
            console.log(`Removed ${relativePath} from local store`);
        }
    } catch (err) {
        console.error(`Error removing ${filePath} from local store:`, err);
    }
}

function startWatcher(hasFiles) {
    console.log("Starting chokidar watch...");
    chokidar.watch(localDirectory, {
        ignored: [
            /(^|[\/\\])\../, // ignore dotfiles
            /node_modules/,  // ignore node_modules completely
            /\.env/          // ignore .env files
        ],
        persistent: true,
        // If the store was empty (hasFiles is false), persist all existing local files now.
        ignoreInitial: hasFiles
    }).on('all', async (event, filePath) => {
        if (event === 'add' || event === 'change') {
            saveFile(filePath);
        } else if (event === 'unlink') {
            removeFile(filePath);
        }
    });
}

async function init() {
    try {
        fs.mkdirSync(persistDirectory, { recursive: true });
        const hasFiles = listFilesRecursive(persistDirectory).length > 0;

        if (hasFiles) {
            restoreFiles();
        } else {
            console.log("No saved files found. Local files will be persisted automatically.");
        }

        startWatcher(hasFiles);
    } catch (error) {
        console.error("Error during initialization:", error);
        console.warn("Local store unavailable — running without file persistence.");
        startWatcher(false);
    }
}

init();
