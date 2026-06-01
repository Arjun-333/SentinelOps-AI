// src/lib/assistant.ts
/**
 * Front‑end helper that talks to the FastAPI Gemini‑AI proxy.
 *
 * Exports two async functions used by `src/App.tsx`:
 *   - interpretVoice(transcript) → parses the voice transcript and returns
 *     the intent JSON from the backend.
 *   - askLLM(question) → sends a free‑form question to the LLM and returns
 *     a concise answer.
 *
 * Adjust BASE_URL if you run the backend on a custom port.
 */

import axios from "axios";

// Change the port if you started uvicorn on a different one.
const BASE_URL = "http://127.0.0.1:8000";

export async function interpretVoice(transcript: string) {
  try {
    const response = await axios.post(`${BASE_URL}/assistant/interpret`, {
      transcript,
    });
    return response.data; // {intent, params} or {error}
  } catch (err) {
    console.error("interpretVoice error:", err);
    throw err;
  }
}

export async function askLLM(question: string) {
  try {
    const response = await axios.post(`${BASE_URL}/assistant/query`, {
      question,
    });
    return response.data; // {answer}
  } catch (err) {
    console.error("askLLM error:", err);
    throw err;
  }
}
