import time
import random
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from app.simulator.incidents import INCIDENT_SCENARIOS

class SimulatorEngine:
    def __init__(self):
        self.active_incident_id: Optional[str] = None
        self.incident_start_time: Optional[float] = None
        self.log_history: List[Dict[str, Any]] = []
        self.last_healthy_tick: float = time.time()
        self.services = ["api-gateway", "payment-service", "auth-service", "notification-service", "audit-logger-service"]
        
        # Prepopulate healthy log history
        self._generate_healthy_logs(count=20)

    def trigger_incident(self, incident_id: str) -> bool:
        if incident_id not in INCIDENT_SCENARIOS:
            return False
        self.active_incident_id = incident_id
        self.incident_start_time = time.time()
        # Add a trigger event log
        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        self.log_history.append({
            "timestamp": now_str,
            "level": "WARN",
            "service": "kube-scheduler",
            "message": f"Simulating incident: {INCIDENT_SCENARIOS[incident_id]['name']} triggered by SRE admin."
        })
        return True

    def resolve_incident(self) -> bool:
        if not self.active_incident_id:
            return False
        
        incident = INCIDENT_SCENARIOS[self.active_incident_id]
        self.active_incident_id = None
        self.incident_start_time = None
        
        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        self.log_history.append({
            "timestamp": now_str,
            "level": "INFO",
            "service": "kube-scheduler",
            "message": f"Remediation action executed. Service {incident['service']} restarted. Metrics returning to healthy baselines."
        })
        # Add normal logs to indicate recovery
        self._generate_healthy_logs(count=5)
        return True

    def _generate_healthy_logs(self, count: int = 5):
        healthy_messages = [
            ("api-gateway", "INFO", "GET /api/v1/health - 200 OK (8ms)"),
            ("api-gateway", "INFO", "POST /api/v1/auth/validate - 200 OK (22ms)"),
            ("auth-service", "INFO", "Verified session token token_jwt_832147. Expiration check completed."),
            ("payment-service", "INFO", "HikariPool-1 - Connection pool status: active=2, idle=8, total=10"),
            ("payment-service", "INFO", "Processed payment request txn_214589. Status: SUCCESS"),
            ("notification-service", "INFO", "SMTP connection pool established. Latency: 12ms"),
            ("notification-service", "INFO", "Dispatched transactional email notification to user_281a."),
            ("audit-logger-service", "INFO", "Persisted transaction event record log_92147."),
            ("audit-logger-service", "INFO", "Flushing buffer to audit database. 3 records processed.")
        ]
        
        base_time = time.time() - (count * 3)
        for i in range(count):
            service, level, msg = random.choice(healthy_messages)
            log_time = base_time + (i * 3)
            time_str = datetime.fromtimestamp(log_time, timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            self.log_history.append({
                "timestamp": time_str,
                "level": level,
                "service": service,
                "message": msg
            })

    def get_current_state(self) -> Dict[str, Any]:
        now = time.time()
        elapsed = 0.0
        if self.active_incident_id and self.incident_start_time:
            elapsed = now - self.incident_start_time

        # Calculate metrics for all services
        metrics = {}
        for s in self.services:
            metrics[s] = self._get_service_metrics(s, elapsed)

        # Get alerts and logs
        alerts = self._get_active_alerts(elapsed)
        logs = self._get_live_logs(elapsed)

        return {
            "active_incident": INCIDENT_SCENARIOS.get(self.active_incident_id) if self.active_incident_id else None,
            "elapsed_seconds": int(elapsed) if self.active_incident_id else 0,
            "metrics": metrics,
            "alerts": alerts,
            "logs": logs[-100:]  # Return the last 100 logs
        }

    def _get_service_metrics(self, service: str, elapsed: float) -> Dict[str, float]:
        # Default healthy baselines
        base_metrics = {
            "cpu": 10.0 + random.uniform(-2, 2),
            "memory": 80.0 + random.uniform(-5, 5),
            "db_connections": 2.0 + random.randint(0, 2),
            "latency": 15.0 + random.uniform(-3, 3),
            "error_rate": 0.0
        }

        # Override for specific service baselines
        if service == "payment-service":
            base_metrics["memory"] = 180.0 + random.uniform(-10, 10)
            base_metrics["db_connections"] = 8.0 + random.randint(-2, 2)
            base_metrics["latency"] = 45.0 + random.uniform(-5, 5)
        elif service == "auth-service":
            base_metrics["memory"] = 120.0 + random.uniform(-8, 8)
            base_metrics["latency"] = 25.0 + random.uniform(-4, 4)
        elif service == "audit-logger-service":
            base_metrics["memory"] = 90.0 + random.uniform(-5, 5)
            base_metrics["latency"] = 30.0 + random.uniform(-5, 5)

        if not self.active_incident_id:
            return base_metrics

        incident = INCIDENT_SCENARIOS[self.active_incident_id]
        if incident["service"] != service and not (service == "api-gateway" and incident["id"] == "API_GATEWAY_TIMEOUT") and not (service == "api-gateway" and incident["id"] == "DB_CONNECTION_EXHAUSTION" and elapsed > 10):
            # Healthy service but impacted slightly if API Gateway starts breaking
            if service == "api-gateway" and incident["id"] == "DB_CONNECTION_EXHAUSTION" and elapsed > 10:
                # Gateway gets affected by downstream failure
                base_metrics["latency"] = min(15000.0, 15.0 + (elapsed - 10) * 1500)
                base_metrics["error_rate"] = min(98.0, (elapsed - 10) * 10)
            return base_metrics

        # Affected service metrics
        behaviors = incident["metric_behavior"]
        for m, behavior in behaviors.items():
            base = behavior["base"]
            target = behavior["anomalous"]
            type_ = behavior["type"]

            if type_ == "stable":
                val = target + random.uniform(-2, 2)
            elif type_ == "spike":
                # Linear ramp up to target over 15 seconds
                factor = min(1.0, elapsed / 15.0)
                val = base + (target - base) * factor
            elif type_ == "growth":
                # Continuous increase over 40 seconds
                factor = min(1.0, elapsed / 40.0)
                val = base + (target - base) * factor
            else:
                val = base

            # Add minor noise
            if m == "db_connections":
                base_metrics[m] = max(0.0, round(val))
            else:
                base_metrics[m] = max(0.0, round(val + random.uniform(-val * 0.05, val * 0.05), 2))

        return base_metrics

    def _get_active_alerts(self, elapsed: float) -> List[Dict[str, Any]]:
        if not self.active_incident_id:
            return []

        incident = INCIDENT_SCENARIOS[self.active_incident_id]
        alerts = []

        if elapsed > 8:
            severity = incident["severity"]
            service = incident["service"]
            
            if incident["id"] == "DB_CONNECTION_EXHAUSTION":
                alerts.append({
                    "id": "ALERT_DB_POOL_EXHAUSTED",
                    "name": "DatabaseConnectionPoolExhausted",
                    "severity": severity,
                    "service": service,
                    "description": "Payment service database connection usage has reached 100% capacity.",
                    "triggered_at": datetime.fromtimestamp(self.incident_start_time + 8, timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
                })
            elif incident["id"] == "AUTH_SERVICE_MEMORY_LEAK":
                alerts.append({
                    "id": "ALERT_CONTAINER_MEMORY_CRITICAL",
                    "name": "ContainerMemoryUsageCritical",
                    "severity": severity,
                    "service": service,
                    "description": "Auth service container memory is exceeding 95% threshold of cgroup limits.",
                    "triggered_at": datetime.fromtimestamp(self.incident_start_time + 8, timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
                })
            elif incident["id"] == "API_GATEWAY_TIMEOUT":
                alerts.append({
                    "id": "ALERT_NGINX_5XX_RATE_HIGH",
                    "name": "NginxGatewayErrorRateSpike",
                    "severity": severity,
                    "service": "api-gateway",
                    "description": "API Gateway upstream error rate exceeded 90% in the last 1 minute.",
                    "triggered_at": datetime.fromtimestamp(self.incident_start_time + 8, timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
                })
            elif incident["id"] == "MISSING_ENV_CONFIG":
                alerts.append({
                    "id": "ALERT_KUBE_POD_CRASH_LOOPING",
                    "name": "KubernetesPodCrashLooping",
                    "severity": severity,
                    "service": service,
                    "description": "Notification service container keeps exiting immediately with status 1.",
                    "triggered_at": datetime.fromtimestamp(self.incident_start_time + 5, timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
                })
            elif incident["id"] == "DISK_SPACE_EXHAUSTION_LOGGER":
                alerts.append({
                    "id": "ALERT_NODE_DISK_FULL",
                    "name": "KubeNodeDiskPressure",
                    "severity": severity,
                    "service": service,
                    "description": "Node disk usage is at 99.8%. Write errors reported.",
                    "triggered_at": datetime.fromtimestamp(self.incident_start_time + 10, timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
                })

        return alerts

    def _get_live_logs(self, elapsed: float) -> List[Dict[str, Any]]:
        # Keep healthy logs buffer but cap it
        if len(self.log_history) > 300:
            self.log_history = self.log_history[-150:]

        # Add casual healthy logs dynamically every few seconds
        now = time.time()
        if now - self.last_healthy_tick > 3.0:
            self._generate_healthy_logs(count=1)
            self.last_healthy_tick = now

        if not self.active_incident_id:
            return self.log_history

        # If incident is active, we stream the incident specific logs over time
        incident = INCIDENT_SCENARIOS[self.active_incident_id]
        logs = incident["log_sequences"]
        
        # We release the logs step-by-step
        # Stage 1: warning logs are emitted in first 5s
        # Stage 2: crash logs are emitted in 5-15s
        # Stage 3: scheduler or retry logs are emitted after 15s
        for idx, log_line in enumerate(logs):
            trigger_delay = idx * 3.0 # Emit a log line every 3 seconds
            if elapsed >= trigger_delay:
                # Calculate time string dynamically so it looks very real
                log_time = self.incident_start_time + trigger_delay
                time_str = datetime.fromtimestamp(log_time, timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
                
                # Extract level, service, message from raw log sequence
                # Format: [LEVEL] YYYY-MM-DDTHH:MM:SSZ - service-name: message
                try:
                    parts = log_line.split(" - ")
                    header = parts[0]
                    content = " - ".join(parts[1:])
                    
                    level = header.split("]")[0].replace("[", "").strip()
                    service_part = content.split(": ")
                    service = service_part[0].strip()
                    message = ": ".join(service_part[1:]).strip()
                except Exception:
                    # Fallback parsing
                    level = "ERROR"
                    service = incident["service"]
                    message = log_line

                # Check if this log has already been appended
                duplicate = False
                for existing in self.log_history:
                    if existing["service"] == service and existing["message"] == message and existing["level"] == level:
                        duplicate = True
                        break
                
                if not duplicate:
                    self.log_history.append({
                        "timestamp": time_str,
                        "level": level,
                        "service": service,
                        "message": message
                    })

        return self.log_history
