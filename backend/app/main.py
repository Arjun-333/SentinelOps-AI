from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from typing import Dict, Any
from app.config import Config
from app.simulator.engine import SimulatorEngine
from app.simulator.incidents import INCIDENT_SCENARIOS
from app.agents.graph import run_swarm_and_stream

app = FastAPI(
    title="SentinelOps AI - Multi-Agent DevOps SRE Swarm",
    description="Autonomous SRE agent swarm for real-time DevOps incident investigation, diagnosis, and recovery.",
    version="1.0.0"
)

# Allow CORS from React dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from assistant import router as assistant_router
app.include_router(assistant_router)

# Global instances
simulator = SimulatorEngine()

@app.get("/")
async def root():
    return {
        "status": "online",
        "system": "SentinelOps AI Multi-Agent Core",
        "incidents_available": len(INCIDENT_SCENARIOS)
    }

@app.get("/api/incidents")
async def list_incidents():
    # Return basic list of incidents for dashboard dropdown
    return [
        {
            "id": key,
            "name": val["name"],
            "severity": val["severity"],
            "service": val["service"],
            "description": val["description"]
        }
        for key, val in INCIDENT_SCENARIOS.items()
    ]

@app.get("/api/simulator/status")
async def get_simulator_status():
    return simulator.get_current_state()

@app.post("/api/simulator/trigger")
async def trigger_incident(payload: Dict[str, str] = Body(...)):
    incident_id = payload.get("incident_id")
    if not incident_id:
        raise HTTPException(status_code=400, detail="Missing incident_id parameter")
    
    success = simulator.trigger_incident(incident_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Incident scenario '{incident_id}' not found")
        
    return {
        "status": "triggered",
        "incident_id": incident_id,
        "state": simulator.get_current_state()
    }

@app.post("/api/simulator/resolve")
async def resolve_incident():
    had_active = simulator.active_incident_id is not None
    success = simulator.resolve_incident()
    
    return {
        "status": "resolved" if success else "no_active_incident",
        "had_active": had_active,
        "state": simulator.get_current_state()
    }

@app.get("/api/swarm/analyze")
async def stream_swarm_analysis():
    # Verify an incident is actively running before triggering the swarm
    state = simulator.get_current_state()
    if not state["active_incident"]:
        raise HTTPException(
            status_code=400, 
            detail="Cannot execute analysis swarm. No simulated incident is active. Please trigger an incident first."
        )

    # Return the SSE Streaming Response
    return StreamingResponse(
        run_swarm_and_stream(state),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

import os
import json
from typing import List, Tuple

RUNBOOKS_PATH = "/home/arjun/Desktop/PROJECTS/SentinelOps AI /backend/app/rag/runbooks.json"

@app.get("/api/runbooks")
async def get_runbooks():
    if not os.path.exists(RUNBOOKS_PATH):
        return []
    with open(RUNBOOKS_PATH, "r") as f:
        return json.load(f)

@app.post("/api/runbooks")
async def add_runbook(payload: Dict[str, Any] = Body(...)):
    required = ["id", "title", "category", "tags", "content"]
    for r in required:
        if r not in payload:
            raise HTTPException(status_code=400, detail=f"Missing required parameter '{r}'")
            
    runbooks = []
    if os.path.exists(RUNBOOKS_PATH):
        try:
            with open(RUNBOOKS_PATH, "r") as f:
                runbooks = json.load(f)
        except Exception:
            runbooks = []
            
    # Remove existing with same id if any (for updates)
    runbooks = [r for r in runbooks if r["id"] != payload["id"]]
    
    tags = payload["tags"]
    if isinstance(tags, str):
        tags = [t.strip() for t in tags.split(",") if t.strip()]
        
    runbooks.append({
        "id": payload["id"],
        "title": payload["title"],
        "category": payload["category"],
        "tags": tags,
        "content": payload["content"]
    })
    
    with open(RUNBOOKS_PATH, "w") as f:
        json.dump(runbooks, f, indent=4)
        
    return runbooks

@app.delete("/api/runbooks/{runbook_id}")
async def delete_runbook(runbook_id: str):
    if not os.path.exists(RUNBOOKS_PATH):
        raise HTTPException(status_code=404, detail="Runbooks database not found")
        
    with open(RUNBOOKS_PATH, "r") as f:
        runbooks = json.load(f)
        
    initial_len = len(runbooks)
    runbooks = [r for r in runbooks if r["id"] != runbook_id]
    
    if len(runbooks) == initial_len:
        raise HTTPException(status_code=404, detail=f"Runbook with ID '{runbook_id}' not found")
        
    with open(RUNBOOKS_PATH, "w") as f:
        json.dump(runbooks, f, indent=4)
        
    return {"status": "deleted", "id": runbook_id, "runbooks": runbooks}

@app.post("/api/rag/search")
async def rag_search(payload: Dict[str, Any] = Body(...)):
    query = payload.get("query", "")
    k = payload.get("k", 2)
    
    if not query:
        raise HTTPException(status_code=400, detail="Query parameter is required")
        
    from app.rag.vector_store import LocalVectorStore
    store = LocalVectorStore(RUNBOOKS_PATH)
    results = store.similarity_search_with_scores(query, k)
    
    formatted = []
    for score, doc in results:
        formatted.append({
            "score": float(score),
            "doc": doc
        })
    return formatted

@app.post("/api/incidents")
async def create_custom_incident(payload: Dict[str, Any] = Body(...)):
    incident_id = payload.get("id")
    name = payload.get("name")
    severity = payload.get("severity", "CRITICAL")
    service = payload.get("service")
    description = payload.get("description")
    logs = payload.get("logs", [])
    
    if not incident_id or not name or not service:
        raise HTTPException(status_code=400, detail="Missing required parameters id, name, or service")
        
    INCIDENT_SCENARIOS[incident_id] = {
        "id": incident_id,
        "name": name,
        "severity": severity,
        "service": service,
        "description": description,
        "clues": {
            "recent_deployments": [
                {
                    "version": "v1.0.0-custom",
                    "deployed_at": "1 minute ago",
                    "service": service,
                    "commit_id": "custom1",
                    "author": "Dashboard User",
                    "message": "Dynamic user-configured incident simulation injected.",
                    "diff": ""
                }
            ],
            "container_health": {
                "status": "Running",
                "restart_count": 0,
                "cpu_limit": "2000m",
                "memory_limit": "512Mi"
            }
        },
        "metric_behavior": {
            "cpu": {"base": 15.0, "anomalous": 88.0, "type": "spike"},
            "memory": {"base": 150.0, "anomalous": 460.0, "type": "growth"},
            "db_connections": {"base": 8.0, "anomalous": 95.0, "type": "spike"},
            "latency": {"base": 20.0, "anomalous": 1200.0, "type": "spike"},
            "error_rate": {"base": 0.0, "anomalous": 95.0, "type": "spike"}
        },
        "log_sequences": logs if logs else [
            f"[INFO] Initializing custom diagnostic session for {service}.",
            f"[WARN] Cluster metrics exceeding warnings bounds for resource quota.",
            f"[ERROR] Service {service} reported diagnostic handler crash."
        ],
        "remediation_docs": f"Dynamic user registered incident diagnostics. Ensure service settings are verified."
    }
    return {"status": "registered", "incident_id": incident_id}

