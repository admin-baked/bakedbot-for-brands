import os
import threading
import subprocess
import asyncio
import uvicorn
from fastapi import FastAPI, HTTPException
from contextlib import asynccontextmanager
import firebase_admin
from firebase_admin import credentials, firestore
from src.firestore_listener import listen_for_tasks
from dotenv import load_dotenv
import httpx
import json
import re

load_dotenv()

# ============================================================================
# Configuration
# ============================================================================

# NotebookLM MCP server runs internally on this port
NOTEBOOKLM_MCP_PORT = 8001
NOTEBOOKLM_MCP_URL = f"http://localhost:{NOTEBOOKLM_MCP_PORT}/mcp"

# Global state
notebooklm_process = None
mcp_client = None
mcp_session_id = None

# ============================================================================
# Firebase Initialization
# ============================================================================

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
        print(f"[Firebase] Init Error: {e}")
        return None

db_client = initialize_firebase()

# ============================================================================
# Helper Functions
# ============================================================================

def parse_sse_response(text: str):
    """
    Parse Server-Sent Events (SSE) format response.
    Format: "event: message\\ndata: {...}\\n\\n"
    Returns the parsed JSON data.
    """
    try:
        # Extract JSON from SSE format
        # Look for "data: " followed by JSON
        match = re.search(r'data:\s*(\{.*\})', text, re.DOTALL)
        if match:
            json_str = match.group(1)
            return json.loads(json_str)
        # If no SSE format, try parsing as plain JSON
        return json.loads(text)
    except Exception as e:
        print(f"[SSE Parser] Error parsing response: {e}")
        print(f"[SSE Parser] Raw text: {text[:200]}")
        return None

# ============================================================================
# NotebookLM MCP Server Management
# ============================================================================

async def initialize_mcp_session():
    """
    Initialize MCP session with the NotebookLM MCP server.
    Returns session ID if successful, None otherwise.
    """
    global mcp_session_id

    try:
        print("[NotebookLM MCP] Initializing session...")
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                NOTEBOOKLM_MCP_URL,
                json={
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": "initialize",
                    "params": {
                        "protocolVersion": "2024-11-05",
                        "capabilities": {},
                        "clientInfo": {
                            "name": "bakedbot-sidecar",
                            "version": "2.0.0"
                        }
                    }
                },
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json, text/event-stream"
                }
            )

            if response.status_code == 200:
                session_id = response.headers.get("mcp-session-id")
                if session_id:
                    mcp_session_id = session_id
                    print(f"[NotebookLM MCP] Session initialized: {session_id[:16]}...")
                    # Verify the response is valid
                    data = parse_sse_response(response.text)
                    if data and "result" in data:
                        print(f"[NotebookLM MCP] Session capabilities: {data['result'].get('capabilities', {})}")
                    return session_id
                else:
                    print("[NotebookLM MCP] Warning: No session ID in response headers")
            else:
                print(f"[NotebookLM MCP] Session init failed: {response.status_code}")
    except Exception as e:
        print(f"[NotebookLM MCP] Session init error: {e}")

    return None

def start_notebooklm_mcp_server():
    """
    Start the notebooklm-mcp server in HTTP mode as a subprocess.
    Returns the process handle.
    """
    global notebooklm_process

    config_path = os.getenv("NOTEBOOKLM_CONFIG", "notebooklm-config.json")

    # Check if config exists
    if not os.path.exists(config_path):
        print(f"[NotebookLM MCP] Config not found at {config_path}, creating default...")
        default_config = {
            "default_notebook_id": os.getenv("NOTEBOOKLM_NOTEBOOK_ID", ""),
            "headless": True,
            "timeout": 30,
            "debug": False
        }
        with open(config_path, "w") as f:
            json.dump(default_config, f, indent=2)

    try:
        print(f"[NotebookLM MCP] Starting HTTP server on port {NOTEBOOKLM_MCP_PORT}...")
        notebooklm_process = subprocess.Popen(
            [
                "notebooklm-mcp",
                "--config", config_path,
                "server",
                "--transport", "http",
                "--port", str(NOTEBOOKLM_MCP_PORT)
            ],
            stdout=None,
            stderr=None
        )
        print(f"[NotebookLM MCP] Server started with PID {notebooklm_process.pid}")
        return notebooklm_process
    except Exception as e:
        print(f"[NotebookLM MCP] Failed to start: {e}")
        return None

