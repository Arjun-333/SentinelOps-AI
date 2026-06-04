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
  VolumeX,
  Palette
} from "lucide-react";
import { cn } from "@/lib/utils";

import { LimelightNav } from "@/components/ui/limelight-nav";
import { PixelLogoGrid } from "@/components/ui/pixel-logo-grid";
import { CpuArchitecture } from "@/components/ui/cpu-architecture";
import { SwarmAgentNetwork } from "@/components/ui/swarm-agent-network";
import { SreRobot3d } from "@/components/ui/sre-robot-3d";
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

  // SSH simulation state
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [terminalActive, setTerminalActive] = useState(false);

  // Metrics history state
  const [metricsHistory, setMetricsHistory] = useState<any[]>(
    Array.from({ length: 15 }, () => ({
      cpu: 12,
      memory: 80,
      db_connections: 8,
      latency: 15,
      error_rate: 0
    }))
  );

  // Custom Incident Configurator State
  const [showCustomConfigurator, setShowCustomConfigurator] = useState(false);
  const [customIncident, setCustomIncident] = useState({
    id: "",
    name: "",
    severity: "CRITICAL",
    service: "",
    description: "",
    logs: ""
  });
  const [customIncidentStatus, setCustomIncidentStatus] = useState("");

  // RAG Runbooks Manager State
  const [runbooks, setRunbooks] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [newRunbook, setNewRunbook] = useState({
    id: "",
    title: "",
    category: "Runbook",
    tags: "",
    content: ""
  });
  const [selectedRunbook, setSelectedRunbook] = useState<any>(null);
  const [runbookActionStatus, setRunbookActionStatus] = useState("");

  useEffect(() => {
    fetch("http://localhost:8000/api/runbooks")
      .then(res => res.json())
      .then(data => {
        setRunbooks(data);
        if (data.length > 0) {
          setSelectedRunbook(data[0]);
        }
      })
      .catch(err => console.error("Error fetching runbooks", err));
  }, []);

  // Voice Assistance State
  const [isListening, setIsListening] = useState(false);
  const [voiceBriefingActive, setVoiceBriefingActive] = useState(true);
  const [voiceTextLog, setVoiceTextLog] = useState<string>("Professional vocal uplink active.");
  const recognitionRef = useRef<any>(null);
  
  // Ref to prevent repeat warnings on polling
  const spokenIncidentIdRef = useRef<string | null>(null);

  // Navigation index
  const [activeNavIndex, setActiveNavIndex] = useState(0);

  // Theme state and sync persistence
  const [theme, setTheme] = useState<"obsidian" | "nebula" | "crimson" | "matrix" | "amber">(() => {
    const saved = localStorage.getItem("sentinelops-theme");
    return (saved === "obsidian" || saved === "nebula" || saved === "crimson" || saved === "matrix" || saved === "amber") ? saved : "obsidian";
  });

  useEffect(() => {
    document.documentElement.classList.remove(
      "theme-obsidian",
      "theme-nebula",
      "theme-crimson",
      "theme-matrix",
      "theme-amber"
    );
    document.documentElement.classList.add(`theme-${theme}`);
    localStorage.setItem("sentinelops-theme", theme);
  }, [theme]);

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
          setMetricsHistory(prev => {
            const next = [...prev, data.metrics];
            if (next.length > 15) return next.slice(next.length - 15);
            return next;
          });
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
    if (!voiceBriefingActiveRef.current) return;
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    // Lower rate and deep pitch shift (0.58) for a resonant, masculine cybernetic computer voice
    utterance.rate = 0.90;
    utterance.pitch = 0.58;
    
    const voices = window.speechSynthesis.getVoices();
    // Print voice inventory to console for diagnostic checks
    console.log("Available Speech Voices:", voices.map(v => `${v.name} (${v.lang})`));

    // Prioritize masculine profiles (David, Google US English Male, Guy, George, etc.)
    const synthVoice = voices.find(v => {
      const name = v.name.toLowerCase();
      return name.includes("male") || name.includes("david") || name.includes("guy") || name.includes("george");
    }) || voices.find(v => v.lang.toLowerCase().startsWith("en-us")) || voices.find(v => v.lang.toLowerCase().startsWith("en")) || voices[0];
    
    if (synthVoice) utterance.voice = synthVoice;
    
    window.speechSynthesis.speak(utterance);
  };

  // Voice Command Listener Initialization
  const processVoiceCommandRef = useRef(processVoiceCommand);
  useEffect(() => {
    processVoiceCommandRef.current = processVoiceCommand;
  }, [processVoiceCommand]);

  const isListeningRef = useRef(isListening);
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  const voiceBriefingActiveRef = useRef(voiceBriefingActive);
  useEffect(() => {
    voiceBriefingActiveRef.current = voiceBriefingActive;
  }, [voiceBriefingActive]);

  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const handleUserGesture = () => {
      if (audioContextRef.current && audioContextRef.current.state === "suspended") {
        audioContextRef.current.resume().then(() => {
          console.log("AudioContext resumed successfully on user gesture.");
        });
      }
    };
    window.addEventListener("click", handleUserGesture);
    window.addEventListener("keydown", handleUserGesture);
    return () => {
      window.removeEventListener("click", handleUserGesture);
      window.removeEventListener("keydown", handleUserGesture);
    };
  }, []);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = navigator.language || "en-US";

      rec.onresult = (event: any) => {
        const resultIndex = event.resultIndex;
        const transcript = event.results[resultIndex][0].transcript.trim().toLowerCase();
        
        if (isListeningRef.current) {
          setVoiceTextLog(`Detected command: "${transcript}"`);
          processVoiceCommandRef.current(transcript);
        } else {
          // Silent Wake Word monitoring mode (phonetically tolerant to Sentinel, Central, Centinal, etc.)
          const isWake = ["sentinel", "sentinal", "central", "centinal", "centinel", "activate", "online"].some(k => transcript.includes(k));
          if (isWake) {
            triggerSentinelUplink("Sentinel wake word detected. Uplink established.");
          }
        }
      };

      let errorCount = 0;
      rec.onerror = (e: any) => {
        console.error("Speech Recognition Error", e);
        errorCount++;
        if (e.error === "not-allowed") {
          setVoiceTextLog("Mic permission denied. Use manual command input below.");
        } else if (e.error === "network") {
          setVoiceTextLog("Speech network fault. Use manual command input below.");
        } else {
          setVoiceTextLog(`Voice offline (${e.error}). Use manual command input.`);
        }
      };

      rec.onend = () => {
        // Only attempt restart if we haven't hit a series of consecutive errors
        if (errorCount < 3) {
          setTimeout(() => {
            try {
              rec.start();
            } catch (err) {
              // Already listening
            }
          }, 1000);
        } else {
          console.warn("Speech Recognition aborted: too many consecutive errors.");
        }
      };

      try {
        rec.start();
      } catch (err) {
        console.error("Failed to start SpeechRecognition on load:", err);
      }

      recognitionRef.current = rec;
    } else {
      setVoiceTextLog("Speech recognition not supported in this browser.");
    }
  }, []);

  // Background sound activation (claps and wake phrases)
  const triggerSentinelUplink = (msg: string) => {
    setIsListening(true);
    setVoiceTextLog(msg);
    speakText("Vocal uplink established. Sentinel stands ready.");
  };

  useEffect(() => {
    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let microphone: MediaStreamAudioSourceNode | null = null;
    let javascriptNode: ScriptProcessorNode | null = null;
    let stream: MediaStream | null = null;

    const setupAudioMonitoring = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

        // Setup clap/snap spike detection
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioContext = new AudioContextClass();
        audioContextRef.current = audioContext;
        analyser = audioContext.createAnalyser();
        microphone = audioContext.createMediaStreamSource(stream);
        javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);

        analyser.smoothingTimeConstant = 0.3;
        analyser.fftSize = 1024;

        microphone.connect(analyser);
        analyser.connect(javascriptNode);
        javascriptNode.connect(audioContext.destination);

        let lastPeakTime = 0;
        javascriptNode.onaudioprocess = () => {
          if (!analyser) return;
          const array = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(array);
          let values = 0;

          const length = array.length;
          for (let i = 0; i < length; i++) {
            values += array[i];
          }

          const average = values / length;
          // Sharp sound trigger threshold (claps)
          if (average > 85) {
            const now = Date.now();
            if (now - lastPeakTime > 1200) {
              lastPeakTime = now;
              triggerSentinelUplink("Audio clap peak detected. Swarm uplink online.");
            }
          }
        };

      } catch (err) {
        console.warn("Audio background monitor initialization failed:", err);
      }
    };

    setupAudioMonitoring();

    return () => {
      if (javascriptNode) javascriptNode.disconnect();
      if (microphone) microphone.disconnect();
      if (audioContext) audioContext.close();
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Toggle Voice Recognition
  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
      setVoiceTextLog("Voice uplink suspended. Entering silent wake-word mode.");
      speakText("Voice uplink suspended.");
    } else {
      triggerSentinelUplink("Uplink active. Awaiting voice instructions...");
    }
  };

  // Process SRE Audio Voice commands
  function processVoiceCommand(command: string) {
    const clean = command.toLowerCase().trim();
    
    // Fuzzy matching categories (tolerant to homophones and regional accents)
    const isInject = ["inject", "trigger", "crash", "fault", "simulate", "outage", "problem", "leak", "fail", "crush", "cash", "tigger"].some(k => clean.includes(k));
    const isSwarm = ["deploy", "swarm", "analyze", "inspect", "diagnostic", "debug", "run", "start", "commence", "storm", "form", "warm"].some(k => clean.includes(k));
    const isResolve = ["restart", "resolve", "remedy", "rollback", "fix", "cure", "recover", "clear", "reboot", "remade"].some(k => clean.includes(k));
    const isBrief = ["brief", "explain", "status", "info", "detail", "update", "report"].some(k => clean.includes(k));

    if (isInject) {
      if (activeIncident) {
        speakText("Fault profile already active. Remediate active outage first.");
        return;
      }
      speakText("Initiating outage simulation profile.");
      handleTriggerIncident();
    } else if (isSwarm) {
      if (!activeIncident) {
        speakText("Telemetry nominal. Diagnostic swarm deployment bypassed.");
        return;
      }
      speakText("Deploying SRE swarm correlator nodes.");
      handleTriggerSwarm();
    } else if (isResolve) {
      if (!activeIncident) {
        speakText("All endpoints operating standard parameters.");
        return;
      }
      speakText("Remediating cluster configuration and rebooting nodes.");
      handleResolveIncident();
    } else if (isBrief) {
      if (activeIncident) {
        speakText(`Warning. A critical ${activeIncident.name} incident is currently active. Impacted service is ${activeIncident.service}. System latencies are elevated.`);
      } else {
        speakText("Current status. Nominal parameters. Swarm is standing by.");
      }
    } else {
      setVoiceTextLog("Querying operations intelligence...");
      fetch("http://localhost:8000/assistant/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: command })
      })
        .then(res => res.json())
        .then(data => {
          const answer = data.answer || "Uplink online. Standing by.";
          setVoiceTextLog(`Response: ${answer}`);
          speakText(answer);
        })
        .catch(err => {
          console.error("Failed to query assistant:", err);
          setVoiceTextLog(`Connection fault. Parsed: "${command}"`);
          speakText("Operations connection timed out.");
        });
    }
  }

  // Actions
  const handleTriggerIncident = () => {
    setSwarmConversations([]);
    setSwarmStatus("idle");
    setActiveAgentNode("none");
    setPostmortemReport("");
    setTerminalLines([]);
    setTerminalActive(false);

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
            message: "[ALERT] Remediator node triggered. Cluster reboot in progress. Configuration parameters rolled back.",
            timestamp: new Date().toLocaleTimeString()
          }
        ]);
        setActiveAgentNode("none");
        setTerminalLines([]);
        setTerminalActive(false);
      })
      .catch(err => console.error("Error resolving incident", err));
  };

  const getSparklineColors = (key: string, val: number) => {
    let isAlert = false;
    if (key === "cpu" && val > 70) isAlert = true;
    else if (key === "memory" && val > 450) isAlert = true;
    else if (key === "db_connections" && val >= 90) isAlert = true;
    else if (key === "latency" && val > 1000) isAlert = true;
    else if (key === "error_rate" && val > 5) isAlert = true;

    return {
      stroke: isAlert ? "#ef4444" : "#10b981",
      fill: isAlert ? "rgba(239, 68, 68, 0.08)" : "rgba(16, 185, 129, 0.04)"
    };
  };

  const renderSparkline = (key: string) => {
    if (metricsHistory.length === 0) return null;
    const currentVal = metricsHistory[metricsHistory.length - 1]?.[key] || 0;
    const { stroke, fill } = getSparklineColors(key, currentVal);
    
    const points = metricsHistory.map((m, idx) => {
      const val = m[key] || 0;
      let maxVal = 100;
      if (key === "memory") maxVal = 512;
      else if (key === "db_connections") maxVal = 100;
      else if (key === "latency") maxVal = 2000;
      else if (key === "error_rate") maxVal = 100;
      
      const x = (idx / 14) * 120;
      const y = 32 - (val / maxVal) * 28;
      return `${x},${y}`;
    });

    const pathData = `M ${points.join(" L ")}`;
    const areaData = `${pathData} L 120,36 L 0,36 Z`;

    return (
      <svg className="w-20 h-6 opacity-85 transition-all duration-300" viewBox="0 0 120 36">
        <path d={areaData} fill={fill} className="transition-all duration-300" />
        <path d={pathData} fill="none" stroke={stroke} strokeWidth="1.5" className="transition-all duration-300" />
      </svg>
    );
  };

  const triggerSshSimulation = (id: string) => {
    setTerminalLines(["[SYSTEM] SRE Remediator initializing SSH link...", "Connecting to target microservice host..."]);
    setTerminalActive(true);
    
    const dbCommands = [
      "ssh root@payment-service.production.svc",
      "Authorized via SentinelOps cryptokey pair.",
      "payment-service # psql -h pg-primary -U postgres -d orders",
      "orders=# SELECT pid, query, state, age(clock_timestamp(), query_start) FROM pg_stat_activity WHERE state != 'idle';",
      " pid  |               query               | state  |      age       ",
      "------+-----------------------------------+--------+----------------",
      " 2041 | SELECT * FROM checkout FOR UPDATE | active | 00:12:45.12321 ",
      " 2042 | SELECT * FROM checkout FOR UPDATE | active | 00:11:02.45109 ",
      "orders=# SELECT pg_terminate_backend(2041); pg_terminate_backend(2042);",
      " pg_terminate_backend \n----------------------\n t\n t\n(2 rows)",
      "orders=# \\q",
      "payment-service # git revert a8e92c --no-edit",
      "[revert-branch a1e9f0] Revert 'Acquire db conn for parallel executor'",
      "payment-service # docker restart payment-service",
      "payment-service restarted successfully. Checking health status...",
      "HTTP/1.1 200 OK - Latency: 12ms. Connections: 2/20 (Nominal)."
    ];

    const oomCommands = [
      "ssh root@auth-service.production.svc",
      "Authorized via SentinelOps cryptokey pair.",
      "auth-service # pm2 status",
      "┌────┬─────────────────┬──────────┬────────┬────────┬───────┬────────┐\n│ id │ name            │ mode     │ status │ cpu    │ mem   │ uptime │\n├────┼─────────────────┼──────────┼────────┼────────┼───────┼────────┤\n│ 0  │ auth-service    │ fork     │ errored│ 0%     │ 0 B   │ 0      │\n└────┴─────────────────┴──────────┴────────┴────────┴───────┴────────┘",
      "auth-service # node --inspect-brk heapdump_trigger.js",
      "Heapdump captured. Isolating global caches...",
      "Found: Global AuthTokenCacheMap holding 8,921 keys (unexpiring).",
      "auth-service # git revert d12b4e --no-edit",
      "[revert-branch e2c8f1] Revert 'Local session caching enhancement'",
      "auth-service # pm2 restart auth-service",
      "auth-service restarted. Memory allocation: 48MB (Nominal)."
    ];

    const dnsCommands = [
      "ssh root@api-gateway.production.svc",
      "Authorized via SentinelOps cryptokey pair.",
      "api-gateway # nslookup auth-service.production.svc.cluster.local",
      "Server:         10.96.0.10\nAddress:        10.96.0.10#53\n\n** connection timed out: no servers could be reached",
      "api-gateway # kubectl rollout restart deployment coredns -n kube-system",
      "deployment.apps/coredns restarted",
      "api-gateway # nslookup auth-service.production.svc.cluster.local",
      "Name:      auth-service.production.svc.cluster.local\nAddress:   10.104.22.82",
      "api-gateway # nginx -s reload",
      "Nginx configuration reloaded. Status: 200 OK (Nominal)."
    ];

    const envCommands = [
      "ssh root@notification-service.production.svc",
      "Authorized via SentinelOps cryptokey pair.",
      "notification-service # python -c \"import os; print(os.environ['SMTP_HOST'])\"",
      "Traceback (most recent call last):\n  File \"<string>\", line 1, in <module>\n  File \"/usr/lib/python3.10/os.py\", line 679, in __getitem__\n    raise KeyError(key) from None\nKeyError: 'SMTP_HOST'",
      "notification-service # kubectl set env deployment/notification-service SMTP_HOST=smtp.mailgun.org",
      "deployment.apps/notification-service env updated",
      "notification-service # kubectl rollout status deployment/notification-service",
      "Waiting for deployment \"notification-service\" rollout to finish: 1 old replicas are pending termination...",
      "deployment \"notification-service\" successfully rolled out."
    ];

    const diskCommands = [
      "ssh root@audit-logger-service.production.svc",
      "Authorized via SentinelOps cryptokey pair.",
      "audit-logger-service # df -h",
      "Filesystem      Size  Used Avail Use% Mounted on\n/dev/sda1        40G   40G    0B 100% /",
      "audit-logger-service # find /var/log -type f -size +100M",
      "/var/log/audit.log",
      "audit-logger-service # echo \"\" > /var/log/audit.log",
      "audit-logger-service # sed -i 's/LOG_LEVEL=DEBUG/LOG_LEVEL=INFO/' .env",
      "audit-logger-service # service syslog restart",
      "syslog service restarted. Disk usage: 12GB / 40GB (30% Nominal)."
    ];

    const cmdList = id.includes("DB_CONNECTION") ? dbCommands :
                    id.includes("NODEJS_HEAPP") ? oomCommands :
                    id.includes("K8S_DNS") ? dnsCommands :
                    id.includes("ENV_CONFIG") ? envCommands : diskCommands;

    let index = 0;
    const interval = setInterval(() => {
      if (index < cmdList.length) {
        setTerminalLines(prev => [...prev, cmdList[index]]);
        index++;
      } else {
        setTerminalLines(prev => [...prev, "[SUCCESS] SSH connection terminated. SRE containment complete."]);
        clearInterval(interval);
      }
    }, 900);
  };

  const handleCreateCustomIncident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customIncident.id || !customIncident.name || !customIncident.service) {
      setCustomIncidentStatus("Error: ID, Name, and Service are required.");
      return;
    }

    setCustomIncidentStatus("Registering fault...");
    const logsList = customIncident.logs.split("\n").map(l => l.trim()).filter(Boolean);

    fetch("http://localhost:8000/api/incidents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: customIncident.id.toUpperCase().replace(/[^A-Z0-9_]/g, "_"),
        name: customIncident.name,
        severity: customIncident.severity,
        service: customIncident.service,
        description: customIncident.description,
        logs: logsList
      })
    })
      .then(res => {
        if (!res.ok) throw new Error("Registration failed");
        return res.json();
      })
      .then(data => {
        setCustomIncidentStatus("Success! Fault scenario active.");
        setSelectedIncidentId(data.incident_id);
        setShowCustomConfigurator(false);
        // Refresh incidents list
        fetch("http://localhost:8000/api/incidents")
          .then(res => res.json())
          .then(data => setIncidents(data));
      })
      .catch(err => {
        console.error(err);
        setCustomIncidentStatus("Failed to register fault scenario.");
      });
  };

  const handleTriggerSwarm = () => {
    if (!activeIncident) return;
    
    setSwarmConversations([]);
    setSwarmStatus("running");
    setPostmortemReport("");
    setTerminalLines([]);
    setTerminalActive(false);
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
        triggerSshSimulation(selectedIncidentId);
        
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

  const handleRagSearch = () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    fetch("http://localhost:8000/api/rag/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: searchQuery, k: 3 })
    })
      .then(res => res.json())
      .then(data => {
        setSearchResults(data);
        setIsSearching(false);
      })
      .catch(err => {
        console.error("Error in RAG search", err);
        setIsSearching(false);
      });
  };

  const handleAddRunbook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRunbook.id || !newRunbook.title || !newRunbook.content) {
      setRunbookActionStatus("Please fill all required fields");
      return;
    }
    
    setRunbookActionStatus("Adding runbook...");
    fetch("http://localhost:8000/api/runbooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newRunbook)
    })
      .then(res => res.json())
      .then(data => {
        setRunbooks(data);
        setNewRunbook({
          id: "",
          title: "",
          category: "Runbook",
          tags: "",
          content: ""
        });
        setRunbookActionStatus("Runbook added successfully!");
        setTimeout(() => setRunbookActionStatus(""), 3000);
      })
      .catch(err => {
        console.error("Error adding runbook", err);
        setRunbookActionStatus("Error adding runbook");
      });
  };

  const handleDeleteRunbook = (id: string) => {
    if (!window.confirm(`Are you sure you want to delete runbook '${id}'? This will remove it from the Swarm's semantic runbook RAG index.`)) return;
    
    setRunbookActionStatus("Deleting runbook...");
    fetch(`http://localhost:8000/api/runbooks/${id}`, {
      method: "DELETE"
    })
      .then(res => res.json())
      .then(data => {
        setRunbooks(data.runbooks);
        if (selectedRunbook?.id === id) {
          setSelectedRunbook(data.runbooks[0] || null);
        }
        setRunbookActionStatus("Runbook deleted.");
        setTimeout(() => setRunbookActionStatus(""), 3000);
      })
      .catch(err => {
        console.error("Error deleting runbook", err);
        setRunbookActionStatus("Error deleting runbook");
      });
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
    { id: "postmortem", label: "INCIDENT AUDITS", icon: <FileText /> },
    { id: "runbooks", label: "RAG RUNBOOKS", icon: <Database /> }
  ];

  return (
    <div className="h-screen w-screen grid-bg p-4 flex flex-col gap-4 text-[14.5px] transition-colors duration-500 selection:bg-white/10 overflow-hidden relative">
      
      {/* Dynamic Background Glowing Orbs for theme aesthetics */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[var(--threat-primary)]/10 blur-[130px] animate-blob-float-1"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-[var(--cyber-blue)]/5 blur-[150px] animate-blob-float-2"></div>
        <div className="absolute top-[30%] right-[20%] w-[40%] h-[40%] rounded-full bg-[var(--threat-bg-glow)]/40 blur-[110px] animate-blob-float-3"></div>
      </div>
      
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
              SENTINELOPS AI
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
          {/* Sleek Theme Selector Pills */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 border border-white/[0.04] relative z-20">
            <Palette className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-[9px] text-gray-500 font-mono tracking-wider uppercase mr-1">Theme</span>
            <div className="flex gap-1.5">
              <button
                onClick={() => setTheme("obsidian")}
                title="Cyber Obsidian (Green)"
                className={cn(
                  "w-4 h-4 rounded-full bg-[#030305] border transition-all cursor-pointer",
                  theme === "obsidian" ? "border-cyber-green scale-110 shadow-lg shadow-cyber-green/30" : "border-zinc-700 hover:border-zinc-500"
                )}
              />
              <button
                onClick={() => setTheme("nebula")}
                title="Nebula Violet (Magenta/Purple)"
                className={cn(
                  "w-4 h-4 rounded-full bg-[#06030c] border transition-all cursor-pointer",
                  theme === "nebula" ? "border-[#a855f7] scale-110 shadow-lg shadow-[#a855f7]/30" : "border-zinc-700 hover:border-zinc-500"
                )}
              />
              <button
                onClick={() => setTheme("crimson")}
                title="Crimson Protocol (Rose/Maroon)"
                className={cn(
                  "w-4 h-4 rounded-full bg-[#090204] border transition-all cursor-pointer",
                  theme === "crimson" ? "border-[#f43f5e] scale-110 shadow-lg shadow-[#f43f5e]/30" : "border-zinc-700 hover:border-zinc-500"
                )}
              />
              <button
                onClick={() => setTheme("matrix")}
                title="Matrix Code (Lime Green)"
                className={cn(
                  "w-4 h-4 rounded-full bg-[#010602] border transition-all cursor-pointer",
                  theme === "matrix" ? "border-[#39ff14] scale-110 shadow-lg shadow-[#39ff14]/30" : "border-zinc-700 hover:border-zinc-500"
                )}
              />
              <button
                onClick={() => setTheme("amber")}
                title="Solar Flare (Amber/Gold)"
                className={cn(
                  "w-4 h-4 rounded-full bg-[#080501] border transition-all cursor-pointer",
                  theme === "amber" ? "border-[#f59e0b] scale-110 shadow-lg shadow-[#f59e0b]/30" : "border-zinc-700 hover:border-zinc-500"
                )}
              />
            </div>
          </div>

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
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-grow items-stretch min-h-0 overflow-hidden">
        
        {/* ==================== LEFT PANEL: Simulation Console & Telemetry ==================== */}
        <section className={cn(
          "flex flex-col gap-4 transition-all duration-300 h-full min-h-0 overflow-hidden",
          activeNavIndex === 0 ? "lg:col-span-3 flex" : 
          activeNavIndex === 2 ? "lg:col-span-3 flex" : "hidden"
        )}>
          
          {/* Simulation Console Card */}
          <div className={cn("glass-panel threat-glow rounded-2xl p-4 flex flex-col gap-3 relative group overflow-hidden flex-shrink-0")}>
            <Spotlight size={250} />
            <h2 className="text-xs font-semibold tracking-widest text-white border-b border-white/[0.04] pb-2 flex items-center gap-2 uppercase font-mono relative z-10">
              <Activity className="h-4 w-4 text-cyber-green" /> Outage Control Deck
            </h2>
            
            <div className="flex flex-col gap-2 relative z-10">
              <label className="text-[11px] text-gray-400 font-mono">Incident Fault Profile</label>
              <div className="flex gap-2">
                <select 
                  value={selectedIncidentId} 
                  onChange={(e) => setSelectedIncidentId(e.target.value)}
                  disabled={activeIncident !== null}
                  className="flex-grow bg-black/70 border border-white/[0.08] rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-cyber-green transition-colors cursor-pointer"
                >
                  {incidents.map(inc => (
                    <option key={inc.id} value={inc.id}>
                      [{inc.severity}] {inc.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowCustomConfigurator(!showCustomConfigurator)}
                  disabled={activeIncident !== null}
                  className="px-2.5 py-2 bg-white/[0.04] border border-white/[0.08] text-gray-400 hover:text-white rounded-xl font-mono text-[11px] cursor-pointer hover:bg-white/[0.08] transition-colors"
                  title="Configure custom fault scenario"
                >
                  {showCustomConfigurator ? "Cancel" : "New"}
                </button>
              </div>
            </div>

            {showCustomConfigurator && (
              <form onSubmit={handleCreateCustomIncident} className="border-t border-white/[0.04] pt-3 mt-1 flex flex-col gap-2 relative z-10">
                <p className="text-[10px] text-cyber-green font-mono uppercase tracking-wider font-bold mb-1">Custom Fault Registration</p>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-gray-500 font-mono">FAULT ID</label>
                    <input 
                      type="text"
                      placeholder="CUSTOM_OOM"
                      value={customIncident.id}
                      onChange={e => setCustomIncident(prev => ({ ...prev, id: e.target.value }))}
                      className="bg-black/80 border border-white/[0.08] rounded-lg px-2 py-1 text-white font-mono text-[10px] focus:outline-none focus:border-cyber-green"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-gray-500 font-mono">SERVICE</label>
                    <input 
                      type="text"
                      placeholder="cache-service"
                      value={customIncident.service}
                      onChange={e => setCustomIncident(prev => ({ ...prev, service: e.target.value }))}
                      className="bg-black/80 border border-white/[0.08] rounded-lg px-2 py-1 text-white font-mono text-[10px] focus:outline-none focus:border-cyber-green"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] text-gray-500 font-mono">SCENARIO NAME</label>
                  <input 
                    type="text"
                    placeholder="Redis Out-Of-Memory Outage"
                    value={customIncident.name}
                    onChange={e => setCustomIncident(prev => ({ ...prev, name: e.target.value }))}
                    className="bg-black/80 border border-white/[0.08] rounded-lg px-2 py-1 text-white font-mono text-[10px] focus:outline-none focus:border-cyber-green"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] text-gray-500 font-mono">DESCRIPTION</label>
                  <textarea 
                    placeholder="Redis service maxmemory policy exhausted..."
                    rows={2}
                    value={customIncident.description}
                    onChange={e => setCustomIncident(prev => ({ ...prev, description: e.target.value }))}
                    className="bg-black/80 border border-white/[0.08] rounded-lg px-2 py-1 text-white font-mono text-[10px] focus:outline-none focus:border-cyber-green resize-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] text-gray-500 font-mono">DIAGNOSTIC LOG SEQUENCE</label>
                  <textarea 
                    placeholder="[ERROR] Redis memory limit reached&#10;[CRITICAL] Cache server failed to respond"
                    rows={2}
                    value={customIncident.logs}
                    onChange={e => setCustomIncident(prev => ({ ...prev, logs: e.target.value }))}
                    className="bg-black/80 border border-white/[0.08] rounded-lg px-2 py-1 text-white font-mono text-[9px] focus:outline-none focus:border-cyber-green resize-none"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full bg-cyber-green/20 hover:bg-cyber-green/30 border border-cyber-green/45 text-cyber-green font-bold py-1.5 rounded-lg font-mono text-[10px] tracking-wide transition-all cursor-pointer mt-1"
                >
                  REGISTER & ACTIVATE FAULT
                </button>

                {customIncidentStatus && (
                  <p className="text-[9px] font-mono text-center text-cyber-amber animate-pulse mt-0.5">{customIncidentStatus}</p>
                )}
              </form>
            )}

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
          <div className="glass-panel threat-glow rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden group flex-shrink-0">
            <Spotlight size={250} />
            <h2 className="text-xs font-semibold tracking-widest text-white border-b border-white/[0.04] pb-2 flex items-center justify-between uppercase font-mono relative z-10">
              <span className="flex items-center gap-2"><Mic className="h-4 w-4 text-cyber-green animate-pulse" /> SRE Professional Voice</span>
              <button 
                onClick={() => {
                  const nextState = !voiceBriefingActive;
                  setVoiceBriefingActive(nextState);
                  if (!nextState) {
                    window.speechSynthesis.cancel();
                  }
                }}
                className="text-[10px] text-gray-500 hover:text-white transition-colors"
                title="Toggle vocal briefings"
              >
                {voiceBriefingActive ? <Volume2 className="h-3.5 w-3.5 text-cyber-green" /> : <VolumeX className="h-3.5 w-3.5 text-gray-600" />}
              </button>
            </h2>

            <div className="flex flex-col gap-3 relative z-10 justify-between flex-grow">
              {/* 3D Cybernetic Assistant Hologram */}
              <div className="h-28 relative w-full flex-shrink-0">
                <SreRobot3d isThreat={!!activeIncident} isListening={isListening} />
              </div>

              <div className="p-3 bg-black/60 rounded-xl border border-white/[0.04] font-mono text-[11px] text-gray-400 leading-normal min-h-[56px] flex flex-col justify-center">
                <span className="text-cyber-green font-bold text-[9px] uppercase tracking-wider block mb-1">Telemetry uplink log</span>
                <span className="line-clamp-2">{voiceTextLog}</span>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type SRE instruction... (press Enter)"
                  className="flex-1 bg-black/50 hover:bg-black/60 focus:bg-black/80 border border-white/[0.08] focus:border-cyber-green/40 text-gray-200 font-mono text-[11px] px-3 py-2.5 rounded-xl outline-none transition-all placeholder-zinc-600 shadow-inner"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const val = e.currentTarget.value.trim();
                      if (val) {
                        setVoiceTextLog(`Manual command: "${val}"`);
                        processVoiceCommand(val);
                        e.currentTarget.value = "";
                      }
                    }
                  }}
                />
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
          <div className="glass-panel threat-glow rounded-2xl p-4 flex flex-col gap-3 flex-grow min-h-0 relative overflow-hidden group">
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

            <div className="flex flex-col gap-2 py-1.5 flex-grow justify-between relative z-10 overflow-y-auto">
              {/* CPU Radial Dial */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/[0.03] hover:border-white/[0.08] transition-all gap-2">
                <div className="flex items-center gap-2.5 min-w-[125px]">
                  <Cpu className="h-4.5 w-4.5 text-cyber-green" />
                  <div>
                    <p className="text-[11px] font-semibold text-white font-mono leading-none">CPU Util</p>
                    <p className="text-[9px] text-gray-500 mt-1">cgroup quota</p>
                  </div>
                </div>
                <div className="flex-grow flex justify-center opacity-70">
                  {renderSparkline("cpu")}
                </div>
                <div className="text-right min-w-[45px]">
                  <p className={cn(
                    "font-mono text-xs font-bold transition-all duration-300",
                    activeMetrics.cpu > 70 ? 'text-cyber-red glow-text-red scale-105 animate-pulse' : 'text-cyber-green'
                  )}>
                    {activeMetrics.cpu}%
                  </p>
                </div>
              </div>

              {/* Memory Usage Progress */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/[0.03] hover:border-white/[0.08] transition-all gap-2">
                <div className="flex items-center gap-2.5 min-w-[125px]">
                  <Network className="h-4.5 w-4.5 text-cyber-green" />
                  <div>
                    <p className="text-[11px] font-semibold text-white font-mono leading-none">Heap Alloc</p>
                    <p className="text-[9px] text-gray-500 mt-1">v8 heap limit</p>
                  </div>
                </div>
                <div className="flex-grow flex justify-center opacity-70">
                  {renderSparkline("memory")}
                </div>
                <div className="text-right min-w-[45px]">
                  <p className={cn(
                    "font-mono text-xs font-bold transition-all duration-300",
                    activeMetrics.memory > 450 ? 'text-cyber-red glow-text-red animate-pulse' : 'text-cyber-green'
                  )}>
                    {activeMetrics.memory}M
                  </p>
                </div>
              </div>

              {/* DB Connections Pool Bar Chart */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/[0.03] hover:border-white/[0.08] transition-all gap-2">
                <div className="flex items-center gap-2.5 min-w-[125px]">
                  <Database className="h-4.5 w-4.5 text-cyber-green" />
                  <div>
                    <p className="text-[11px] font-semibold text-white font-mono leading-none">Active DB Pools</p>
                    <p className="text-[9px] text-gray-500 mt-1">pool capacity</p>
                  </div>
                </div>
                <div className="flex-grow flex justify-center opacity-70">
                  {renderSparkline("db_connections")}
                </div>
                <div className="text-right min-w-[45px]">
                  <p className={cn(
                    "font-mono text-xs font-bold transition-all duration-300",
                    activeMetrics.db_connections >= 90 ? 'text-cyber-red glow-text-red animate-pulse' : 'text-cyber-green'
                  )}>
                    {activeMetrics.db_connections}
                  </p>
                </div>
              </div>

              {/* API Response Latency Meter */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/[0.03] hover:border-white/[0.08] transition-all gap-2">
                <div className="flex items-center gap-2.5 min-w-[125px]">
                  <Clock className="h-4.5 w-4.5 text-cyber-green" />
                  <div>
                    <p className="text-[11px] font-semibold text-white font-mono leading-none">API Latency</p>
                    <p className="text-[9px] text-gray-500 mt-1">p99 response</p>
                  </div>
                </div>
                <div className="flex-grow flex justify-center opacity-70">
                  {renderSparkline("latency")}
                </div>
                <div className="text-right min-w-[45px]">
                  <p className={cn(
                    "font-mono text-xs font-bold transition-all duration-300",
                    activeMetrics.latency > 1000 ? 'text-cyber-red glow-text-red animate-pulse' : 'text-cyber-green'
                  )}>
                    {activeMetrics.latency >= 1000 ? `${(activeMetrics.latency / 1000).toFixed(1)}s` : `${activeMetrics.latency.toFixed(0)}ms`}
                  </p>
                </div>
              </div>

              {/* Route Error Rate */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/[0.03] hover:border-white/[0.08] transition-all gap-2">
                <div className="flex items-center gap-2.5 min-w-[125px]">
                  <AlertTriangle className="h-4.5 w-4.5 text-cyber-green" />
                  <div>
                    <p className="text-[11px] font-semibold text-white font-mono leading-none">Nginx Error</p>
                    <p className="text-[9px] text-gray-500 mt-1">HTTP 5xx rate</p>
                  </div>
                </div>
                <div className="flex-grow flex justify-center opacity-70">
                  {renderSparkline("error_rate")}
                </div>
                <div className="text-right min-w-[45px]">
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
          "flex flex-col gap-4 transition-all duration-300 h-full min-h-0 overflow-hidden",
          activeNavIndex === 0 ? "lg:col-span-5 flex" :
          activeNavIndex === 1 ? "lg:col-span-12 flex" : "hidden"
        )}>
          
          {/* Interactive SRE Swarm Brain 3D Topology */}
          <div className="glass-panel threat-glow rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden group flex-shrink-0">
            <Spotlight size={300} />
            <h2 className="text-xs font-semibold tracking-widest text-white border-b border-white/[0.04] pb-2 flex items-center gap-2 uppercase font-mono relative z-10">
              <Network className="h-4 w-4 text-cyber-green" /> Cybernetic Swarm Agent Network
            </h2>

            <div className="relative z-10">
              <SwarmAgentNetwork isThreat={!!activeIncident} activeAgentName={activeAgentName} />
            </div>
          </div>

          {/* Live Swarm Conversation Card */}
          <div className="glass-panel threat-glow rounded-2xl p-4 flex flex-col gap-3 flex-grow min-h-0 overflow-hidden relative">
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
              className="flex-grow overflow-y-auto pr-1 flex flex-col gap-3 relative z-10"
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
                      <p className="text-gray-300 font-mono text-[13.5px] whitespace-pre-wrap leading-relaxed">
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
          "flex flex-col gap-4 transition-all duration-300 h-full min-h-0 overflow-hidden",
          activeNavIndex === 0 ? "lg:col-span-4 flex" :
          activeNavIndex === 2 ? "lg:col-span-9 flex" :
          activeNavIndex === 3 ? "lg:col-span-12 flex" : "hidden"
        )}>
          
          {/* Active alerts warning notification banner */}
          {alerts.length > 0 && (
            <div className="bg-cyber-red/10 border border-cyber-red/25 rounded-2xl p-3 flex gap-3 shadow-xl shadow-cyber-red/5 animate-pulse relative overflow-hidden flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-cyber-red flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white font-mono text-xs">TELEMETRY ANOMALY WARNING</p>
                <p className="text-gray-300 font-mono text-[10px] leading-relaxed mt-1">{alerts[0].description}</p>
              </div>
            </div>
          )}

          {/* Live system logs terminal Card */}
          <div className={cn(
            "glass-panel threat-glow rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden min-h-0",
            activeNavIndex === 2 ? "h-full" : "h-1/2"
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
              className="flex-grow code-terminal rounded-xl p-3 overflow-y-auto pr-1 flex flex-col gap-1.5 font-mono text-[12px] relative z-10"
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
            "glass-panel threat-glow rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden min-h-0",
            activeNavIndex === 3 ? "h-full" : "h-1/2"
          )}>
            <Spotlight size={300} />
            <div className="flex justify-between items-center border-b border-white/[0.04] pb-2 relative z-10 flex-shrink-0">
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

            <div className="flex-grow min-h-0 relative z-10 flex flex-col lg:flex-row gap-4">
              
              {/* Left Column: Postmortem Report */}
              <div className={cn(
                "overflow-y-auto code-terminal rounded-xl p-4 font-mono text-[13px] text-gray-300 leading-relaxed border border-white/[0.02]",
                activeNavIndex === 3 ? "flex-1" : "w-full"
              )}>
                {postmortemReport ? (
                  <div className="flex flex-col gap-3.5 select-text">
                    {postmortemReport.split("\n").map((line, idx) => {
                      if (line.startsWith("# ")) {
                        return <h1 key={idx} className="text-base font-bold text-white tracking-wide border-b border-white/[0.04] pb-1.5 mt-3">{line.replace("# ", "")}</h1>;
                      }
                      if (line.startsWith("## ")) {
                        return <h2 key={idx} className="text-sm font-bold text-cyber-green mt-4 flex items-center gap-1.5"><ChevronRight className="h-3.5 w-3.5" /> {line.replace("## ", "")}</h2>;
                      }
                      if (line.startsWith("### ")) {
                        return <h3 key={idx} className="text-[13px] font-bold text-emerald-400 mt-3">{line.replace("### ", "")}</h3>;
                      }
                      if (line.startsWith("|") && line.includes("---")) {
                        return null; 
                      }
                      if (line.startsWith("|")) {
                        const cells = line.split("|").map(c => c.trim()).filter(Boolean);
                        const isHeader = line.includes("Parameter");
                        return (
                          <div key={idx} className={cn(
                            "grid grid-cols-2 p-1.5 border-b border-white/[0.02] font-mono text-[11px]",
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
                        return <li key={idx} className="list-none pl-4 relative before:content-['-'] before:absolute before:left-0 before:text-cyber-green font-mono text-[13px]">{line.substring(2)}</li>;
                      }
                      return <p key={idx} className="text-gray-300 leading-relaxed font-mono text-[13px]">{line}</p>;
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

              {/* Right Column: SRE SSH Terminal Shell */}
              {activeNavIndex === 3 && (
                <div className="flex-1 overflow-y-auto code-terminal rounded-xl p-4 font-mono text-[11.5px] bg-black/95 border border-white/[0.04] flex flex-col gap-1.5 select-text">
                  <div className="flex justify-between items-center border-b border-white/[0.06] pb-1.5 mb-1 flex-shrink-0 text-gray-500 uppercase text-[9px] tracking-wider font-bold">
                    <span>Remediation Shell Session (root@sre-swarm)</span>
                    <span className={cn(
                      "h-2 w-2 rounded-full",
                      terminalActive ? "bg-cyber-green animate-pulse" : "bg-gray-600"
                    )} />
                  </div>
                  
                  {terminalActive ? (
                    <div className="flex flex-col gap-1">
                      {terminalLines.map((line, lIdx) => {
                        let textCol = "text-gray-300";
                        if (line.startsWith("[SYSTEM]") || line.startsWith("[SUCCESS]")) {
                          textCol = "text-cyber-green font-bold";
                        } else if (line.includes("Error") || line.includes("errored") || line.includes("KeyError") || line.includes("Traceback") || line.includes("errored")) {
                          textCol = "text-cyber-red font-semibold";
                        } else if (line.startsWith("ssh") || line.includes("# ") || line.includes("orders=#") || line.includes("orders=")) {
                          textCol = "text-cyber-blue font-bold";
                        }
                        return (
                          <div key={lIdx} className={cn("leading-relaxed whitespace-pre-wrap font-mono", textCol)}>
                            {line}
                          </div>
                        );
                      })}
                      {terminalLines.length > 0 && terminalLines[terminalLines.length - 1] !== "[SUCCESS] SSH connection terminated. SRE containment complete." && (
                        <span className="inline-block w-1.5 h-3 bg-cyber-green animate-ping ml-1" />
                      )}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-600 font-mono text-xs">
                      <Terminal className="h-8 w-8 text-gray-800 mb-1.5" />
                      <p className="font-bold text-gray-500">Remediation Shell Stand-by.</p>
                      <p className="text-gray-700 mt-1">Awaiting Remediator node trigger execution.</p>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </section>

        {/* ==================== RAG RUNBOOKS DATABASE PANEL ==================== */}
        <section className={cn(
          "grid grid-cols-1 lg:grid-cols-12 gap-4 transition-all duration-300 h-full min-h-0 overflow-hidden lg:col-span-12",
          activeNavIndex === 4 ? "flex" : "hidden"
        )}>
          {/* Left Column: Playground & Form (Col-span 5) */}
          <div className="lg:col-span-5 flex flex-col gap-4 h-full min-h-0">
            
            {/* RAG Similarity Search Playground */}
            <div className="glass-panel threat-glow rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden flex-shrink-0">
              <Spotlight size={250} />
              <h2 className="text-xs font-semibold tracking-widest text-white border-b border-white/[0.04] pb-2 flex items-center gap-2 uppercase font-mono relative z-10">
                <Database className="h-4 w-4 text-cyber-green animate-pulse" /> Semantic Search Playground
              </h2>
              
              <div className="flex gap-2 relative z-10">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter telemetry symptoms or tags..."
                  className="flex-1 bg-black/70 border border-white/[0.08] rounded-xl px-3 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-cyber-green transition-colors"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRagSearch();
                  }}
                />
                <button
                  onClick={handleRagSearch}
                  disabled={isSearching}
                  className="bg-cyber-green hover:bg-emerald-600 text-white font-bold py-2.5 px-4 rounded-xl transition-all font-mono text-xs cursor-pointer active:scale-95 border-none flex items-center gap-1.5"
                >
                  <Search className="h-3.5 w-3.5" /> {isSearching ? "Searching..." : "QUERY"}
                </button>
              </div>

              {/* Search Results */}
              <div className="flex flex-col gap-2 relative z-10 max-h-[180px] overflow-y-auto pr-1">
                {searchResults.length === 0 ? (
                  <p className="text-[11px] text-gray-500 font-mono text-center py-2">
                    {searchQuery ? "No matching documents found." : "Submit query to test TF-IDF cosine similarity calculations."}
                  </p>
                ) : (
                  searchResults.map((res, index) => (
                    <div 
                      key={index} 
                      onClick={() => setSelectedRunbook(res.doc)}
                      className="p-2.5 rounded-xl bg-black/40 border border-white/[0.03] hover:border-cyber-green/40 hover:bg-black/60 transition-all cursor-pointer flex flex-col gap-1.5"
                    >
                      <div className="flex justify-between items-center text-[11px] font-mono">
                        <span className="font-bold text-white truncate max-w-[220px]">{res.doc.title}</span>
                        <span className="text-cyber-green font-bold bg-cyber-green/10 border border-cyber-green/25 px-1.5 py-0.5 rounded text-[9px]">
                          {(res.score * 100).toFixed(1)}% Match
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 line-clamp-2 leading-relaxed">
                        {res.doc.content}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Create New Runbook Form */}
            <div className="glass-panel threat-glow rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden flex-grow min-h-0">
              <Spotlight size={300} />
              <h2 className="text-xs font-semibold tracking-widest text-white border-b border-white/[0.04] pb-2 flex items-center gap-2 uppercase font-mono relative z-10">
                <FileText className="h-4 w-4 text-cyber-green" /> Register New Knowledge Item
              </h2>
              
              <form onSubmit={handleAddRunbook} className="flex flex-col gap-2.5 relative z-10 flex-grow overflow-y-auto pr-1">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-gray-400 font-mono uppercase tracking-wider">Document ID *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. RUNBOOK_REDIS_LEAK"
                      value={newRunbook.id}
                      onChange={(e) => setNewRunbook({...newRunbook, id: e.target.value})}
                      className="w-full bg-black/60 border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-white font-mono text-[11px] focus:outline-none focus:border-cyber-green transition-colors"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-gray-400 font-mono uppercase tracking-wider">Category</label>
                    <select
                      value={newRunbook.category}
                      onChange={(e) => setNewRunbook({...newRunbook, category: e.target.value})}
                      className="w-full bg-black/60 border border-white/[0.08] rounded-lg px-2 py-1.5 text-white font-mono text-[11px] focus:outline-none focus:border-cyber-green transition-colors cursor-pointer"
                    >
                      <option value="Runbook">Runbook</option>
                      <option value="Historical Incident">Historical Incident</option>
                      <option value="Cheat Sheet">Cheat Sheet</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] text-gray-400 font-mono uppercase tracking-wider">Document Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Troubleshooting Redis Timeout and Latency Spikes"
                    value={newRunbook.title}
                    onChange={(e) => setNewRunbook({...newRunbook, title: e.target.value})}
                    className="w-full bg-black/60 border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-white font-mono text-[11px] focus:outline-none focus:border-cyber-green transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] text-gray-400 font-mono uppercase tracking-wider">Search Keywords / Tags</label>
                  <input
                    type="text"
                    placeholder="redis, cache, timeout, network (comma-separated)"
                    value={newRunbook.tags}
                    onChange={(e) => setNewRunbook({...newRunbook, tags: e.target.value})}
                    className="w-full bg-black/60 border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-white font-mono text-[11px] focus:outline-none focus:border-cyber-green transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1 flex-grow">
                  <label className="text-[9px] text-gray-400 font-mono uppercase tracking-wider">Resolution Guidelines / Content *</label>
                  <textarea
                    required
                    placeholder="Detailed troubleshooting rules and steps. These will be semantically indexed for LangGraph agents..."
                    value={newRunbook.content}
                    onChange={(e) => setNewRunbook({...newRunbook, content: e.target.value})}
                    rows={4}
                    className="w-full bg-black/60 border border-white/[0.08] rounded-lg p-2.5 text-white font-mono text-[11px] focus:outline-none focus:border-cyber-green transition-colors resize-none flex-grow min-h-[60px]"
                  />
                </div>

                <div className="flex justify-between items-center mt-1 flex-shrink-0">
                  <span className="text-[10px] text-cyber-amber font-mono">{runbookActionStatus}</span>
                  <button
                    type="submit"
                    className="bg-cyber-green hover:bg-emerald-600 text-white font-bold py-1.5 px-4 rounded-xl transition-all font-mono text-xs cursor-pointer active:scale-95 border-none"
                  >
                    ADD TO RAG INDEX
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Column: Catalog List & Detail Panel (Col-span 7) */}
          <div className="lg:col-span-7 flex flex-col gap-4 h-full min-h-0">
            
            {/* Runbook Index Directory */}
            <div className="glass-panel threat-glow rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden h-full min-h-0">
              <Spotlight size={350} />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full min-h-0">
                {/* Runbooks Directory List */}
                <div className="flex flex-col gap-2.5 border-r border-white/[0.04] pr-2 h-full overflow-y-auto">
                  <h3 className="text-[10px] font-bold text-gray-500 font-mono uppercase tracking-wider mb-0.5">SRE Runbooks Index</h3>
                  {runbooks.map((rb) => (
                    <div
                      key={rb.id}
                      onClick={() => setSelectedRunbook(rb)}
                      className={cn(
                        "p-2.5 rounded-xl border transition-all cursor-pointer relative group flex flex-col gap-1.5",
                        selectedRunbook?.id === rb.id
                          ? "bg-cyber-green/5 border-cyber-green/50 text-white"
                          : "bg-black/40 border-white/[0.03] text-gray-400 hover:border-white/[0.08] hover:bg-black/60"
                      )}
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-[11px] font-mono tracking-wide truncate max-w-[150px]">{rb.title}</span>
                        <span className="text-[8px] font-mono uppercase px-1.5 py-0.5 rounded bg-black/60 border border-white/[0.04] text-gray-500">
                          {rb.category}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {rb.tags?.map((t: string) => (
                          <span key={t} className="text-[8px] font-mono px-1 py-0.2 rounded bg-white/[0.02] border border-white/[0.04] text-gray-500">
                            #{t}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Selected Runbook Detailed Reader */}
                <div className="flex flex-col h-full min-h-0 overflow-hidden pl-1">
                  {selectedRunbook ? (
                    <div className="flex flex-col h-full min-h-0">
                      <div className="flex justify-between items-start border-b border-white/[0.04] pb-2 mb-2 flex-shrink-0">
                        <div>
                          <span className="text-[8px] font-mono text-cyber-green font-bold uppercase tracking-wider block">{selectedRunbook.category} ID: {selectedRunbook.id}</span>
                          <h4 className="text-xs font-bold text-white font-mono leading-tight mt-0.5">{selectedRunbook.title}</h4>
                        </div>
                        <button
                          onClick={() => handleDeleteRunbook(selectedRunbook.id)}
                          className="text-[9px] font-mono font-semibold px-2 py-1 rounded bg-cyber-red/10 hover:bg-cyber-red/20 border border-cyber-red/35 text-cyber-red transition-all cursor-pointer"
                        >
                          DELETE
                        </button>
                      </div>

                      <div className="flex-grow overflow-y-auto pr-1 text-[11px] font-mono leading-relaxed text-gray-400 whitespace-pre-wrap select-text">
                        {selectedRunbook.content}
                      </div>
                      
                      <div className="mt-3 p-2 bg-white/[0.01] rounded-xl border border-white/[0.02] text-[9.5px] text-gray-500 leading-normal flex-shrink-0">
                        <span className="font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Indexing specs:</span>
                        This node is mapped into the SRE TF-IDF corpus. When the LangGraph swarm's RCA confidence falls below 80%, this runbook is queried and loaded as raw context to remediate failures.
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-center text-gray-600 font-mono text-[10px]">
                      Select a runbook to review semantic details.
                    </div>
                  )}
                </div>
              </div>
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
        <span>© 2026 SentinelOps AI • Developed by Arjun R</span>
      </footer>
    </div>
  );
}
