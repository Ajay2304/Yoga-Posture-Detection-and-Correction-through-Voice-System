# Yoga Pose Detection AI

An advanced, interactive full-stack Yoga tracking web application that uses computer vision to analyze your posture and provide real-time coaching corrections.

## Features

- **Live Body Tracking:** Tracks 33 key body landmarks locally inside your browser via MediaPipe Tasks Vision.
- **Intention Detection:** Automatically detects whether you are intending to perform a Mountain Pose, Tree Pose, Warrior I, Warrior II, or Cobra Pose.
- **Form Correction Engine:** Calculates precise limb and joint angles to provide granular, specific form corrections (e.g. "Lunge deeper on the front leg").
- **Voice Feedback Integration:** Speaks coaching hints directly via the browser's TTS Engine.
- **Guided Practice Split-Screen:** Choose a specific pose and practice side-by-side with reference AI images, a real-time tracking badge, and telemetry read-outs.

## Technology Stack

### Frontend
- **Framework:** React + Vite + TypeScript
- **Styling:** Custom plain CSS with dark mode, glassmorphism, and custom animations.
- **AI Tracking:** MediaPipe Tasks-Vision `PoseLandmarker`
- **Communications:** WebSockets (`react-use-websocket`)

### Backend 
- **Framework:** FastAPI / Python
- **Engine Math:** Local heuristic detection rules handling the 33 3D-points payload.

## Core Setup Instructions

### 1. Backend Setup
1. CD into the `backend/` directory.
2. Ensure you have Python installed. Create a virtual environment (`python -m venv venv`) and activate it.
3. Install the required dependencies:
```bash
pip install -r requirements.txt
```
*(If you do not see a requirements.txt file, ensure `fastapi`, `uvicorn`, `websockets`, and `pydantic` are installed).*
4. Run the development server:
```bash
python -m uvicorn main:app --reload
```
The server will boot up and handle the WebSocket logic on `ws://localhost:8000/ws/pose`.

### 2. Frontend Setup
1. CD into the `frontend/` directory.
2. Install the node packages:
```bash
npm install
```
3. Run the Vite development server:
```bash
npm run dev
```
4. Click the localhost link (`http://localhost:5173`) in your terminal to launch the UI.

## File Breakdown

- `frontend/src/App.tsx`: React structure managing the media streams, WebSocket handshakes, TTS debouncers, and layout.
- `backend/logic/engine.py`: Python mathematical algorithm evaluating spatial dimensions, angles, and formulating the contextual string voice corrections based on the body rules.
- `frontend/src/index.css`: Beautiful custom styling system providing immersive feedback states.
- `backend/main.py`: The single WebSocket mount bridging Python inferences with the browser data.
