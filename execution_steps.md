# How to Run the Project

## Option 1: Using the provided script (Recommended)
Simply double-click on the `run_project.bat` file located in the root folder (`d:\project - clg\Yoga-Posture-Detection-and-Correction-through-Voice-System`).
This script will automatically:
1. Create a Python virtual environment for the backend if it doesn't exist.
2. Install all background required dependencies (`requirements.txt`).
3. Start the FastAPI backend server in a new command window.
4. Install all frontend Node dependencies (`npm install`).
5. Start the React frontend development server in a new command window.

## Option 2: Manual Execution

### Backend Setup
1. Open a terminal and navigate to the `backend` directory: `cd backend`
2. Create a virtual environment: `python -m venv venv`
3. Activate the virtual environment:
   - On Windows: `.\venv\Scripts\activate`
4. Install dependencies: `pip install -r requirements.txt`
5. Run the server: `python -m uvicorn main:app --reload`
The backend WebSockets server will run on `ws://localhost:8000/ws/pose`.

### Frontend Setup
1. Open a new terminal and navigate to the `frontend` directory: `cd frontend`
2. Install dependencies: `npm install`
3. Start the React app: `npm run dev`
4. The frontend URL will appear in the terminal (usually `http://localhost:5173`). Open that link in your browser to launch the UI.
