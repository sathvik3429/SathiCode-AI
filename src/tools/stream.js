
import { ai, MODEL } from "./gemini.js";

export async function streamGemini(prompt, previousInteractionId = null) {
    const stream = await ai.interactions.create({
        model: MODEL,
        input: prompt,
        ...(previousInteractionId
            ? { previous_interaction_id: previousInteractionId }
            : {}),
        stream: true
    });

    let interactionId = null;
    let finalText = "";

    for await (const event of stream) {
        if (event.event_type === "interaction.created") {
            interactionId = event.interaction.id;
        }

        if (
            event.event_type === "step.delta" &&
            event.delta.type === "text"
        ) {
            const chunk = event.delta.text;
            finalText += chunk;
            process.stdout.write(chunk);
        }
    }

    console.log("\n");

    return {
        interactionId,
        text: finalText
    };
}
    