def stop_notebooklm_mcp_server():
    """Stop the notebooklm-mcp subprocess."""
    global notebooklm_process
    if notebooklm_process:
        print("[NotebookLM MCP] Stopping server...")
        notebooklm_process.terminate()
        notebooklm_process.wait()
        notebooklm_process = None

# ============================================================================
# Lifecycle Manager
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("[Sidecar] Starting up...")

    # Start Firestore Listener
    if db_client:
        print("[Sidecar] Starting Firestore Listener Thread...")
        t = threading.Thread(target=listen_for_tasks, args=(db_client,), daemon=True)
        t.start()
    else:
        print("[Sidecar] DB Client not ready, listener skipped.")

    # Start NotebookLM MCP Server (if enabled)
    if os.getenv("ENABLE_NOTEBOOKLM_MCP", "false").lower() == "true":
        start_notebooklm_mcp_server()
        # Give it time to start
        await asyncio.sleep(2)
        # Initialize MCP session
        await initialize_mcp_session()

    yield

    # Shutdown
    print("[Sidecar] Shutting down...")
    stop_notebooklm_mcp_server()

# ============================================================================
# FastAPI App
# ============================================================================

from pydantic import BaseModel
from typing import Dict, Any, Optional, List

app = FastAPI(
    title="BakedBot Python Sidecar",
    description="Remote sidecar for Big Worm agent - NotebookLLM MCP Bridge",
    version="2.0.0",
    lifespan=lifespan
)

class McpToolRequest(BaseModel):
    tool_name: str
    arguments: Dict[str, Any]

class McpToolInfo(BaseModel):
    name: str
    description: str
    inputSchema: Dict[str, Any] = {}

# ============================================================================
# Health & Info Endpoints
# ============================================================================

@app.get("/")
def health_check():
    """Cloud Run Health Check"""
    return {
        "status": "running",
        "service": "bigworm-sidecar",
        "version": "2.0.0",
        "features": {
            "notebooklm_mcp": os.getenv("ENABLE_NOTEBOOKLM_MCP", "false").lower() == "true",
            "firestore_listener": db_client is not None
        }
    }

@app.get("/health")
def detailed_health():
    """Detailed health check for monitoring"""
    return {
        "status": "healthy",
        "notebooklm_mcp": {
            "enabled": os.getenv("ENABLE_NOTEBOOKLM_MCP", "false").lower() == "true",
            "process_running": notebooklm_process is not None and notebooklm_process.poll() is None,
            "session_id": mcp_session_id[:16] + "..." if mcp_session_id else None
        },
        "firebase": {
            "connected": db_client is not None
        }
    }

# ============================================================================
# MCP Bridge Endpoints
# ============================================================================

@app.get("/mcp/list")
async def list_mcp_tools() -> List[McpToolInfo]:
    """
    List available NotebookLLM MCP tools.
    If the internal MCP server is running, query it. Otherwise return known tools.
    """
    # Check if internal MCP server is running
    if notebooklm_process and notebooklm_process.poll() is None:
        try:
            headers = {
                "Content-Type": "application/json",
                "Accept": "application/json, text/event-stream"
            }
            # Include session ID if available
            if mcp_session_id:
                headers["mcp-session-id"] = mcp_session_id

            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    NOTEBOOKLM_MCP_URL,
                    json={
                        "jsonrpc": "2.0",
                        "id": 1,
                        "method": "tools/list",
                        "params": {}
                    },
                    headers=headers
                )
                if response.status_code == 200:
                    # Parse SSE response
                    data = parse_sse_response(response.text)
                    if data and "result" in data and "tools" in data["result"]:
                        return [McpToolInfo(**t) for t in data["result"]["tools"]]
        except Exception as e:
            print(f"[MCP] Failed to query internal server: {e}")

    # Fallback: Return known NotebookLLM MCP tools
    return [
        McpToolInfo(
            name="healthcheck",
            description="Check server health status",
            inputSchema={}
        ),
        McpToolInfo(
            name="chat_with_notebook",
            description="Send a message to NotebookLM and get a grounded response",
            inputSchema={
                "type": "object",
                "properties": {
                    "message": {"type": "string", "description": "The message to send"},
                    "notebook_id": {"type": "string", "description": "Optional notebook ID"}
                },
                "required": ["message"]
            }
        ),
        McpToolInfo(
            name="send_chat_message",
            description="Send a chat message without waiting for response",
            inputSchema={
                "type": "object",
                "properties": {
                    "message": {"type": "string"},
                    "wait_for_response": {"type": "boolean", "default": False}
                },
                "required": ["message"]
            }
        ),
        McpToolInfo(
            name="get_chat_response",
            description="Get the response from NotebookLM",
            inputSchema={
                "type": "object",
                "properties": {
                    "timeout": {"type": "integer", "default": 30}
                }
            }
        ),
        McpToolInfo(
            name="navigate_to_notebook",
            description="Navigate to a specific notebook",
            inputSchema={
                "type": "object",
                "properties": {
                    "notebook_id": {"type": "string"}
                },
                "required": ["notebook_id"]
            }
        ),
        McpToolInfo(
            name="get_default_notebook",
            description="Get the currently active notebook",
            inputSchema={}
        ),
        McpToolInfo(
            name="set_default_notebook",
            description="Set the default notebook",
            inputSchema={
                "type": "object",
                "properties": {
                    "notebook_id": {"type": "string"}
                },
                "required": ["notebook_id"]
            }
        )
    ]

