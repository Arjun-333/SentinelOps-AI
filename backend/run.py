import uvicorn
from app.config import Config

if __name__ == "__main__":
    print(" Starting SentinelOps AI Multi-Agent Backend Server...")
    print(f" Serving on http://localhost:8000")
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
