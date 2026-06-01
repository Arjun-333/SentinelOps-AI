# SentinelOps AI - Detailed Project Report (DPR)

This Detailed Project Report outlines the technical architecture, design principles, integration patterns, and operational features of the SentinelOps AI dashboard.

---

## 1. System Overview

SentinelOps AI is an automated Site Reliability Engineering (SRE) command center. The system intercepts simulated infrastructure and application outages, orchestrates a collaborative multi-agent LangGraph swarm to diagnose the issues, fetches matching recovery playbooks from a localized RAG database, and automatically rolls back configuration commits to restore microservice stability.

---

## 2. Component Architecture

The platform is split into two primary layers: a high-performance Python FastAPI backend and a responsive, glassmorphic React Vite frontend.

```
       ┌────────────────────────┐
       │   React Vite Client    │ ◄─── Persistent Vocal Uplink (Web Audio)
       └─────┬────────────▲─────┘
             │ HTTP       │ SSE (Server-Sent Events)
             ▼            │
       ┌──────────────────┴─────┐
       │    FastAPI Server      │
       └─────┬────────────▲─────┘
             │            │
             ▼            │ LangGraph Streams
     ┌──────────────┐     │
     │  SRE Agent   ├─────┘
     │ Swarm Plexus │ ◄─── Semantic Runbook RAG Index
     └──────────────┘
```

### 2.1 Backend Architecture
- **FastAPI Core**: Handles incoming REST API telemetry triggers and serves SSE (Server-Sent Events) streams under the `/api/swarm/analyze` route.
- **Incident Simulator**: Maintains system state machine, tracking active incident types, timestamp parameters, logs, and remediation outputs.
- **LangGraph Multi-Agent Swarm**: Coordinates execution between four cognitive nodes:
  - **Monitoring Agent**: Scans logs to detect thresholds.
  - **RCA Agent**: Runs git diff reviews.
  - **RAG Retrieval Agent**: References internal markdown databases.
  - **Remediator Agent**: Executes rollbacks.
- **Local RAG Database**: Built using TF-IDF matching over a curated list of SRE manuals and historic incident reports.

### 2.2 Frontend Architecture
- **React 18 & TypeScript**: Strongly typed component layout built on top of TailwindCSS.
- **Dynamic Theming Engine**: Uses HSL color tokens mapped to root CSS variables to adjust font families, round corners, and glow properties in real-time.
- **SVG Swarm Nexus**: An interactive, lightweight SVG representation of the agent swarm. Illumination triggers align with SSE state updates.
- **Hands-Free Audio Activation**: Leverages Web Audio AnalyserNodes to register clap volume spikes and SpeechRecognition to monitor wake phrases.

---

## 3. Dynamic Theming Matrix

The visual aesthetics change dynamically based on the active theme, adapting more than just colors. The system morphs font families, container border-radius metrics, and background animations:

| Theme | Aesthetic Target | Highlight Hue | Primary Font Stack | Panel Corners |
| :--- | :--- | :--- | :--- | :--- |
| **Cyber Obsidian** | Default SRE console | Neon Green | Inter / JetBrains Mono | 16px (Smooth) |
| **Nebula Abyss** | Space flight deck | Deep Violet | Orbitron / Space Grotesk | 28px (Extended) |
| **Crimson Protocol** | Critical alert console | Crimson Red | Share Tech Mono | 0px (Industrial Sharp) |
| **Matrix Code** | Terminal retro grid | Matrix Lime | DotGothic16 | 4px (Blocky) |
| **Solar Flare** | Aerospace monitoring | Solar Amber | Fira Code | 8px (Compact) |

---

## 4. Hands-Free Audio Activation Engine

To allow remote, hands-free activation of the operations uplink, a secondary monitoring system operates continuously in the browser thread.

### 4.1 Clap Spike Analysis
The system captures microphone streams and connects them to a Web Audio `ScriptProcessorNode`:
1. Computes the average frequency volume over a 1024 sample window.
2. Registers a volume peak if average amplitude spikes above **85** units.
3. Debounces activation using a **1200ms** window lock to prevent duplicate triggering from echoes.

### 4.2 Wake Word Parser
A low-resource background `SpeechRecognition` instance runs continuously:
- Transcripts are parsed in real-time.
- If the phrase *"sentinel activate"*, *"sentinel online"*, or *"sentinel"* is detected, the uplink is triggered.
- Auto-restart behavior is implemented in the `onend` callback via `isListeningRef` checking to bypass browser-enforced silence timeouts.

---

## 5. Simulated Outages & Resolutions

The system includes simulated incident templates designed to test the LangGraph reasoning team:

### 5.1 DB Connection Exhaustion (`payment-service`)
- **Fault**: Thread pool allocation leaks database sockets.
- **RCA**: Identifies missing `conn.close()` inside batch payment execution loops.
- **Mitigation**: Kills PostgreSQL orphaned processes and rolls back codebase commits.

### 5.2 Auth Service heap OOM (`auth-service`)
- **Fault**: Global dictionary collects tokens without eviction limits.
- **RCA**: Finds missing TTL limits on `tokenCache` global allocations.
- **Mitigation**: Restarts containers and reverts token cache optimization branch.

### 5.3 API Gateway Upstream Route Timeout (`api-gateway`)
- **Fault**: Gateway routes point to unregistered cluster names.
- **RCA**: Locates cluster registry name discrepancy.
- **Mitigation**: Points upstream target back to the valid service coordinate.

### 5.4 Missing Env Config (`notification-service`)
- **Fault**: Upgrade asserts environment keys without config bindings.
- **RCA**: Captures startup `KeyError` on `os.environ['REDIS_URL']`.
- **Mitigation**: Patches Helm specifications and triggers pod rollout.

### 5.5 Disk Space Exhaustion (`audit-logger-service`)
- **Fault**: Logger debug logs grow unchecked without active rotation.
- **RCA**: Locates disabled `LOG_ROTATE` parameter.
- **Mitigation**: Truncates raw log files, resets level to `INFO`, and re-activates rotation.

---

## 6. Verification and Compliance

- **Zero Emojis**: System logs, terminal outputs, and reports contain zero casual emojis.
- **Responsive Layout**: Designed for seamless multi-column viewing on desktop and laptop layouts.
- **Persistent Choice**: Selected theme preferences are saved to `localStorage` and persist automatically.
- **TypeScript Integrity**: Verified clean compilations with no remaining strict compiler warnings.

*Developed by Arjun R.*
