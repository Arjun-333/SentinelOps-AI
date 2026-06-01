# SentinelOps AI - Multi-Agent DevOps Incident Response Swarm

SentinelOps AI is an enterprise-grade, autonomous SRE (Site Reliability Engineering) and DevOps incident response platform. Built on an agent swarm architecture using LangGraph, it orchestrates specialized AI nodes to detect anomalies, query RAG databases for runbooks, investigate git commit histories, execute remediation plans, and generate production-ready Markdown postmortem reports.

---

## System Architecture and Workflow

```
[OUTAGE INJECTED]
       │
       ▼
 ┌───────────────┐      Streams Logs, Metrics, & Alerts
 │   Incident    ├────────────────────────────────────────┐
 │   Simulator   │                                        │
 └───────────────┘                                        ▼
                                                 ┌───────────────────┐
                                                 │ Monitoring Agent  │
                                                 └─────────┬─────────┘
                                                           │ (Anomalous Service Isolated)
                                                           ▼
                                                 ┌───────────────────┐
                                                 │     RCA Agent     │ ◄─── Reviews commits, diffs, & logs
                                                 └─────────┬─────────┘
                                                           │
                                             ┌─────────────┴─────────────┐
                                             │ Is confidence > 80%?      │
                                             ├─────────────┬─────────────┤
                                             │ Yes         │ No          │
                                             ▼             ▼             ▼
                                     ┌──────────────┐     ┌──────────────┐
                                     │ Resolution   │     │  Retrieval   │ ◄─── Pulls SRE runbooks & history
                                     │    Agent     │     │    Agent     │
                                     └──────┬───────┘     └──────┬───────┘
                                            │                    │
                                            │                    ▼
                                            │             ┌──────────────┐
                                            │             │   RCA Agent  │ (Re-evaluates with retrieved guides)
                                            │             └──────┬───────┘
                                            │                    │
                                            ▼◄───────────────────┘
                                     ┌──────────────┐
                                     │  Postmortem  │
                                     │    Agent     │ ◄─── Compiles Markdown SRE Incident Postmortem Report
                                     └──────────────┘
```

---

## Technical Features

### 1. Collaborative Agent Swarm
Our LangGraph plexus orchestrates four specialized nodes for investigation and mitigation:
- **Monitoring and Detection Agent**: Parses dynamic telemetry streams and log records to identify anomalies and isolate the affected microservice.
- **Root Cause Analysis (RCA) Agent**: Examines system error traces, container environments, and git repository commits to isolate buggy lines.
- **SRE RAG Retrieval Agent**: Queries a localized semantic vector store of past outages and Kubernetes cheat sheets to fetch relevant runbooks.
- **Postmortem and Resolution Agent**: Formulates step-by-step remediation plans and compiles detailed incident reports.

### 2. SVG Swarm Topology Plexus
An interactive, high-fidelity SVG network topology graph replaces simple visualizations:
- **Active Node Highlighting**: Connects directly to the backend SSE events to illuminate the executing agent node.
- **Animated Data Packets**: Renders sliding packet elements flowing along connection vectors to illustrate system data paths.
- **Dynamic Context Inspector**: Includes an interactive sidebar that displays CPU, memory, and functional specs when clicking nodes.

### 3. Infinite Vocal Uplink & Sound Activation
A secure, hands-free voice command system powered by Web Audio and Web Speech APIs:
- **Clap Spike Trigger**: Uses Web Audio API analyser nodes to monitor sound slopes. A sharp clap or snap spikes volume and automatically powers the uplink.
- **Wake Word Trigger**: Listens silently for the keyword "Sentinel Activate" or "Sentinel" to toggle listening.
- **Persistent Connection**: Uses reference-state monitoring (`isListeningRef`) to automatically restart speech recognition on silence timeouts, ensuring an infinite hands-free link.
- **SRE Action Parser**: Voice commands map directly to dashboard actions:
  - *"Trigger incident" / "Inject fault"* -> Initiates random outage simulation.
  - *"Deploy swarm" / "Analyze logs"* -> Spins up the LangGraph diagnostic team.
  - *"Resolve outage" / "Rollback commit"* -> Reverts the bug and restores systems.
  - *"Status check" / "Explain status"* -> Synthesizes vocal briefings.

### 4. Dynamic Enterprise Theming Engine
Provides five curated, state-of-the-art themes that persist via `localStorage` and dynamically transition background colors, highlighting colors, border-radius layouts, and font hierarchies:
- **Cyber Obsidian (Default)**: Sleek green highlights, round borders, modern sans-serif fonts.
- **Nebula Abyss**: Deep space violet/magenta hues, high rounded container headers, Orbitron sci-fi fonts.
- **Crimson Protocol**: Cyber-alert rose/maroon shades, industrial sharp square panels, Share Tech Mono monospace fonts.
- **Matrix Code**: Retro neon lime highlights, light technical borders, Japanese DotGothic grid styling.
- **Solar Flare**: Aerospace technical amber/orange highlights, compact container sizing, Fira Code font stack.

---

## Simulated Outages

SentinelOps AI simulates real-world production crash scenarios to prove agent reasoning depth:
1. **`DB_CONNECTION_EXHAUSTION` (Severity: CRITICAL)**: An unreleased database socket in `payment-service` threadpool workers starves Hikari connections, triggering 504 Gateway errors.
2. **`AUTH_SERVICE_MEMORY_LEAK` (Severity: HIGH)**: An unbounded global caching variable in `auth-service` leaks V8 heap space, provoking cgroup memory eviction (OOMKilled, ExitCode 137).
3. **`API_GATEWAY_TIMEOUT` (Severity: HIGH)**: Nginx upstream route updates point towards an unregistered internal cluster hostname, leading to proxy read timeouts.
4. **`MISSING_ENV_CONFIG` (Severity: CRITICAL)**: A recently rate-limiter upgrade asserts strict environment checks (`os.environ['REDIS_URL']`) without configuration definitions, placing pods in a persistent `CrashLoopBackOff`.
5. **`DISK_SPACE_EXHAUSTION_LOGGER` (Severity: MEDIUM)**: Disabled log rotation merged with excessive DEBUG level transaction traces triggers host system DiskPressure warnings.

---

## Quickstart Guide

To boot up the SRE Command Center in your local development environment:

### 1. Launch the FastAPI Backend
Initialize the virtual environment and boot the Uvicorn server:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python run.py
```
*The server will start on `http://localhost:8000` with active Server-Sent Events (SSE) channels.*

### 2. Launch the React Frontend
Install npm dependencies and spin up Vite:
```bash
cd frontend
npm install
npm run dev
```
*The dashboard will be served on `http://localhost:5173`.*

---

## Authorship and Credits

Developed and maintained by **Arjun R**.
