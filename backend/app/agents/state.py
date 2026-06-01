from typing import TypedDict, List, Dict, Any, Optional

class AgentSwarmState(TypedDict):
    # Incident Telemetry Context
    incident_id: str
    incident_name: str
    severity: str
    service: str
    description: str
    
    # Active System Signals
    metrics: Dict[str, Any]
    logs: List[Dict[str, Any]]
    alerts: List[Dict[str, Any]]
    
    # Agent Analysis Results
    detection_report: Optional[Dict[str, Any]]
    rca_report: Optional[Dict[str, Any]]
    retrieved_docs: Optional[List[Dict[str, Any]]]
    remediation_plan: Optional[str]
    postmortem_report: Optional[str]
    
    # Swarm Graph Control Flow
    next_step: str
    agent_conversations: List[Dict[str, Any]] # Logs of agent dialogues: {"agent": str, "message": str, "timestamp": str}
    rca_confidence: float # 0.0 to 1.0, determines if we need Retrieval Agent
