import os
import threading
import uvicorn
from fastapi import FastAPI
from contextlib import asynccontextmanager
import firebase_admin
from firebase_admin import credentials, firestore
from src.firestore_listener import listen_for_tasks
from dotenv import load_dotenv

load_dotenv()

# Initialize Firebase
def initialize_firebase():
    try:
        if not firebase_admin._apps:
            if os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY"):
                cred = credentials.Certificate(os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY"))
                firebase_admin.initialize_app(cred)
            else:
                firebase_admin.initialize_app()
        return firestore.client()
    except Exception as e:
        print(f"❌ Firebase Init Error: {e}")
        return None

db_client = initialize_firebase()

# Lifecycle Manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Launch Listener in Background Thread
    if db_client:
        print("🚀 Starting Firestore Listener Thread...")
        t = threading.Thread(target=listen_for_tasks, args=(db_client,), daemon=True)
        t.start()
    else:
        print("⚠️ DB Client not ready, listener skipped.")
    
    yield
    # Shutdown logic (if any)

from pydantic import BaseModel
from typing import Dict, Any, Optional

app = FastAPI(lifespan=lifespan)

class McpToolRequest(BaseModel):
    tool_name: str
    arguments: Dict[str, Any]

@app.get("/")
def health_check():
    """Cloud Run Health Check"""
    return {"status": "running", "service": "bigworm-sidecar-remote"}

@app.post("/mcp/call")
async def call_mcp_tool(request: McpToolRequest):
    """
    Bridge to NotebookLLM MCP
    In a real implementation, this would use the notebooklm-mcp package
    to execute the tool and return its content.
    """
    try:
        # Note: In Cloud Run, we would initialize the MCP client here or in lifespan
        # For now, providing the structure for integration.
        return {
            "success": True,
            "tool": request.tool_name,
            "result": f"MOCK RESULT for {request.tool_name} with {len(request.arguments)} args"
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
