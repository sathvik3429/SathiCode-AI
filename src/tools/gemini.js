
import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

if (!process.env.GOOGLE_API_KEY) {
    throw new Error("GOOGLE_API_KEY missing");
}

export const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_API_KEY
});

export const MODEL =
    process.env.GEMINI_MODEL || "gemini-3.8-flash";
