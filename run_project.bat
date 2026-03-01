@echo off
echo Starting Yoga Posture Detection Project...

echo Setting up and starting backend...
cd backend
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)
call venv\Scripts\activate.bat
echo Installing backend requirements...
pip install -r requirements.txt
start "Yoga Backend" cmd /k "python -m uvicorn main:app --reload"

cd ..\frontend
echo Setting up and starting frontend...
echo Installing frontend dependencies...
call npm install
start "Yoga Frontend" cmd /k "npm run dev"

echo Project is starting in separate windows.
pause