@app.post("/mcp/call")
async def call_mcp_tool(request: McpToolRequest):
    """
    Bridge to NotebookLLM MCP - forwards tool calls to the internal MCP server.
    """
    # Check if internal MCP server is running
    if notebooklm_process and notebooklm_process.poll() is None:
        try:
            headers = {
                "Content-Type": "application/json",
                "Accept": "application/json, text/event-stream"
            }
            # Include session ID if available
            if mcp_session_id:
                headers["mcp-session-id"] = mcp_session_id
            else:
                # Try to reinitialize session if missing
                await initialize_mcp_session()
                if mcp_session_id:
                    headers["mcp-session-id"] = mcp_session_id

            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    NOTEBOOKLM_MCP_URL,
                    json={
                        "jsonrpc": "2.0",
                        "id": 1,
                        "method": "tools/call",
                        "params": {
                            "name": request.tool_name,
                            "arguments": request.arguments
                        }
                    },
                    headers=headers
                )

                if response.status_code == 200:
                    # Parse SSE response
                    data = parse_sse_response(response.text)
                    if not data:
                        return {"success": False, "error": "Failed to parse MCP response"}
                    if "error" in data:
                        return {"success": False, "error": data["error"]}
                    return {
                        "success": True,
                        "tool": request.tool_name,
                        "result": data.get("result", {}).get("content", data.get("result"))
                    }
                else:
                    # Log error details
                    error_text = response.text[:500] if response.text else "No response body"
                    print(f"[MCP Call] Error {response.status_code}: {error_text}")
                    return {
                        "success": False,
                        "error": f"MCP server returned {response.status_code}",
                        "details": error_text
                    }
        except httpx.TimeoutException:
            return {"success": False, "error": "MCP call timed out"}
        except Exception as e:
            return {"success": False, "error": f"MCP call failed: {str(e)}"}

    # Fallback: MCP server not running - return informative error
    if os.getenv("ENABLE_NOTEBOOKLM_MCP", "false").lower() != "true":
        return {
            "success": False,
            "error": "NotebookLM MCP is not enabled. Set ENABLE_NOTEBOOKLM_MCP=true and provide NOTEBOOKLM_NOTEBOOK_ID.",
            "hint": "Run: notebooklm-mcp init https://notebooklm.google.com/notebook/YOUR_ID"
        }

    return {
        "success": False,
        "error": "NotebookLM MCP server is not running",
        "tool": request.tool_name
    }

# ============================================================================
# Legacy Execute Endpoint (for backward compatibility)
# ============================================================================

class ExecuteRequest(BaseModel):
    action: str
    data: Dict[str, Any] = {}

@app.post("/execute")
async def execute_action(request: ExecuteRequest):
    """
    Legacy execute endpoint for backward compatibility with existing code.
    """
    if request.action == "test":
        return {"status": "success", "message": "Sidecar is operational"}

    if request.action == "mcp_call":
        # Route to MCP endpoint
        mcp_request = McpToolRequest(
            tool_name=request.data.get("tool_name", ""),
            arguments=request.data.get("arguments", {})
        )
        return await call_mcp_tool(mcp_request)

    return {"status": "error", "message": f"Unknown action: {request.action}"}

# ============================================================================
# Main Entry Point
# ============================================================================

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    print(f"[Sidecar] Starting on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)
