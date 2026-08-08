import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  // We can warn but still allow initialization if it relies on environment fallback.
  console.warn('Warning: GEMINI_API_KEY is not defined in the environment.');
}

export const ai = new GoogleGenAI({ apiKey });
