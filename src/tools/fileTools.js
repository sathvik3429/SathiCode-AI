
import fs from "node:fs/promises";
import path from "node:path";
import { tool } from "langchain";
import * as z from "zod";


// Only this directory is accessible to the agent.
const WORKSPACE = path.resolve("workspace");

async function initializeWorkspace() {
    await fs.mkdir(WORKSPACE, { recursive: true });
}

// Protect against path traversal and symlink escapes.
async function safePath(filePath) {
    await initializeWorkspace();

    const root = await fs.realpath(WORKSPACE);
    const target = path.resolve(root, filePath);

    const relative = path.relative(root, target);

    if (
        relative === ".." ||
        relative.startsWith(`..${path.sep}`) ||
        path.isAbsolute(relative)
    ) {
        throw new Error("Access denied: path outside workspace");
    }

    // Reject symlinks in every existing path component.
    let current = root;

    for (const part of relative.split(path.sep).filter(Boolean)) {
        current = path.join(current, part);

        try {
            const stats = await fs.lstat(current);

            if (stats.isSymbolicLink()) {
                throw new Error("Access denied: symbolic links are not allowed");
            }
        } catch (error) {
            if (error.code === "ENOENT") break;
            throw error;
        }
    }

    return target;
}

// 1. CREATE FILE
export const createFile = tool(
    async ({ filePath, content }) => {
        const target = await safePath(filePath);

        await fs.mkdir(path.dirname(target), {
            recursive: true
        });

        await fs.writeFile(target, content, {
            encoding: "utf8",
            flag: "wx"
        });

        return `Successfully created ${filePath}`;
    },
    {
        name: "create_file",
        description: "Create a new file in the workspace.",
        schema: z.object({
            filePath: z.string(),
            content: z.string()
        })
    }
);

// 2. READ FILE
export const readFile = tool(
    async ({ filePath }) => {
        const target = await safePath(filePath);

        const stats = await fs.stat(target);

        if (!stats.isFile()) {
            throw new Error("The requested path is not a file");
        }

        if (stats.size > 1024 * 1024) {
            throw new Error("File is too large to read (maximum 1 MB)");
        }

        return await fs.readFile(target, "utf8");
    },
    {
        name: "read_file",
        description: "Read the contents of an existing file.",
        schema: z.object({
            filePath: z.string()
        })
    }
);

// 3. MODIFY FILE
export const modifyFile = tool(
    async ({ filePath, content }) => {
        const target = await safePath(filePath);

        const stats = await fs.stat(target);

        if (!stats.isFile()) {
            throw new Error("The requested path is not a file");
        }

        await fs.writeFile(target, content, "utf8");

        return `Successfully modified ${filePath}`;
    },
    {
        name: "modify_file",
        description: "Replace the complete contents of an existing file.",
        schema: z.object({
            filePath: z.string(),
            content: z.string()
        })
    }
);

// 4. LIST FILES
export const listFiles = tool(
    async ({ directory }) => {
        const target = await safePath(directory);

        const entries = await fs.readdir(target, {
            withFileTypes: true
        });

        return JSON.stringify(
            entries.map(entry => ({
                name: entry.name,
                type: entry.isDirectory() ? "folder" : "file"
            })),
            null,
            2
        );
    },
    {
        name: "list_files",
        description: "List files and folders in the workspace.",
        schema: z.object({
            directory: z.string().default(".")
        })
    }
);
