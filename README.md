# SentinelOps AI – Multi-Agent DevOps Incident Response Swarm

SentinelOps AI is a next-generation, autonomous SRE and DevOps incident response platform. Built on an **Agent Swarm architecture** using **LangGraph**, it acts as an intelligent, automated operations team. When system anomalies or deployment failures arise, the orchestrator triggers specialized AI agents that collaborate in parallel, retrieve context from internal SRE runbooks, isolate the root cause code commits, apply patches, and auto-compile standard Markdown incident postmortems.

---

##  System Architecture & Workflow

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

##  The Specialized Agent Swarm

Our LangGraph network orchestrates four specialized agents to perform collaborative investigation:
1. **Monitoring & Detection Agent**: Continuously parses dynamic telemetry streams and log records to identify anomalies and isolate the affected service.
2. **Root Cause Analysis (RCA) Agent**: Examines error traces, container status parameters, and git repository deployment commits to locate the exact buggy line of code.
3. **SRE RAG Retrieval Agent**: Leverages a local TF-IDF semantic database containing Kubernetes cheat sheets, database pool parameters, and past outage postmortems to supply historical recovery playbooks.
4. **Postmortem & Resolution Agent**: Drafts step-by-step remediation plans and compiles an executive SRE postmortem report detailing the timeline and mitigation paths.

---

## ⚡ The Five Simulated Outages

SentinelOps AI simulates real-world production crash scenarios to prove agent reasoning depth:
1. **`DB_CONNECTION_EXHAUSTION` (Severity: CRITICAL)**: An unreleased database socket in `payment-service` threadpool workers starves Hikari connections, triggering 504 Gateway errors.
2. **`AUTH_SERVICE_MEMORY_LEAK` (Severity: HIGH)**: An unbounded global caching variable in `auth-service` leaks V8 heap space, provoking cgroup memory eviction (OOMKilled, ExitCode 137).
3. **`API_GATEWAY_TIMEOUT` (Severity: HIGH)**: Nginx upstream route updates point towards an unregistered internal cluster hostname, leading to proxy read timeouts.
4. **`MISSING_ENV_CONFIG` (Severity: CRITICAL)**: A recently rate-limiter upgrade asserts strict environment checks (`os.environ['REDIS_URL']`) without configuration definitions, placing pods in a persistent `CrashLoopBackOff`.
5. **`DISK_SPACE_EXHAUSTION_LOGGER` (Severity: MEDIUM)**: Disabled log rotation merged with excessive DEBUG level transaction traces triggers host system DiskPressure warnings.

---

##  Quickstart Guide

To boot up the SRE Command Center in your local development environment, follow these steps:

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

##  Cybersecurity Aesthetics

SentinelOps AI is dressed in a **gorgeous cyberpunk SRE interface**:
- **Frosted Glassmorphism**: Cards styled with dynamic backdrop filters (`backdrop-blur`) and thin borders that floatingly overlay our deep radial canvas grid.
- **Pulsing Topology Map**: An interactive SVG representation of our LangGraph swarm that lights up and expands active nodes while streaming real-time thoughts.
- **Live Metrics Panels**: Plotting real-time gauges representing RAM/CPU quotas and database thresholds with smooth animations.
- **Rich Markdown Reader**: A formatted SRE review sheet that instantly compiles postmortem timelines and features single-click copying.
