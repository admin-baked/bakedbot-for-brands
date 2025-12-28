import os
import time
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv
from src.firestore_listener import listen_for_tasks

# Load environment variables
load_dotenv()

def initialize_firebase():
    """Initializes Firebase Admin SDK."""
    try:
        # Use Application Default Credentials (Cloud Run) or local key
        if os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY"):
            cred = credentials.Certificate(os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY"))
            firebase_admin.initialize_app(cred)
        else:
            # Default for Cloud Run (uses metadata server)
            firebase_admin.initialize_app()
        
        print("✅ [Main] Firebase initialized successfully.")
        return firestore.client()
    except Exception as e:
        print(f"❌ [Main] Firebase initialization failed: {e}")
        raise e

def main():
    print("🚀 [Main] Starting Smokey Deep Research Sidecar...")
    
    db = initialize_firebase()
    
    # Start the listener loop
    # In production, this might be a webhook handler or a more robust queue consumer
    listen_for_tasks(db)

if __name__ == "__main__":
    main()
