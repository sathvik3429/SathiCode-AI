
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

import { agent } from "./src/tools/agent.js";

const rl = createInterface({
    input: stdin,
    output: stdout
});

let messages = [];

function keepRecentTurns(history, maxTurns = 4) {
    const userMessageIndexes = history.reduce((indexes, message, index) => {
        const isUserMessage =
            message.getType?.() === "human" ||
            message.role === "user" ||
            message.type === "human";

        if (isUserMessage) indexes.push(index);
        return indexes;
    }, []);

    if (userMessageIndexes.length <= maxTurns) return history;
    return history.slice(userMessageIndexes.at(-maxTurns));
}

console.log("\n=================================");
console.log("       SathiCode-AI");
console.log("   Your AI Coding Assistant");
console.log("=================================");
console.log("Type 'exit' to quit.\n");

try {
    while (true) {
        let input;
        try {
            input = await rl.question("You: ");
        } catch (error) {
            if (error.code === "ERR_USE_AFTER_CLOSE") break;
            throw error;
        }

        if (input.trim().toLowerCase() === "exit") {
            console.log("SathiCode-AI closed.");
            break;
        }

        if (!input.trim()) continue;

        try {
            const requestMessages = keepRecentTurns([
                ...messages,
                {
                    role: "user",
                    content: input
                }
            ]);

            console.log("\nSathiCode-AI is thinking...\n");

            const stream = await agent.streamEvents(
                { messages: requestMessages },
                { version: "v3" }
            );

            let receivedText = false;
            process.stdout.write("SathiCode-AI: ");

            await Promise.all([
                (async () => {
                    for await (const message of stream.messages) {
                        for await (const token of message.text) {
                            process.stdout.write(token);
                            receivedText = true;
                        }
                    }
                })(),
                (async () => {
                    for await (const _toolCall of stream.toolCalls) {
                        // Consume tool events so the stream can complete.
                    }
                })()
            ]);

            const response = await stream.output;
            messages = keepRecentTurns(response.messages);

            if (!receivedText) {
                const lastMessage = messages.at(-1);
                const answer = lastMessage?.content;
                console.log(
                    typeof answer === "string"
                        ? answer
                        : JSON.stringify(answer ?? "No response received.", null, 2)
                );
            }

            console.log();
        } catch (error) {
            console.error("\nAgent error:", error.message || error);
        }

        console.log("\n---------------------------------\n");
    }
} finally {
    rl.close();
}
