import axios from 'axios';
import { tool } from "langchain"
import * as z from "zod";


export const listFiles = tool(
    async ({ }, config) => {

        const writer = config.context?.writer ?? (() => {});

        writer("Listing files in project directory...\n");

        const response = await axios.get(`http://sandbox-service-${config.context.projectId}:3000/list-files`)

        writer("Files listed successfully." + "Files: " + response.data.files.join(",") + "\n");

        return JSON.stringify(response.data.files);
    },
    {
        name: "list_files",
        description: "List all the files in the project directory. This is useful for understanding what files are available to work with.",
        schema: z.object({})
    }
)

export const readFiles = tool(
    async ({ files = [] }, config) => {

        const writer = config.context?.writer ?? (() => {});

        writer("Reading files..." + files.join(",") + "\n");

        const response = await axios.get(`http://sandbox-service-${config.context.projectId}:3000/read-files?files=` + files.join(","))

        writer("Files read successfully.\n");
        return JSON.stringify(response.data);
    },
    {
        name: "read_files",
        description: "Read the contents of specified files. This is useful for understanding the content of files that are relevant to the task at hand.",
        schema: z.object({
            files: z.array(z.string()).describe("The list of files absolute paths to read. These should be files that were listed using the list_files tool or created later")
        })
    }
)

// Strip ANSI color escape codes so error messages are readable for the model.
const stripAnsi = (str) => str.replace(/\x1B\[[0-9;]*m/g, "");

/**
 * Ask the sandbox's Vite dev server to transform each changed module.
 * Vite returns HTTP 500 (with the parse/transform error in the body) when a
 * module has a syntax error — that is exactly what blanks the preview. We hit
 * the per-project service on port 80 (targetPort 5173) which Vite serves.
 * Returns an array of { file, message } for any module that failed to compile.
 */
const verifyBuild = async (files, projectId) => {
    const codeFiles = files
        .map(f => f.file)
        .filter(f => /\.(jsx?|tsx?)$/.test(f));

    if (!codeFiles.length) return [];

    // Give Vite's file watcher a moment to invalidate the changed modules
    // before we request fresh transforms.
    await new Promise(r => setTimeout(r, 700));

    const errors = [];
    for (const file of codeFiles) {
        const urlPath = file.startsWith("/") ? file : `/${file}`;
        try {
            const resp = await axios.get(
                `http://sandbox-service-${projectId}${urlPath}?t=${Date.now()}`,
                { timeout: 8000, validateStatus: () => true, responseType: "text" }
            );
            const body = typeof resp.data === "string" ? resp.data : JSON.stringify(resp.data);
            const failed =
                resp.status >= 500 ||
                /Transform failed|\[PARSE_ERROR\]|Internal server error|SyntaxError|Pre-transform error|Failed to resolve import/i.test(body);

            if (failed) {
                // Keep the message compact but informative for the model.
                const clean = stripAnsi(body).trim().slice(0, 800);
                errors.push({ file, message: clean });
            }
        } catch (e) {
            // Network blip / Vite restarting — don't report a false positive
            // (would cause a pointless fix loop). Skip this file.
        }
    }
    return errors;
};

export const updateFiles = tool(
    async ({ files }, config) => {
        const writer = config.context?.writer ?? (() => {});
        const projectId = config.context.projectId;

        writer("Updating files..." + files.map(f => f.file).join(",") + "\n");


        const response = await axios.patch(`http://sandbox-service-${projectId}:3000/update-files`, {
            updates: files
        })

        writer("Files updated successfully.\n");

        // Verify the changed code actually compiles in Vite before declaring success.
        writer("Verifying build...\n");
        const buildErrors = await verifyBuild(files, projectId);

        if (buildErrors.length) {
            writer("Build failed — found compile errors, attempting to fix...\n");
            return JSON.stringify({
                status: "BUILD_FAILED",
                message:
                    "The files were written but the app FAILS TO COMPILE and the preview is currently BLANK. " +
                    "You MUST fix every error below by calling update_files again with corrected, complete, syntactically valid file content. " +
                    "Common causes: JSX inline styles need double braces (style={{ }}), unbalanced braces/brackets/backticks, or importing a file/asset that does not exist. " +
                    "Do not respond to the user until the build passes.",
                errors: buildErrors,
                writeResults: response.data.results
            });
        }

        writer("Build verified successfully.\n");
        return JSON.stringify(response.data.results);
    },
    {
        name: "update_files",
        description: "Update the contents of specified files (also creates new files when given a new path). After writing, it AUTOMATICALLY verifies that the changed code compiles in the dev server. If the result has status 'BUILD_FAILED', the app is blank and you MUST call update_files again with corrected code to fix the listed errors before finishing.",
        schema: z.object({
            files: z.array(z.object({
                file: z.string().describe("The absolute path of the file to update"),
                content: z.string().describe("The new content for the file, the content should support json format.")
            })).describe("The list of files to update and their new contents")
        })
    }
)
