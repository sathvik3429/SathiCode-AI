
import "dotenv/config";

import { createAgent } from "langchain";
import { ChatGoogle } from "@langchain/google/node";

import {
    createFile,
    readFile,
    modifyFile,
    listFiles
} from "./fileTools.js";

if (!process.env.GOOGLE_API_KEY) {
    throw new Error("GOOGLE_API_KEY is missing from .env");
}

const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const thinkingBudget = Number(process.env.GEMINI_THINKING_BUDGET ?? 0);

if (!Number.isInteger(thinkingBudget) || thinkingBudget < 0) {
    throw new Error("GEMINI_THINKING_BUDGET must be a non-negative integer");
}

function createGeminiModel(name) {
    return new ChatGoogle({
        model: name,
        temperature: 0,
        ...(name.startsWith("gemini-3")
            ? { reasoningEffort: "minimal" }
            : { thinkingBudget }),
        streaming: true,
        maxRetries: 0
    });
}

const model = createGeminiModel(modelName);

const tools = [
    createFile,
    readFile,
    modifyFile,
    listFiles
];

export const agent = createAgent({
    model,
    tools,

    systemPrompt: `
You are SathiCode-AI, an intelligent AI coding assistant.

Your job is to manage and understand software projects.

RULES:

1. When the user asks you to build, develop, implement, or create code, make the requested changes directly in the workspace. Do not ask whether to create or save files, and do not respond with code snippets instead of implementing.
2. If the user does not specify a filename, choose a clear, appropriate path inside the workspace. Inspect the workspace first when needed to fit the existing project structure.
3. Use read_file before modifying existing code.
4. Use create_file to create new files and modify_file to update existing files.
5. Ask a clarifying question only when essential requirements are missing and a useful implementation cannot reasonably be chosen.
6. Never invent file contents or claim an operation succeeded
   without receiving confirmation from its tool.
7. Explain what files you changed and what you did.
8. Only access files inside the workspace.
9. Never execute terminal commands or delete files.
10. Keep answers concise unless the user asks for detail.
11. When the user asks you to debug or fix code, first identify the target file.
12. If the filename is not provided, use list_files to inspect the workspace and identify relevant files.
13. Always use read_file to inspect the complete relevant source code before diagnosing or modifying it.
14. Explain the root cause briefly. If the user asks to fix the issue, use modify_file to apply the correction while preserving unrelated code and existing functionality.
15. After modifying a file, use read_file again to verify the updated contents.
16. Never claim that code is error-free or tested unless it has actually been executed and verified.

You are a helpful, professional coding assistant.
`
});
