import { useState, useEffect, useRef } from "react";
import { 
  Play, 
  CheckCircle, 
  RefreshCw, 
  AlertTriangle, 
  Search, 
  Database, 
  FileText, 
  Terminal, 
  Activity, 
  Cpu, 
  Copy, 
  Clock, 
  ChevronRight, 
  Network,
  Info,
  Mic,
  MicOff,
  Volume2,
  VolumeX
} from "lucide-react";
import { cn } from "@/lib/utils";
import { interpretVoice, askLLM } from "@/lib/assistant";
import { LimelightNav } from "@/components/ui/limelight-nav";
import { PixelLogoGrid } from "@/components/ui/pixel-logo-grid";
import { CpuArchitecture } from "@/components/ui/cpu-architecture";
import { SreBrain3d } from "@/components/ui/sre-brain-3d";
import { Spotlight } from "@/components/ui/spotlight";

interface IncidentScenario {
  id: string;
  name: string;
  severity: string;
  service: string;
  description: string;
}

interface Metric {
  cpu: number;
  memory: number;
  db_connections: number;
  latency: number;
  error_rate: number;
}

interface Alert {
  id: string;
  name: string;
  severity: string;
  service: string;
  description: string;
  triggered_at: string;
}

interface LogLine {
  timestamp: string;
  level: string;
  service: string;
  message: string;
}

interface SwarmConversation {
  agent: string;
  message: string;
  timestamp: string;
}

