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
