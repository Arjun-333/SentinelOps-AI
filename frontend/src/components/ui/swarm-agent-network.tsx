import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Cpu, Database, Zap, Compass, Activity } from "lucide-react";

interface AgentNode {
  id: string;
  name: string;
  role: string;
  status: "nominal" | "active" | "error";
  cpu: string;
  memory: string;
  details: string;
  icon: React.ComponentType<any>;
  x: number;
  y: number;
}

export const SwarmAgentNetwork: React.FC<{ isThreat?: boolean; activeAgentName?: string }> = ({ 
  isThreat = false,
  activeAgentName = "none"
}) => {
  const [selectedNode, setSelectedNode] = useState<string>("orchestrator");

  const isAgentActive = (nodeId: string): boolean => {
    const nameLower = activeAgentName.toLowerCase();
    if (nodeId === "orchestrator" && nameLower.includes("orchestrator")) return true;
    if (nodeId === "telemetry" && nameLower.includes("telemetry")) return true;
    if (nodeId === "rca" && (nameLower.includes("root cause") || nameLower.includes("rca"))) return true;
    if (nodeId === "remediator" && (nameLower.includes("remed") || nameLower.includes("postmortem") || nameLower.includes("resolution"))) return true;
    if (nodeId === "rag" && (nameLower.includes("rag") || nameLower.includes("retriev") || nameLower.includes("memory"))) return true;
    return false;
  };

  // Synchronize selected node to active agent if it changes
  useEffect(() => {
    if (activeAgentName && activeAgentName !== "none") {
      const nameLower = activeAgentName.toLowerCase();
      if (nameLower.includes("orchestrator")) setSelectedNode("orchestrator");
      else if (nameLower.includes("telemetry")) setSelectedNode("telemetry");
      else if (nameLower.includes("root cause") || nameLower.includes("rca")) setSelectedNode("rca");
      else if (nameLower.includes("remed") || nameLower.includes("postmortem") || nameLower.includes("resolution")) setSelectedNode("remediator");
      else if (nameLower.includes("rag") || nameLower.includes("retriev") || nameLower.includes("memory")) setSelectedNode("rag");
    }
  }, [activeAgentName]);

  const nodes: AgentNode[] = [
    {
      id: "orchestrator",
      name: "Swarm Orchestrator",
      role: "Task Dispatcher & LangGraph Coordinator",
      status: isThreat ? "active" : "nominal",
      cpu: isThreat ? "74%" : "12%",
      memory: "184 MB",
      details: "Actively monitoring cluster alerts, coordinating microservice regression traces, and dispatching remediation commands.",
      icon: Compass,
      x: 250,
      y: 40,
    },
    {
      id: "telemetry",
      name: "Telemetry Monitor",
      role: "Real-time Metrics Analyzer",
      status: isThreat ? "active" : "nominal",
      cpu: isThreat ? "92%" : "8%",
      memory: "94 MB",
      details: "Ingesting raw node performance logs, monitoring pool connection limits, and feeding alert metrics back to orchestrator.",
      icon: Activity,
      x: 410,
      y: 110,
    },
    {
      id: "rca",
      name: "RCA Solver",
      role: "Git Regression Tracer",
      status: isThreat ? "error" : "nominal",
      cpu: isThreat ? "88%" : "2%",
      memory: "256 MB",
      details: "Analyzing transaction stack traces and git diff records to isolate broken thread pools and OOM heap issues.",
      icon: Cpu,
      x: 350,
      y: 220,
    },
    {
      id: "remediator",
      name: "Remedy Dispatcher",
      role: "Automated Script Executor",
      status: isThreat ? "active" : "nominal",
      cpu: isThreat ? "65%" : "1%",
      memory: "64 MB",
      details: "Compiling containment playbooks, purging database connection locks, and triggering roll-backs of faulty docker images.",
      icon: Zap,
      x: 150,
      y: 220,
    },
    {
      id: "rag",
      name: "RAG Memory Node",
      role: "Vector Knowledge Base",
      status: "nominal",
      cpu: "4%",
      memory: "512 MB",
      details: "Retrieving historical runbooks, correlation logs, and pre-audited fix configurations from vector database index.",
      icon: Database,
      x: 90,
      y: 110,
    },
  ];

  const connections = [
    { from: "orchestrator", to: "telemetry" },
    { from: "orchestrator", to: "rag" },
    { from: "telemetry", to: "rca" },
    { from: "rca", to: "remediator" },
    { from: "remediator", to: "orchestrator" },
    { from: "rag", to: "rca" },
  ];

  const activeNode = nodes.find((n) => n.id === selectedNode) || nodes[0];

  return (
    <div className="w-full h-full grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch min-h-[300px]">
      
      {/* Interactive Topology Graph Map */}
      <div className="md:col-span-8 relative border border-white/[0.04] bg-black/40 rounded-xl overflow-hidden min-h-[250px] flex items-center justify-center">
        
        {/* Animated grid radar rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-64 h-64 border border-white/[0.02] rounded-full animate-ping [animation-duration:8s]"></div>
          <div className="w-[450px] h-[450px] border border-white/[0.01] rounded-full absolute"></div>
        </div>

        <svg className="w-full h-full absolute inset-0 z-10" viewBox="0 0 500 260" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--threat-primary)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="var(--cyber-blue)" stopOpacity="0.1" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Connection Lines */}
          {connections.map((conn, idx) => {
            const fromNode = nodes.find((n) => n.id === conn.from)!;
            const toNode = nodes.find((n) => n.id === conn.to)!;
            return (
              <g key={idx}>
                {/* Background Shadow Line */}
                <line
                  x1={fromNode.x}
                  y1={fromNode.y}
                  x2={toNode.x}
                  y2={toNode.y}
                  stroke="var(--threat-border)"
                  strokeWidth="1"
                  strokeOpacity="0.3"
                />
                {/* Active Flow Line */}
                <line
                  x1={fromNode.x}
                  y1={fromNode.y}
                  x2={toNode.x}
                  y2={toNode.y}
                  stroke="url(#lineGrad)"
                  strokeWidth="1.5"
                  strokeDasharray="4 8"
                  className="animate-[neonGridMove_10s_linear_infinite]"
                />
                {/* Floating data packets */}
                <circle r="2.5" fill="var(--threat-primary)" filter="url(#glow)">
                  <animateMotion
                    dur={`${3 + (idx % 3)}s`}
                    repeatCount="indefinite"
                    path={`M ${fromNode.x} ${fromNode.y} L ${toNode.x} ${toNode.y}`}
                  />
                </circle>
              </g>
            );
          })}

          {/* Swarm Central Cognitive Hub Core */}
          <g transform="translate(250, 130)" className="cursor-pointer">
            <circle
              r="24"
              fill="rgba(var(--threat-primary-rgb), 0.05)"
              stroke="var(--threat-border)"
              strokeWidth="1.5"
              className={cn("animate-pulse", isThreat ? "stroke-cyber-red" : "")}
            />
            <circle
              r="14"
              fill="var(--cyber-bg)"
              stroke="var(--threat-primary)"
              strokeWidth="2"
              filter="url(#glow)"
              className="animate-spin [animation-duration:15s]"
              strokeDasharray="6 3"
            />
            <circle r="4" fill="var(--threat-primary)" />
          </g>

          {/* Interactive Agent Nodes */}
          {nodes.map((node) => {
            const Icon = node.icon;
            const isSelected = selectedNode === node.id;
            const isHighlighted = isAgentActive(node.id);
            const currentStatus = isHighlighted ? "active" : node.status;
            const statusColor =
              currentStatus === "error"
                ? "var(--cyber-red)"
                : currentStatus === "active"
                ? "var(--cyber-blue)"
                : "var(--threat-primary)";

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                className="cursor-pointer group"
                onClick={() => setSelectedNode(node.id)}
              >
                {/* Pulse Ring */}
                {(isSelected || isHighlighted) && (
                  <circle
                    r="18"
                    fill="none"
                    stroke={statusColor}
                    strokeWidth="1.5"
                    className="animate-ping [animation-duration:2s] opacity-75"
                  />
                )}
                {/* Main Orb Border */}
                <circle
                  r="14"
                  fill="var(--cyber-bg)"
                  stroke={isSelected ? "var(--threat-primary)" : "var(--threat-border)"}
                  strokeWidth={isSelected ? 2 : 1}
                  className="group-hover:stroke-white transition-colors duration-300"
                />
                {/* Node Center State indicator dot */}
                <circle
                  cx="10"
                  cy="-10"
                  r="3.5"
                  fill={currentStatus === "error" ? "var(--cyber-red)" : currentStatus === "active" ? "var(--cyber-blue)" : "var(--threat-primary)"}
                />
                {/* Inner Icon */}
                <g transform="translate(-6, -6) scale(0.55)">
                  <Icon className="text-white w-5 h-5" style={{ color: isSelected ? "white" : "var(--threat-primary)" }} />
                </g>
                {/* Label text */}
                <text
                  y="26"
                  textAnchor="middle"
                  fill="white"
                  className="text-[8.5px] font-mono select-none pointer-events-none tracking-wide font-semibold opacity-85 group-hover:opacity-100 group-hover:fill-cyber-green transition-all"
                >
                  {node.name.split(" ")[1] || node.name}
                </text>
              </g>
            );
          })}
        </svg>
        
        <div className="absolute top-3 left-3 bg-[#050508]/80 border border-white/[0.04] rounded-lg px-2 py-1 font-mono text-[9px] text-gray-500 uppercase tracking-widest pointer-events-none select-none">
          Swarm Plexus Grid
        </div>
      </div>

      {/* Selected Agent Metrics Telemetry Sidebar */}
      <div className="md:col-span-4 flex flex-col justify-between p-3 border border-white/[0.04] bg-black/60 rounded-xl font-mono text-xs">
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-start border-b border-white/[0.04] pb-1.5">
            <div>
              <span className="text-[10px] text-gray-500 block uppercase tracking-wider">Active Thread</span>
              <h3 className="font-bold text-white tracking-wide text-[12.5px]">{activeNode.name}</h3>
            </div>
            <span className={cn(
              "px-2 py-0.5 rounded-lg text-[9px] font-bold border uppercase tracking-wider",
              activeNode.status === "error" ? "bg-cyber-red/10 border-cyber-red/35 text-cyber-red" :
              activeNode.status === "active" ? "bg-cyber-blue/10 border-cyber-blue/20 text-cyber-blue" :
              "bg-cyber-green/10 border-cyber-green/20 text-cyber-green"
            )}>
              {activeNode.status}
            </span>
          </div>
          <span className="text-[10.5px] text-gray-400 italic font-mono leading-relaxed mt-1 block">
            "{activeNode.role}"
          </span>
          <p className="text-[11px] text-gray-400 leading-relaxed font-mono mt-1.5">
            {activeNode.details}
          </p>
        </div>

        <div className="flex flex-col gap-2.5 mt-3 pt-2 border-t border-white/[0.04]">
          <div className="grid grid-cols-2 gap-2 text-[10.5px]">
            <div className="bg-white/[0.01] border border-white/[0.02] p-1.5 rounded-lg">
              <span className="text-gray-500 block text-[8px] uppercase">Node CPU Load</span>
              <strong className="text-white block font-bold text-[11px] mt-0.5">{activeNode.cpu}</strong>
            </div>
            <div className="bg-white/[0.01] border border-white/[0.02] p-1.5 rounded-lg">
              <span className="text-gray-500 block text-[8px] uppercase">Memory Allocated</span>
              <strong className="text-white block font-bold text-[11px] mt-0.5">{activeNode.memory}</strong>
            </div>
          </div>
          <div className="text-[9.5px] text-gray-500 text-center italic bg-white/[0.01] p-1.5 rounded-lg border border-white/[0.02]">
            Click node in graph map to inspect thread metrics.
          </div>
        </div>

      </div>

    </div>
  );
};