export default function App() {
  // Simulator State
  const [incidents, setIncidents] = useState<IncidentScenario[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>("DB_CONNECTION_EXHAUSTION");
  const [activeIncident, setActiveIncident] = useState<any>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [metrics, setMetrics] = useState<Record<string, Metric>>({});
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [isSimulatorPolling] = useState(true);

  // Swarm State
  const [swarmConversations, setSwarmConversations] = useState<SwarmConversation[]>([]);
  const [swarmStatus, setSwarmStatus] = useState<"idle" | "running" | "complete" | "error">("idle");
  const [, setActiveAgentNode] = useState<string>("none");
  const [activeAgentName, setActiveAgentName] = useState<string>("none");
  const [postmortemReport, setPostmortemReport] = useState<string>("");
  const [copied, setCopied] = useState(false);

  // Voice Assistance State
  const [isListening, setIsListening] = useState(false);
  const [voiceBriefingActive, setVoiceBriefingActive] = useState(true);
  const [voiceTextLog, setVoiceTextLog] = useState<string>("Professional vocal uplink active.");
  const recognitionRef = useRef<any>(null);
  
  // Ref to prevent repeat warnings on polling
  const spokenIncidentIdRef = useRef<string | null>(null);

  // Navigation index
  const [activeNavIndex, setActiveNavIndex] = useState(0);

  // Refs for auto-scroll
  const logTerminalRef = useRef<HTMLDivElement>(null);
  const swarmTerminalRef = useRef<HTMLDivElement>(null);

  // Load baseline incidents
  useEffect(() => {
    fetch("http://localhost:8000/api/incidents")
      .then(res => res.json())
      .then(data => {
        setIncidents(data);
        if (data.length > 0) {
          setSelectedIncidentId(data[0].id);
        }
      })
      .catch(err => console.error("Error fetching incidents", err));
  }, []);

  // Poll simulator status
  useEffect(() => {
    if (!isSimulatorPolling) return;
    
    const fetchStatus = () => {
      fetch("http://localhost:8000/api/simulator/status")
        .then(res => res.json())
        .then(data => {
          setActiveIncident(data.active_incident);
          setElapsedSeconds(data.elapsed_seconds);
          setMetrics(data.metrics);
          setAlerts(data.alerts);
          setLogs(data.logs);
        })
        .catch(err => console.error("Error polling simulator status", err));
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 1000);
    return () => clearInterval(interval);
  }, [isSimulatorPolling]);

  // Synchronize CSS root threat state
  useEffect(() => {
    const root = document.documentElement;
    if (activeIncident) {
      root.classList.add("threat-alert");
    } else {
      root.classList.remove("threat-alert");
    }
  }, [activeIncident]);

  // Speak professional SRE briefing on active incident changes (FIXED REPEATING POLLING BUG)
  useEffect(() => {
    if (activeIncident) {
      if (spokenIncidentIdRef.current !== activeIncident.id) {
        spokenIncidentIdRef.current = activeIncident.id;
        speakText(
          `System Alert. A critical incident has been detected affecting service ${activeIncident.service}. ` +
          `Fault profile is classified as ${activeIncident.name}. ` +
          `Diagnostic analysis is recommended to locate the root cause.`
        );
      }
    } else {
      if (spokenIncidentIdRef.current !== null) {
        spokenIncidentIdRef.current = null;
        speakText("Remote remedy deployed. All systems operating nominal SRE parameters.");
      }
    }
  }, [activeIncident]);

  // Auto-scroll logs & conversations
  useEffect(() => {
    if (logTerminalRef.current) {
      logTerminalRef.current.scrollTop = logTerminalRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    if (swarmTerminalRef.current) {
      swarmTerminalRef.current.scrollTop = swarmTerminalRef.current.scrollHeight;
    }
  }, [swarmConversations]);

  // High-End Professional Voice Synthesizer
  const speakText = (text: string) => {
    if (!voiceBriefingActive) return;
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    // Lower rate and slightly lower pitch for a calm, professional, high-end masculine cybernetic operations voice
    utterance.rate = 0.95;
    utterance.pitch = 0.88;
    
    const voices = window.speechSynthesis.getVoices();
    // Look for high-end professional system voices (Google US English Male or Microsoft Natural)
    const synthVoice = voices.find(v => 
      v.name.includes("Google US English Male") || 
      v.name.includes("Natural") || 
      v.name.includes("Male") || 
      v.lang.startsWith("en-US")
    );
    if (synthVoice) utterance.voice = synthVoice;
    
    window.speechSynthesis.speak(utterance);
  };

  // Voice Command Listener Initialization
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = "en-US";

      rec.onresult = (event: any) => {
        const resultIndex = event.resultIndex;
        const transcript = event.results[resultIndex][0].transcript.trim().toLowerCase();
        setVoiceTextLog(`Detected command: "${transcript}"`);
        processVoiceCommand(transcript);
      };

      rec.onerror = (e: any) => {
        console.error("Speech Recognition Error", e);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    } else {
      setVoiceTextLog("Speech recognition not supported in this browser.");
    }
  }, [incidents, selectedIncidentId, activeIncident]);

  // Toggle Voice Recognition
  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setVoiceTextLog("Voice uplink suspended.");
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        setVoiceTextLog("Uplink active. Awaiting voice instructions...");
        speakText("Uplink online. State your operations instruction.");
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Process SRE Audio Voice commands
  const processVoiceCommand = (command: string) => {
    if (command.includes("inject") || command.includes("trigger") || command.includes("crash")) {
      if (activeIncident) {
        speakText("Fault profile already active. Remediate active outage first.");
        return;
      }
      speakText("Initiating outage simulation profile.");
      handleTriggerIncident();
    } else if (command.includes("deploy") || command.includes("swarm") || command.includes("analyze")) {
      if (!activeIncident) {
        speakText("Telemetry nominal. Diagnostic swarm deployment bypassed.");
        return;
      }
      speakText("Deploying SRE swarm correlator nodes.");
      handleTriggerSwarm();
    } else if (command.includes("restart") || command.includes("resolve") || command.includes("remedy") || command.includes("rollback")) {
      if (!activeIncident) {
        speakText("All endpoints operating standard parameters.");
        return;
      }
      speakText("Remediating cluster configuration and rebooting nodes.");
      handleResolveIncident();
    } else if (command.includes("brief") || command.includes("explain") || command.includes("status")) {
      if (activeIncident) {
        speakText(`Warning. A critical ${activeIncident.name} incident is currently active. Impacted service is ${activeIncident.service}. System latencies are elevated.`);
      } else {
        speakText("Current status. Nominal parameters. Swarm is standing by.");
      }
    } else {
      setVoiceTextLog(`Unmapped instruction: "${command}"`);
    }
  };

  // Actions
  const handleTriggerIncident = () => {
    setSwarmConversations([]);
    setSwarmStatus("idle");
    setActiveAgentNode("none");
    setPostmortemReport("");

    fetch("http://localhost:8000/api/simulator/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ incident_id: selectedIncidentId })
    })
      .then(res => res.json())
      .then(data => {
        setActiveIncident(data.state.active_incident);
        setElapsedSeconds(data.state.elapsed_seconds);
        setMetrics(data.state.metrics);
        setAlerts(data.state.alerts);
        setLogs(data.state.logs);
      })
      .catch(err => console.error("Error triggering incident", err));
  };

  const handleResolveIncident = () => {
    fetch("http://localhost:8000/api/simulator/resolve", { method: "POST" })
      .then(res => res.json())
      .then(() => {
        setActiveIncident(null);
        setElapsedSeconds(0);
        setAlerts([]);
        setSwarmConversations(prev => [
          ...prev,
          {
            agent: "Orchestrator Node",
            message: "⚠️ Remediator node triggered. Cluster reboot in progress. Configuration parameters rolled back.",
            timestamp: new Date().toLocaleTimeString()
          }
        ]);
        setActiveAgentNode("none");
      })
      .catch(err => console.error("Error resolving incident", err));
  };

  const handleTriggerSwarm = () => {
    if (!activeIncident) return;
    
    setSwarmConversations([]);
    setSwarmStatus("running");
    setPostmortemReport("");
    speakText("Swarm agents online. Commencing automated log correlation search.");
    
    const eventSource = new EventSource("http://localhost:8000/api/swarm/analyze");
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.event === "swarm_init") {
        setSwarmConversations(prev => [...prev, {
          agent: "Orchestrator Swarm",
          message: data.message,
          timestamp: data.timestamp
        }]);
      } else if (data.event === "agent_active") {
        setActiveAgentNode(data.node);
        setActiveAgentName(data.agent);
      } else if (data.event === "agent_thought") {
        setSwarmConversations(prev => [...prev, {
          agent: data.agent,
          message: data.thought,
          timestamp: data.timestamp
        }]);
      } else if (data.event === "swarm_complete") {
        setSwarmStatus("complete");
        setPostmortemReport(data.postmortem);
        setActiveAgentNode("none");
        setActiveAgentName("none");
        
        // Voice summary of solution
        speakText("Diagnostic complete. Swarm root-cause identified and logged in incident postmortem panel.");
        
        eventSource.close();
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE stream error", err);
      eventSource.close();
      setSwarmStatus("error");
      speakText("Diagnostic stream interrupted.");
      setSwarmConversations(prev => [...prev, {
        agent: "Orchestrator Swarm",
        message: "❌ Diagnostic swarm analysis failed. Please verify API key availability and try again.",
        timestamp: new Date().toLocaleTimeString()
      }]);
    };
  };

  const handleCopyPostmortem = () => {
    navigator.clipboard.writeText(postmortemReport);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Get active service metrics helper
  const getActiveServiceMetrics = (): Metric => {
    if (!activeIncident || !metrics) {
      return { cpu: 4.8, memory: 78.4, db_connections: 3, latency: 15, error_rate: 0.0 };
    }
    const service = activeIncident.service;
    return metrics[service] || { cpu: 0, memory: 0, db_connections: 0, latency: 0, error_rate: 0 };
  };

  const activeMetrics = getActiveServiceMetrics();

  // Navigation item configurations
  const navItems = [
    { id: "dashboard", label: "OVERVIEW DECK", icon: <Activity /> },
    { id: "agents", label: "AGENT NETWORK", icon: <Network /> },
    { id: "telemetry", label: "TELEMETRY LOGS", icon: <Terminal /> },
    { id: "postmortem", label: "INCIDENT AUDITS", icon: <FileText /> }
  ];

  return (
    <div className="min-h-screen grid-bg p-4 flex flex-col gap-4 text-sm transition-colors duration-500 selection:bg-white/10">
      
      {/* 🚀 Header SRE Command Center */}
      <header className={cn(
        "glass-panel rounded-2xl p-4 flex flex-col md:flex-row justify-between items-center gap-4 shadow-2xl border transition-all duration-500",
        activeIncident ? "border-cyber-red/20 shadow-red-950/10" : "border-white/[0.04]"
      )}>
        <div className="flex items-center gap-4 w-full md:w-auto">
          {/* Canvas Interactive Grid Logo */}
          <PixelLogoGrid className="w-14 h-14 flex-shrink-0" isThreat={!!activeIncident} />
          <div>
            <h1 className="text-2xl font-bold tracking-wider text-white flex items-center gap-2">
              SENTINELOPS AI <span className="text-[10px] text-cyber-green font-mono font-normal px-2.5 py-0.5 bg-cyber-green/10 border border-cyber-green/20 rounded-md">SWARM DECK v1.2</span>
            </h1>
            <p className="text-xs text-gray-400 font-mono mt-0.5">Autonomous SRE Swarm & Cybernetic Telemetry Hub</p>
          </div>
        </div>

        {/* Limelight Navigation Bar */}
        <LimelightNav 
          items={navItems} 
          defaultActiveIndex={activeNavIndex} 
          onTabChange={setActiveNavIndex}
        />

        {/* Dynamic Alarm Header Status */}
        <div className="flex items-center gap-4 w-full md:w-auto justify-end">
          {activeIncident ? (
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-cyber-red/10 border border-cyber-red/35 text-cyber-red animate-pulse shadow-lg shadow-cyber-red/5">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-semibold font-mono tracking-wide text-xs">
                CRITICAL OUTAGE DETECTED ({elapsedSeconds}s)
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-cyber-green/10 border border-cyber-green/20 text-cyber-green shadow-lg shadow-cyber-green/5">
              <CheckCircle className="h-4 w-4" />
              <span className="font-semibold font-mono tracking-wide text-xs">SYSTEM TELEMETRY NOMINAL</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Dashboard Grid with Spotlights */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-grow items-stretch">
        
        {/* ==================== LEFT PANEL: Simulation Console & Telemetry ==================== */}
        <section className={cn(
          "flex flex-col gap-4 transition-all duration-300",
          activeNavIndex === 0 ? "lg:col-span-3 flex" : 
          activeNavIndex === 2 ? "lg:col-span-3 flex" : "hidden"
        )}>
          
          {/* Simulation Console Card */}
          <div className={cn("glass-panel threat-glow rounded-2xl p-4 flex flex-col gap-3 relative group overflow-hidden")}>
            <Spotlight size={250} />
            <h2 className="text-xs font-semibold tracking-widest text-white border-b border-white/[0.04] pb-2 flex items-center gap-2 uppercase font-mono relative z-10">
              <Activity className="h-4 w-4 text-cyber-green" /> Outage Control Deck
            </h2>
            
            <div className="flex flex-col gap-2 relative z-10">
              <label className="text-[11px] text-gray-400 font-mono">Incident Fault Profile</label>
              <select 
                value={selectedIncidentId} 
                onChange={(e) => setSelectedIncidentId(e.target.value)}
                disabled={activeIncident !== null}
                className="w-full bg-black/70 border border-white/[0.08] rounded-xl px-3 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-cyber-green transition-colors cursor-pointer"
              >
                {incidents.map(inc => (
                  <option key={inc.id} value={inc.id}>
                    [{inc.severity}] {inc.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2.5 mt-2 relative z-10">
              <button 
                onClick={handleTriggerIncident}
                disabled={activeIncident !== null}
                className="flex-1 flex justify-center items-center gap-2 bg-gradient-to-r from-cyber-red to-rose-600 hover:from-rose-500 hover:to-cyber-red disabled:from-zinc-950 disabled:to-zinc-950 disabled:text-zinc-700 disabled:border disabled:border-zinc-800/40 text-white font-bold py-2.5 px-3 rounded-xl shadow-xl shadow-cyber-red/10 hover:shadow-cyber-red/20 transition-all font-mono text-xs cursor-pointer active:scale-95 border-none"
              >
                <Play className="h-3 w-3" /> INJECT CRASH
              </button>
              
              <button 
                onClick={handleResolveIncident}
                disabled={activeIncident === null}
                className="flex justify-center items-center gap-2 bg-cyber-green/10 hover:bg-cyber-green/20 border border-cyber-green/30 disabled:border-zinc-900 disabled:text-zinc-700 disabled:bg-transparent text-cyber-green font-bold py-2.5 px-4 rounded-xl transition-all font-mono text-xs cursor-pointer active:scale-95"
              >
                <RefreshCw className="h-3.5 w-3.5" /> REMEDY
              </button>
            </div>
          </div>

          {/* SRE VOICE COGNITIVE ASSISTANCE COMMAND CARD */}
          <div className="glass-panel threat-glow rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden group">
            <Spotlight size={250} />
            <h2 className="text-xs font-semibold tracking-widest text-white border-b border-white/[0.04] pb-2 flex items-center justify-between uppercase font-mono relative z-10">
              <span className="flex items-center gap-2"><Mic className="h-4 w-4 text-cyber-green animate-pulse" /> SRE Professional Voice</span>
              <button 
                onClick={() => setVoiceBriefingActive(!voiceBriefingActive)}
                className="text-[10px] text-gray-500 hover:text-white transition-colors"
                title="Toggle vocal briefings"
              >
                {voiceBriefingActive ? <Volume2 className="h-3.5 w-3.5 text-cyber-green" /> : <VolumeX className="h-3.5 w-3.5 text-gray-600" />}
              </button>
            </h2>

            <div className="flex flex-col gap-3 relative z-10 justify-between flex-grow">
              <div className="p-3 bg-black/60 rounded-xl border border-white/[0.04] font-mono text-[11px] text-gray-400 leading-normal min-h-[56px] flex flex-col justify-center">
                <span className="text-cyber-green font-bold text-[9px] uppercase tracking-wider block mb-1">Telemetry uplink log</span>
                <span className="line-clamp-2">{voiceTextLog}</span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={toggleListening}
                  className={cn(
                    "flex-1 flex justify-center items-center gap-2 font-mono font-bold text-xs py-2.5 px-3 rounded-xl transition-all cursor-pointer border",
                    isListening 
                      ? "bg-cyber-green/20 border-cyber-green/60 text-cyber-green animate-pulse shadow-lg shadow-cyber-green/10" 
                      : "bg-black/40 hover:bg-black/60 border-white/[0.06] text-gray-400 hover:text-white"
                  )}
                >
                  {isListening ? (
                    <>
                      <MicOff className="h-3.5 w-3.5" /> DISCONNECT VOICE
                    </>
                  ) : (
                    <>
                      <Mic className="h-3.5 w-3.5" /> CONNECT VOICE
                    </>
                  )}
                </button>
              </div>

              <div className="text-[10px] text-gray-500 font-mono bg-white/[0.01] p-2 rounded-lg border border-white/[0.02]">
                <span className="font-bold text-white block mb-0.5">Hands-free verbal Briefs:</span>
                "inject crash" • "deploy swarm" • "restart system" • "explain incident"
              </div>
            </div>
          </div>

          {/* Service Telemetry Monitor Card */}
          <div className="glass-panel threat-glow rounded-2xl p-4 flex flex-col gap-3 flex-grow relative overflow-hidden group">
            <Spotlight size={300} />
            <div className="flex justify-between items-center border-b border-white/[0.04] pb-2 relative z-10">
              <h2 className="text-xs font-semibold tracking-widest text-white flex items-center gap-2 uppercase font-mono">
                <Activity className="h-4 w-4 text-cyber-green animate-pulse" /> Telemetry stream
              </h2>
              {activeIncident && (
                <span className="text-[10px] text-cyber-green bg-cyber-green/10 border border-cyber-green/25 px-2 py-0.5 rounded-lg font-mono font-bold">
                  {activeIncident.service}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-3 py-2 flex-grow justify-around relative z-10">
              {/* CPU Radial Dial */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/[0.03] hover:border-white/[0.08] transition-all">
                <div className="flex items-center gap-2.5">
                  <Cpu className="h-4.5 w-4.5 text-cyber-green" />
                  <div>
                    <p className="text-[11px] font-semibold text-white font-mono">CPU Utilization</p>
                    <p className="text-[9px] text-gray-500">cgroup scheduler quota</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn(
                    "font-mono text-xs font-bold transition-all duration-300",
                    activeMetrics.cpu > 70 ? 'text-cyber-red glow-text-red scale-105 animate-pulse' : 'text-cyber-green'
                  )}>
                    {activeMetrics.cpu}%
                  </p>
                </div>
              </div>

              {/* Memory Usage Progress */}
              <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-black/40 border border-white/[0.03] hover:border-white/[0.08] transition-all">
                <div className="flex justify-between items-center text-[11px] font-semibold text-white font-mono">
                  <span className="flex items-center gap-2"><Network className="h-4 w-4 text-cyber-green" /> Heap Allocation</span>
                  <span className={activeMetrics.memory > 450 ? 'text-cyber-red glow-text-red animate-pulse' : 'text-cyber-green'}>{activeMetrics.memory} MB</span>
                </div>
                <div className="w-full h-2 bg-black rounded-full overflow-hidden border border-white/[0.02]">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      activeMetrics.memory > 450 ? 'bg-cyber-red' : activeMetrics.memory > 300 ? 'bg-cyber-amber' : 'bg-cyber-green'
                    )}
                    style={{ width: `${Math.min(100, (activeMetrics.memory / 512) * 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* DB Connections Pool Bar Chart */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/[0.03] hover:border-white/[0.08] transition-all">
                <div className="flex items-center gap-2.5">
                  <Database className="h-4.5 w-4.5 text-cyber-green" />
                  <div>
                    <p className="text-[11px] font-semibold text-white font-mono">Active DB Pools</p>
                    <p className="text-[9px] text-gray-500">HikariPool allocations</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn(
                    "font-mono text-xs font-bold transition-all duration-300",
                    activeMetrics.db_connections >= 90 ? 'text-cyber-red glow-text-red animate-pulse' : 'text-cyber-green'
                  )}>
                    {activeMetrics.db_connections} / 100
                  </p>
                </div>
              </div>

              {/* API Response Latency Meter */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/[0.03] hover:border-white/[0.08] transition-all">
                <div className="flex items-center gap-2.5">
                  <Clock className="h-4.5 w-4.5 text-cyber-green" />
                  <div>
                    <p className="text-[11px] font-semibold text-white font-mono">API Latency</p>
                    <p className="text-[9px] text-gray-500">99th percentile response</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn(
                    "font-mono text-xs font-bold transition-all duration-300",
                    activeMetrics.latency > 1000 ? 'text-cyber-red glow-text-red animate-pulse' : 'text-cyber-green'
                  )}>
                    {activeMetrics.latency >= 1000 ? `${(activeMetrics.latency / 1000).toFixed(1)}s` : `${activeMetrics.latency.toFixed(0)}ms`}
                  </p>
                </div>
              </div>

              {/* Route Error Rate */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/[0.03] hover:border-white/[0.08] transition-all">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="h-4.5 w-4.5 text-cyber-green" />
                  <div>
                    <p className="text-[11px] font-semibold text-white font-mono">Nginx Error Rate</p>
                    <p className="text-[9px] text-gray-500">HTTP 5xx status codes</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn(
                    "font-mono text-xs font-bold transition-all duration-300",
                    activeMetrics.error_rate > 5.0 ? 'text-cyber-red glow-text-red animate-pulse' : 'text-cyber-green'
                  )}>
                    {activeMetrics.error_rate.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==================== MIDDLE PANEL: Swarm Node network & Chat dialogues ==================== */}
        <section className={cn(
          "flex flex-col gap-4 transition-all duration-300",
          activeNavIndex === 0 ? "lg:col-span-5 flex" :
          activeNavIndex === 1 ? "lg:col-span-12 flex" : "hidden"
        )}>
          
          {/* Interactive SRE Swarm Brain 3D Topology */}
          <div className="glass-panel threat-glow rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden group">
            <Spotlight size={300} />
            <h2 className="text-xs font-semibold tracking-widest text-white border-b border-white/[0.04] pb-2 flex items-center gap-2 uppercase font-mono relative z-10">
              <Network className="h-4 w-4 text-cyber-green" /> Cybernetic Topology Swarm
            </h2>

            <div className="relative h-64 rounded-xl border border-white/[0.04] overflow-hidden z-10">
              {/* Overhauled interactive 360-degree drag brain */}
              <SreBrain3d className="absolute inset-0 w-full h-full" isThreat={!!activeIncident} />

              {/* Active Agent node correlations tag */}
              {swarmStatus === "running" && activeAgentName !== "none" && (
                <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-[#050508]/90 border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs animate-pulse">
                  <div className="h-2 w-2 rounded-full bg-cyber-green animate-ping"></div>
                  <span className="text-gray-400 font-mono">Cognitive solver: <strong className="text-white">{activeAgentName}</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* Live Swarm Conversation Card */}
          <div className="glass-panel threat-glow rounded-2xl p-4 flex flex-col gap-3 flex-grow overflow-hidden min-h-[300px] relative">
            <Spotlight size={350} />
            <div className="flex justify-between items-center border-b border-white/[0.04] pb-2 relative z-10">
              <h2 className="text-xs font-semibold tracking-widest text-white flex items-center gap-2 uppercase font-mono">
                <Terminal className="h-4 w-4 text-cyber-green" /> Agent Swarm Comms Link
              </h2>
              
              {swarmStatus === "idle" && activeIncident && (
                <button 
                  onClick={handleTriggerSwarm}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-cyber-green hover:bg-emerald-600 text-white font-bold rounded-xl shadow-xl shadow-cyber-green/10 hover:shadow-cyber-green/20 transition-all font-mono text-xs cursor-pointer active:scale-95 border-none"
                >
                  <Network className="h-3.5 w-3.5" /> DEPLOY SWARM
                </button>
              )}
            </div>

            <div 
              ref={swarmTerminalRef}
              className="flex-grow overflow-y-auto pr-1 flex flex-col gap-3 min-h-[180px] relative z-10"
            >
              {swarmConversations.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500 font-mono text-xs">
                  <Network className="h-10 w-10 text-gray-800 mb-2 animate-pulse" />
                  <p className="font-bold text-gray-400">Swarm Telemetry Standby.</p>
                  {activeIncident ? (
                    <p className="text-cyber-green mt-1.5">Click [DEPLOY SWARM] above or speak "deploy swarm" to begin analysis.</p>
                  ) : (
                    <p className="text-cyber-red mt-1.5">Please inject an outage fault to activate swarm node communications.</p>
                  )}
                </div>
              ) : (
                swarmConversations.map((msg, idx) => {
                  let speakerColor = "border-cyber-green/30 bg-cyber-green/5 text-cyber-green";
                  let avatarIcon = <Activity className="h-3 w-3" />;
                  
                  if (msg.agent.includes("Monitoring")) {
                    speakerColor = "border-cyber-green/30 bg-cyber-green/5 text-cyber-green";
                  } else if (msg.agent.includes("Root Cause")) {
                    speakerColor = "border-cyber-red/30 bg-cyber-red/5 text-cyber-red";
                    avatarIcon = <Search className="h-3 w-3" />;
                  } else if (msg.agent.includes("Retrieval")) {
                    speakerColor = "border-cyber-amber/30 bg-cyber-amber/5 text-cyber-amber";
                    avatarIcon = <Database className="h-3 w-3" />;
                  } else if (msg.agent.includes("Postmortem")) {
                    speakerColor = "border-emerald-500/30 bg-emerald-500/5 text-emerald-500";
                    avatarIcon = <FileText className="h-3 w-3" />;
                  }

                  return (
                    <div 
                      key={idx} 
                      className="animate-message-slide border border-white/[0.02] bg-black/50 p-3.5 rounded-xl flex flex-col gap-2 shadow-inner"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className={cn("p-1 rounded border", speakerColor)}>
                            {avatarIcon}
                          </span>
                          <span className="font-bold text-white font-mono text-xs">{msg.agent}</span>
                        </div>
                        <span className="text-[10px] text-gray-500 font-mono flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" /> {msg.timestamp}
                        </span>
                      </div>
                      <p className="text-gray-300 font-mono text-xs whitespace-pre-wrap leading-relaxed">
                        {msg.message}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

        {/* ==================== RIGHT PANEL: Real-time logs & Markdown SRE Postmortem ==================== */}
        <section className={cn(
          "flex flex-col gap-4 transition-all duration-300",
          activeNavIndex === 0 ? "lg:col-span-4 flex" :
          activeNavIndex === 2 ? "lg:col-span-9 flex" :
          activeNavIndex === 3 ? "lg:col-span-12 flex" : "hidden"
        )}>
          
          {/* Active alerts warning notification banner */}
          {alerts.length > 0 && (
            <div className="bg-cyber-red/10 border border-cyber-red/25 rounded-2xl p-4 flex gap-3 shadow-xl shadow-cyber-red/5 animate-pulse relative overflow-hidden">
              <AlertTriangle className="h-6 w-6 text-cyber-red flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white font-mono text-xs">TELEMETRY ANOMALY WARNING</p>
                <p className="text-gray-300 font-mono text-[10px] leading-relaxed mt-1">{alerts[0].description}</p>
              </div>
            </div>
          )}

          {/* Live system logs terminal Card */}
          <div className={cn(
            "glass-panel threat-glow rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden",
            activeNavIndex === 2 ? "h-full min-h-[500px]" : "h-1/2 min-h-[220px]"
          )}>
            <Spotlight size={300} />
            <div className="flex justify-between items-center border-b border-white/[0.04] pb-2 relative z-10">
              <h2 className="text-xs font-semibold tracking-widest text-white flex items-center gap-2 uppercase font-mono">
                <Terminal className="h-4 w-4 text-cyber-green" /> Live Telemetry Log Feed
              </h2>
              <span className="text-[10px] text-gray-600 font-mono">100 lines/sec</span>
            </div>

            <div 
              ref={logTerminalRef}
              className="flex-grow code-terminal rounded-xl p-3 overflow-y-auto pr-1 flex flex-col gap-1.5 font-mono text-[10px] relative z-10"
            >
              {logs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center text-gray-600 font-mono text-[10px]">
                  Awaiting telemetry cluster streaming node link...
                </div>
              ) : (
                logs.map((log, idx) => {
                  let color = "text-gray-500";
                  if (log.level === "ERROR" || log.level === "CRITICAL") {
                    color = "text-red-400 glow-text-red font-semibold";
                  } else if (log.level === "WARN") {
                    color = "text-amber-400";
                  } else if (log.level === "INFO") {
                    color = "text-emerald-400/80";
                  }

                  return (
                    <div key={idx} className={`${color} leading-relaxed py-0.5 border-b border-white/[0.01]`}>
                      <span className="text-gray-600 font-mono">[{log.timestamp}]</span>{" "}
                      <span className="font-bold">[{log.level}]</span>{" "}
                      <span className="text-emerald-500/70">{log.service}:</span> {log.message}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* markdown postmortem reader Card */}
          <div className={cn(
            "glass-panel threat-glow rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden",
            activeNavIndex === 3 ? "h-full min-h-[500px]" : "h-1/2 min-h-[220px]"
          )}>
            <Spotlight size={300} />
            <div className="flex justify-between items-center border-b border-white/[0.04] pb-2 relative z-10">
              <h2 className="text-xs font-semibold tracking-widest text-white flex items-center gap-2 uppercase font-mono">
                <FileText className="h-4 w-4 text-cyber-green" /> Swarm Postmortem Audit
              </h2>
              
              {postmortemReport && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => speakText(postmortemReport.replace(/[#*|`-]/g, ""))}
                    className="flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1 rounded-lg border border-white/[0.08] text-cyber-green hover:text-white hover:bg-white/[0.02] bg-black/40 cursor-pointer"
                  >
                    <Volume2 className="h-3 w-3" /> Audio Brief
                  </button>
                  <button 
                    onClick={handleCopyPostmortem}
                    className="flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1 rounded-lg border border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.02] bg-black/40 cursor-pointer"
                  >
                    <Copy className="h-3 w-3" /> {copied ? "Copied!" : "Copy Markdown"}
                  </button>
                </div>
              )}
            </div>

            <div className="flex-grow overflow-y-auto code-terminal rounded-xl p-4 font-mono text-xs text-gray-300 leading-relaxed relative z-10">
              {postmortemReport ? (
                <div className="flex flex-col gap-3.5 select-text">
                  {postmortemReport.split("\n").map((line, idx) => {
                    if (line.startsWith("# ")) {
                      return <h1 key={idx} className="text-sm font-bold text-white tracking-wide border-b border-white/[0.04] pb-1 mt-2">{line.replace("# ", "")}</h1>;
                    }
                    if (line.startsWith("## ")) {
                      return <h2 key={idx} className="text-xs font-bold text-cyber-green mt-3 flex items-center gap-1"><ChevronRight className="h-3 w-3" /> {line.replace("## ", "")}</h2>;
                    }
                    if (line.startsWith("### ")) {
                      return <h3 key={idx} className="text-[11px] font-bold text-emerald-400 mt-2">{line.replace("### ", "")}</h3>;
                    }
                    if (line.startsWith("|") && line.includes("---")) {
                      return null; 
                    }
                    if (line.startsWith("|")) {
                      const cells = line.split("|").map(c => c.trim()).filter(Boolean);
                      const isHeader = line.includes("Parameter");
                      return (
                        <div key={idx} className={cn(
                          "grid grid-cols-2 p-1.5 border-b border-white/[0.02] font-mono text-[10px]",
                          isHeader ? 'bg-cyber-green/10 font-bold border-t border-b border-cyber-green/20 text-white rounded-lg' : ''
                        )}>
                          <span>{cells[0]}</span>
                          <span className={cells[1]?.includes("CRITICAL") ? "text-cyber-red font-bold animate-pulse" : cells[1]?.includes("HIGH") ? "text-cyber-amber font-bold" : "text-gray-300"}>{cells[1]}</span>
                        </div>
                      );
                    }
                    if (line.includes("```python") || line.includes("```javascript") || line.includes("```")) {
                      return null;
                    }
                    if (line.trim().startsWith("-") || line.trim().startsWith("*")) {
                      return <li key={idx} className="list-none pl-4 relative before:content-['-'] before:absolute before:left-0 before:text-cyber-green font-mono text-xs">{line.substring(2)}</li>;
                    }
                    return <p key={idx} className="text-gray-300 leading-relaxed font-mono text-[11px]">{line}</p>;
                  })}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500 font-mono text-xs">
                  <FileText className="h-10 w-10 text-gray-800 mb-2 animate-pulse" />
                  <p className="font-bold text-gray-400">Postmortem report stand-by.</p>
                  {swarmStatus === "running" ? (
                    <p className="text-cyber-green mt-1.5 animate-pulse">Postmortem Agent is drafting briefing report...</p>
                  ) : (
                    <p className="text-gray-600 mt-1.5">Deploy the swarm agent network to auto-generate postmortem audits.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Info Cyber Footer */}
      <footer className="glass-panel rounded-2xl p-4 flex flex-col md:flex-row justify-between items-center text-[10px] text-gray-500 font-mono gap-2 shadow-xl border border-white/[0.04]">
        <div className="flex items-center gap-2">
          <div className="w-16 h-8 opacity-75">
            <CpuArchitecture text="SRE" animateLines animateMarkers />
          </div>
          <span className="flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5 text-cyber-green animate-pulse" /> SentinelOps SRE platform runs fully offline using local RAG runbooks.
          </span>
        </div>
        <span>© 2026 SentinelOps AI • pair-programmed by Google Deepmind AI</span>
      </footer>
    </div>
  );
}
