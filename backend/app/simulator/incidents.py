from typing import Dict, Any, List

INCIDENT_SCENARIOS: Dict[str, Dict[str, Any]] = {
    "DB_CONNECTION_EXHAUSTION": {
        "id": "DB_CONNECTION_EXHAUSTION",
        "name": "Database Connection Exhaustion",
        "severity": "CRITICAL",
        "service": "payment-service",
        "description": "The microservice is unable to acquire database connections, causing API timeouts and connection failure errors.",
        "clues": {
            "recent_deployments": [
                {
                    "version": "v1.8.2",
                    "deployed_at": "5 minutes ago",
                    "service": "payment-service",
                    "commit_id": "8f3c7e2",
                    "author": "Devin SRE",
                    "message": "fix: batch process payments in parallel threadpool",
                    "diff": """diff --git a/services/payment-service/db.py b/services/payment-service/db.py
index a54b2d1..8f3c7e2 100644
--- a/services/payment-service/db.py
+++ b/services/payment-service/db.py
@@ -12,8 +12,12 @@ def process_payment_batch(payments):
     pool = get_connection_pool()
     threads = []
     for payment in payments:
-        conn = pool.get_connection()
-        t = threading.Thread(target=run_transaction, args=(conn, payment))
-        threads.append(t)
-        t.start()
+        # Refactored to fetch connection inside thread context for thread safety
+        def run_in_thread(pay):
+            conn = pool.get_connection() # Connection acquired
+            cursor = conn.cursor()
+            cursor.execute("UPDATE accounts SET balance = balance - %s WHERE id = %s", (pay.amount, pay.user_id))
+            # WARNING: missing conn.close() or conn.release()! Connection is leaked!
+        
+        t = threading.Thread(target=run_in_thread, args=(payment,))
+        t.start()"""
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
            "cpu": {"base": 15.0, "anomalous": 85.0, "type": "spike"},
            "memory": {"base": 180.0, "anomalous": 210.0, "type": "stable"},
            "db_connections": {"base": 8.0, "anomalous": 100.0, "type": "spike"},
            "latency": {"base": 45.0, "anomalous": 15000.0, "type": "spike"},
            "error_rate": {"base": 0.05, "anomalous": 98.5, "type": "spike"}
        },
        "log_sequences": [
            "[INFO] 2026-05-27T15:01:22Z - payment-service: Batch process payment started for 25 items.",
            "[INFO] 2026-05-27T15:01:23Z - payment-service: Spawning parallel database executor threads...",
            "[WARN] 2026-05-27T15:01:45Z - payment-service: HikariPool-1 - Connection acquisition timeout approaching (30000ms).",
            "[ERROR] 2026-05-27T15:02:15Z - payment-service: ConnectionTimeoutError: HikariPool-1 - Connection is not available, request timed out after 30005ms.",
            "[ERROR] 2026-05-27T15:02:15Z - payment-service: Internal Database Pool Exception: PostgreSQL FATAL: remaining connection slots are reserved for non-replication superuser connections.",
            "[ERROR] 2026-05-27T15:02:16Z - payment-service: Failed to process payment txn_9238472. Stacktrace:\n  File \"/app/services/payment-service/db.py\", line 16, in run_in_thread\n    conn = pool.get_connection()\n  File \"/usr/local/lib/python3.10/site-packages/db_pool.py\", line 82, in get_connection\n    raise ConnectionTimeoutError(\"HikariPool-1 - Timeout acquiring connection\")\nConnectionTimeoutError: HikariPool-1 - Timeout acquiring connection",
            "[ERROR] 2026-05-27T15:02:20Z - api-gateway: [504 Gateway Timeout] GET /api/v1/payments/checkout - upstream timeout on payment-service"
        ],
        "remediation_docs": "Standard SRE Runbook: [DB_CONNECTION_LEAKS]\nEnsure all connection acquisition blocks use try/finally or with context managers. Check recent pull requests for threaded workers spawning database sessions without explicit cleanup closures."
    },
    "AUTH_SERVICE_MEMORY_LEAK": {
        "id": "AUTH_SERVICE_MEMORY_LEAK",
        "name": "Auth Service Memory Leak",
        "severity": "HIGH",
        "service": "auth-service",
        "description": "Auth service heap size is increasing linearly, indicating a typical memory leak, eventually causing an Out-Of-Memory (OOM) crash.",
        "clues": {
            "recent_deployments": [
                {
                    "version": "v2.4.1",
                    "deployed_at": "15 minutes ago",
                    "service": "auth-service",
                    "commit_id": "3f9c2d1",
                    "author": "Alice Dev",
                    "message": "feat: cache user JWT permissions in-memory for speed",
                    "diff": """diff --git a/services/auth-service/cache.js b/services/auth-service/cache.js
index b827e1f..3f9c2d1 100644
--- a/services/auth-service/cache.js
+++ b/services/auth-service/cache.js
@@ -1,7 +1,11 @@
-const redis = require('./redis');
+// Cache session state in local memory to reduce Redis latency
+const tokenCache = {};
 
 function cacheToken(token, userPayload) {
-  return redis.set(token, JSON.stringify(userPayload), 'EX', 3600);
+  // Store in global memory map
+  tokenCache[token] = {
+    payload: userPayload,
+    timestamp: Date.now()
+    // CRITICAL BUG: No expiration, eviction, or memory limits. In-memory map grows indefinitely.
+  };
 }"""
                }
            ],
            "container_health": {
                "status": "CrashLoopBackOff",
                "restart_count": 3,
                "cpu_limit": "1000m",
                "memory_limit": "512Mi"
            }
        },
        "metric_behavior": {
            "cpu": {"base": 20.0, "anomalous": 95.0, "type": "growth"},
            "memory": {"base": 120.0, "anomalous": 510.0, "type": "growth"},
            "db_connections": {"base": 5.0, "anomalous": 5.0, "type": "stable"},
            "latency": {"base": 25.0, "anomalous": 320.0, "type": "growth"},
            "error_rate": {"base": 0.01, "anomalous": 40.0, "type": "growth"}
        },
        "log_sequences": [
            "[INFO] 2026-05-27T15:10:00Z - auth-service: Version v2.4.1 boot sequence completed.",
            "[INFO] 2026-05-27T15:11:15Z - auth-service: In-memory token permissions cache activated.",
            "[WARN] 2026-05-27T15:12:30Z - auth-service: V8 garbage collection taking > 2500ms. Heap size currently 412MB / 512MB.",
            "[WARN] 2026-05-27T15:13:00Z - auth-service: Dangerously high memory consumption detected. Node.js heap approaching physical limit.",
            "[ERROR] 2026-05-27T15:13:12Z - auth-service: FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory",
            "[CRITICAL] 2026-05-27T15:13:13Z - kube-scheduler: Pod 'auth-service-v2.4.1-8d2a1c' terminated with ExitCode: 137 (OOMKilled)",
            "[ERROR] 2026-05-27T15:13:15Z - api-gateway: [502 Bad Gateway] POST /api/v1/auth/validate - Connection refused"
        ],
        "remediation_docs": "Standard SRE Runbook: [OOM_KILLED_NODEJS]\nNode process heap exhaustion is typically caused by local global maps caching unbounded tokens or data. Recommend rollback to v2.4.0 (commit 3f9c2d1 reversal) and enforce Redis external key expiration."
    },
    "API_GATEWAY_TIMEOUT": {
        "id": "API_GATEWAY_TIMEOUT",
        "name": "API Gateway Route Timeout",
        "severity": "HIGH",
        "service": "api-gateway",
        "description": "API Gateway is getting 504 read timeouts on routes bound to the user-service microservice.",
        "clues": {
            "recent_deployments": [
                {
                    "version": "v1.2.0",
                    "deployed_at": "1 hour ago",
                    "service": "api-gateway",
                    "commit_id": "4d8b122",
                    "author": "Alice Dev",
                    "message": "refactor: upgrade upstream network connection timeouts",
                    "diff": """diff --git a/gateway/nginx.conf b/gateway/nginx.conf
index 281ab72..4d8b122 100644
--- a/gateway/nginx.conf
+++ b/gateway/nginx.conf
@@ -24,8 +24,8 @@ http {
     location /api/v1/users {
-        proxy_pass http://user-service:8080;
-        proxy_read_timeout 3s;
+        # Swapped to internal cluster hostname override
+        proxy_pass http://user-service-internal.prod.svc.cluster.local:8080;
+        proxy_read_timeout 30s; # Increased to handle slow analytics queries
     }"""
                }
            ],
            "container_health": {
                "status": "Running",
                "restart_count": 0,
                "cpu_limit": "500m",
                "memory_limit": "256Mi"
            }
        },
        "metric_behavior": {
            "cpu": {"base": 10.0, "anomalous": 12.0, "type": "stable"},
            "memory": {"base": 80.0, "anomalous": 82.0, "type": "stable"},
            "db_connections": {"base": 0.0, "anomalous": 0.0, "type": "stable"},
            "latency": {"base": 15.0, "anomalous": 30000.0, "type": "spike"},
            "error_rate": {"base": 0.0, "anomalous": 100.0, "type": "spike"}
        },
        "log_sequences": [
            "[INFO] 2026-05-27T15:20:00Z - api-gateway: Nginx configuration reloaded successfully.",
            "[INFO] 2026-05-27T15:20:15Z - api-gateway: Routing GET /api/v1/users/profile to user-service-internal.prod.svc.cluster.local...",
            "[WARN] 2026-05-27T15:20:30Z - api-gateway: Upstream timeout occurred while reading response header from user-service.",
            "[ERROR] 2026-05-27T15:20:45Z - api-gateway: Nginx upstream error: [ETIMEDOUT] connection timed out while connecting to upstream user-service-internal.prod.svc.cluster.local:8080.",
            "[ERROR] 2026-05-27T15:20:45Z - api-gateway: [504 Gateway Timeout] GET /api/v1/users/profile - 0 bytes returned in 30005ms."
        ],
        "remediation_docs": "Standard SRE Runbook: [DNS_UPSTREAM_MISMATCH]\nNginx upstream route timeouts typically indicate networking failures in service discovery or DNS name resolution inside the Kubernetes VPC. Check CoreDNS logs or check if the upstream service name is registered."
    },
    "MISSING_ENV_CONFIG": {
        "id": "MISSING_ENV_CONFIG",
        "name": "Missing Production Env Config",
        "severity": "CRITICAL",
        "service": "notification-service",
        "description": "Notification service fails to boot and crashes immediately, triggering a CrashLoopBackOff due to a missing REDIS_URL environment variable.",
        "clues": {
            "recent_deployments": [
                {
                    "version": "v1.1.2",
                    "deployed_at": "2 minutes ago",
                    "service": "notification-service",
                    "commit_id": "7a8b9c0",
                    "author": "Bob SRE",
                    "message": "feat: introduce redis rate-limiter for notifications",
                    "diff": """diff --git a/services/notification-service/main.py b/services/notification-service/main.py
index c12b881..7a8b9c0 100644
--- a/services/notification-service/main.py
+++ b/services/notification-service/main.py
@@ -10,6 +10,10 @@ def init_app():
     # Added Redis client setup for rate limiter
-    # redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
+    # Enforce database configurations strictly in production
+    redis_url = os.environ['REDIS_URL'] # Crash: key error if not set!
     app.state.redis = redis.from_url(redis_url)"""
                }
            ],
            "container_health": {
                "status": "CrashLoopBackOff",
                "restart_count": 5,
                "cpu_limit": "200m",
                "memory_limit": "128Mi"
            }
        },
        "metric_behavior": {
            "cpu": {"base": 5.0, "anomalous": 0.0, "type": "stable"},
            "memory": {"base": 50.0, "anomalous": 0.0, "type": "stable"},
            "db_connections": {"base": 0.0, "anomalous": 0.0, "type": "stable"},
            "latency": {"base": 10.0, "anomalous": 0.0, "type": "stable"},
            "error_rate": {"base": 0.0, "anomalous": 100.0, "type": "spike"}
        },
        "log_sequences": [
            "[INFO] 2026-05-27T15:25:00Z - kube-scheduler: Pod 'notification-service-7a8b9c0-9d2a' scheduled to Node k8s-node-3.",
            "[INFO] 2026-05-27T15:25:01Z - kubelet: Container image 'prod-registry/notification-service:v1.1.2' pulled successfully.",
            "[INFO] 2026-05-27T15:25:01Z - kubelet: Started container notification-service.",
            "[ERROR] 2026-05-27T15:25:02Z - notification-service: Traceback (most recent call):",
            "[ERROR] 2026-05-27T15:25:02Z - notification-service:   File \"/app/main.py\", line 15, in <module>\n    init_app()",
            "[ERROR] 2026-05-27T15:25:02Z - notification-service:   File \"/app/main.py\", line 12, in init_app\n    redis_url = os.environ['REDIS_URL']",
            "[ERROR] 2026-05-27T15:25:02Z - notification-service:   File \"/usr/lib/python3.10/os.py\", line 679, in __getitem__\n    raise KeyError(key) from None\nKeyError: 'REDIS_URL'",
            "[CRITICAL] 2026-05-27T15:25:03Z - kubelet: Container notification-service exited with status 1 (Error). Restarting in 10s..."
        ],
        "remediation_docs": "Standard SRE Runbook: [ENV_CONFIG_MISSING]\nEnsure all production environment variables are synchronized in the deployment charts or ConfigMaps. If os.environ['VAR'] is added, update Helm templates to map values."
    },
    "DISK_SPACE_EXHAUSTION_LOGGER": {
        "id": "DISK_SPACE_EXHAUSTION_LOGGER",
        "name": "Audit Logger Disk Exhaustion",
        "severity": "MEDIUM",
        "service": "audit-logger-service",
        "description": "Log service is storing massive raw logs, exhausting root volume disk space and causing file write errors.",
        "clues": {
            "recent_deployments": [
                {
                    "version": "v1.0.5",
                    "deployed_at": "30 minutes ago",
                    "service": "audit-logger-service",
                    "commit_id": "9d8e7c6",
                    "author": "Charlie Dev",
                    "message": "debug: set log severity level to DEBUG to trace local database connections",
                    "diff": """diff --git a/services/audit-service/config.py b/services/audit-service/config.py
index a128db1..9d8e7c6 100644
--- a/services/audit-service/config.py
+++ b/services/audit-service/config.py
@@ -5,5 +5,5 @@ class Config:
-    LOG_LEVEL = "INFO"
+    LOG_LEVEL = "DEBUG" # Changed to trace heavy database payloads
     LOG_PATH = "/var/log/audit.log"
-    LOG_ROTATE = True
+    LOG_ROTATE = False # Disabled temporarily for complete transaction tracing"""
                }
            ],
            "container_health": {
                "status": "Running",
                "restart_count": 0,
                "cpu_limit": "500m",
                "memory_limit": "256Mi"
            }
        },
        "metric_behavior": {
            "cpu": {"base": 12.0, "anomalous": 45.0, "type": "spike"},
            "memory": {"base": 90.0, "anomalous": 180.0, "type": "stable"},
            "db_connections": {"base": 1.0, "anomalous": 1.0, "type": "stable"},
            "latency": {"base": 30.0, "anomalous": 800.0, "type": "growth"},
            "error_rate": {"base": 0.0, "anomalous": 75.0, "type": "spike"}
        },
        "log_sequences": [
            "[INFO] 2026-05-27T15:30:00Z - audit-logger-service: Service startup in DEBUG trace mode.",
            "[DEBUG] 2026-05-27T15:30:10Z - audit-logger-service: Payload trace: txn_id=98234, data={'amount': 100, 'meta': '...'}",
            "[WARN] 2026-05-27T15:31:00Z - kubelet: Volume 'log-volume' disk usage exceeded warning threshold (85%).",
            "[WARN] 2026-05-27T15:32:00Z - kubelet: Disk usage critical on Node k8s-node-3: 98% disk capacity reached.",
            "[ERROR] 2026-05-27T15:32:15Z - audit-logger-service: IOError: [Errno 28] No space left on device: '/var/log/audit.log'",
            "[ERROR] 2026-05-27T15:32:16Z - audit-logger-service: Failed to persist transaction log: database write aborted."
        ],
        "remediation_docs": "Standard SRE Runbook: [DISK_EXHAUSTION_LOGS]\nLog exhaustion is caused by excessive logging or missing log rotation. Fix: Re-enable LOG_ROTATE or change LOG_LEVEL to INFO or WARN."
    }
}
