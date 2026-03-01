import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import json
import asyncio
from logic.engine import evaluate_pose, PosePayload, Landmark

app = FastAPI(title="Yoga Pose Detection API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routes
@app.get("/api")
def read_root():
    return {"message": "Welcome to the Yoga API"}

@app.websocket("/ws/pose")
async def websocket_pose_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    try:
        while True:
            # Receive landmarks from frontend JSON
            data = await websocket.receive_text()
            payload = json.loads(data)
            
            # Simple validation to see if we have landmarks
            if "landmarks" not in payload or not isinstance(payload["landmarks"], list):
                await websocket.send_json({"error": "Invalid payload format."})
                continue
                
            landmarks = [Landmark(**lm) for lm in payload["landmarks"]]
            target_pose = payload.get("target_pose")
            
            # Process and evaluate pose
            result = evaluate_pose(landmarks, target_pose)
            
            # Send results back
            await websocket.send_json(result)
            
    except WebSocketDisconnect:
        print("Client disconnected.")
    except Exception as e:
        print(f"Error processing websocket: {str(e)}")

# Serve frontend for production
frontend_dist = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.isdir(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_static(full_path: str):
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))