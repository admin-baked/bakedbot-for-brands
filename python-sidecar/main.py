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

app = FastAPI(lifespan=lifespan)

@app.get("/")
def health_check():
    """Cloud Run Health Check"""
    return {"status": "running", "service": "smokey-research-sidecar"}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
