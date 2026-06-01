import os
import json
import httpx
from fastapi import FastAPI, Request

app = FastAPI()

# Load your OpenAI (or other provider) API key from .env or environment variables
LLM_ENDPOINT = "https://api.openai.com/v1/chat/completions"
LLM_KEY = os.getenv("OPENAI_API_KEY")

# Whitelist of intents that the front‑end may request
COMMAND_WHITELIST = {
    "inject_crash": {"fn": "trigger_incident", "params": ["incident_id"]},
    "deploy_swarm": {"fn": "trigger_swarm", "params": []},
    "resolve_incident": {"fn": "resolve_incident", "params": []},
    "status_report": {"fn": "fetch_status", "params": []},
    # Extend with more safe actions as needed
}

def parse_intent(response_text: str):
    """Expect the LLM to output a JSON object like:
       {"intent": "inject_crash", "params": {"incident_id": "DB_EXHAUST"}}
       If parsing fails we mark the intent as unknown.
    """
    try:
        return json.loads(response_text)
    except Exception:
        return {"intent": "unknown", "params": {}}

@app.post("/assistant/interpret")
async def interpret(request: Request):
    data = await request.json()
    transcript = data.get("transcript", "")

    # Prompt the LLM – keep temperature low for deterministic output
    payload = {
        "model": "gpt-4o-mini",
        "messages": [
            {"role": "system", "content": "You are a helpful SRE assistant. Return a JSON object with an 'intent' key and a 'params' dict. Only use intents that appear in the whitelist."},
            {"role": "user", "content": transcript}
        ],
        "temperature": 0.0
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            LLM_ENDPOINT,
            json=payload,
            headers={"Authorization": f"Bearer {LLM_KEY}"}
        )
    llm_output = resp.json()["choices"][0]["message"]["content"]
    parsed = parse_intent(llm_output)

    intent = parsed.get("intent")
    if intent not in COMMAND_WHITELIST:
        return {"error": "unrecognized_intent", "raw": llm_output}

    return {"intent": intent, "params": parsed.get("params", {})}

# Optional: a generic query endpoint for free‑form answers
@app.post("/assistant/query")
async def query(request: Request):
    data = await request.json()
    question = data.get("question", "")
    payload = {
        "model": "gpt-4o-mini",
        "messages": [
            {"role": "system", "content": "You are a concise SRE assistant. Answer the question in plain English without disclosing secrets."},
            {"role": "user", "content": question}
        ],
        "temperature": 0.2
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            LLM_ENDPOINT,
            json=payload,
            headers={"Authorization": f"Bearer {LLM_KEY}"}
        )
    answer = resp.json()["choices"][0]["message"]["content"]
    return {"answer": answer}
