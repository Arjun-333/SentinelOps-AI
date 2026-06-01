# backend/assistant.py
import os
import json
from fastapi import APIRouter, Request

router = APIRouter(prefix="/assistant")

# Whitelist of intents that the front‑end may request
COMMAND_WHITELIST = {
    "inject_crash": {"fn": "trigger_incident", "params": ["incident_id"]},
    "deploy_swarm": {"fn": "trigger_swarm", "params": []},
    "resolve_incident": {"fn": "resolve_incident", "params": []},
    "status_report": {"fn": "fetch_status", "params": []},
}

def get_llm():
    openai_key = os.getenv("OPENAI_API_KEY")
    gemini_key = os.getenv("GEMINI_API_KEY")
    
    if openai_key:
        try:
            from langchain_openai import ChatOpenAI
            return ChatOpenAI(model="gpt-4o-mini", temperature=0.0, api_key=openai_key)
        except Exception:
            pass
            
    if gemini_key:
        try:
            from langchain_google_genai import ChatGoogleGenAI
            return ChatGoogleGenAI(model="gemini-1.5-flash", temperature=0.0, google_api_key=gemini_key)
        except Exception:
            pass
            
    return None

def parse_intent(response_text: str):
    """Expect the LLM to output a JSON object like:
       {"intent": "inject_crash", "params": {"incident_id": "DB_EXHAUST"}}
       If parsing fails we mark the intent as unknown.
    """
    try:
        text = response_text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()
        return json.loads(text)
    except Exception:
        return {"intent": "unknown", "params": {}}

def heuristic_interpret(transcript: str) -> dict:
    t = transcript.lower()
    if "inject" in t or "trigger" in t or "crash" in t or "simulate" in t:
        incident_id = "DB_CONNECTION_EXHAUSTION"
        if "memory" in t or "leak" in t or "auth" in t:
            incident_id = "AUTH_SERVICE_MEMORY_LEAK"
        elif "gateway" in t or "timeout" in t or "api" in t:
            incident_id = "API_GATEWAY_TIMEOUT"
        elif "env" in t or "config" in t or "missing" in t:
            incident_id = "MISSING_ENV_CONFIG"
        elif "disk" in t or "space" in t or "logger" in t or "exhaust" in t:
            incident_id = "DISK_SPACE_EXHAUSTION_LOGGER"
        return {"intent": "inject_crash", "params": {"incident_id": incident_id}}
    elif "deploy" in t or "swarm" in t or "analyze" in t:
        return {"intent": "deploy_swarm", "params": {}}
    elif "resolve" in t or "remedy" in t or "rollback" in t or "restart" in t:
        return {"intent": "resolve_incident", "params": {}}
    elif "status" in t or "report" in t or "brief" in t:
        return {"intent": "status_report", "params": {}}
    return {"intent": "unknown", "params": {}}

@router.post("/interpret")
async def interpret(request: Request):
    data = await request.json()
    transcript = data.get("transcript", "")

    llm = get_llm()
    if llm:
        try:
            prompt = (
                "You are a helpful SRE assistant. Return a JSON object with an 'intent' key and a 'params' dict.\n"
                f"Whitelist of allowed intents: {list(COMMAND_WHITELIST.keys())}\n"
                "Allowed incident IDs for inject_crash: ['DB_CONNECTION_EXHAUSTION', 'AUTH_SERVICE_MEMORY_LEAK', 'API_GATEWAY_TIMEOUT', 'MISSING_ENV_CONFIG', 'DISK_SPACE_EXHAUSTION_LOGGER']\n"
                f"Voice Transcript: '{transcript}'"
            )
            response = llm.invoke(prompt)
            parsed = parse_intent(response.content)
            
            intent = parsed.get("intent")
            if intent in COMMAND_WHITELIST:
                return {"intent": intent, "params": parsed.get("params", {})}
        except Exception:
            pass
            
    # Fallback to local heuristic parsing
    return heuristic_interpret(transcript)

@router.post("/query")
async def query(request: Request):
    data = await request.json()
    question = data.get("question", "")
    
    llm = get_llm()
    if llm:
        try:
            prompt = f"You are a concise SRE assistant. Answer the question in plain English without disclosing secrets. Question: {question}"
            response = llm.invoke(prompt)
            return {"answer": response.content}
        except Exception as e:
            return {"answer": f"Error running LLM query: {str(e)}"}
            
    # Smart local conversational dialog fallbacks
    q = question.lower()
    if "your name" in q or "who are you" in q:
        return {"answer": "I am Sentinel, your Site Reliability Swarm coordinator. I am built to monitor and resolve infrastructure anomalies."}
    elif "hello" in q or "hi" in q or "hey" in q:
        return {"answer": "Hello. Operations uplink is nominal. How can I assist you with the cluster today?"}
    elif "arjun" in q:
        return {"answer": "Arjun R is the lead systems architect of the SentinelOps AI platform."}
    elif "theme" in q:
        return {"answer": "I support five operational themes: Cyber Obsidian, Nebula Abyss, Crimson Protocol, Matrix Code, and Solar Flare. You can change them in the visual settings."}
    elif "how are you" in q:
        return {"answer": "My cores are running at nominal temperatures. All diagnostic sub-systems are operating at maximum capacity."}
        
    return {"answer": "Voice instruction logged. SRE command center standing by."}
