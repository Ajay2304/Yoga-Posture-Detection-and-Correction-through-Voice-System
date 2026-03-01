import { useRef, useEffect, useState, useCallback } from 'react';
import useWebSocket from 'react-use-websocket';
import { FilesetResolver, PoseLandmarker, DrawingUtils } from '@mediapipe/tasks-vision';
import { Volume2, VolumeX, Activity, Award, Play, ArrowLeft, Heart, Zap, Shield, CheckCircle2 } from 'lucide-react';

const WS_URL = import.meta.env.PROD 
  ? `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws/pose` 
  : 'ws://localhost:8000/ws/pose';

import mountainImg from './assets/poses/mountain.png';
import treeImg from './assets/poses/tree.png';
import warrior1Img from './assets/poses/warrior1.png';
import warrior2Img from './assets/poses/warrior2.png';
import cobraImg from './assets/poses/cobra.png';

const POSE_INFO = {
  "Mountain Pose": {
    name: "Mountain Pose",
    sanskrit: "Tadasana",
    image: mountainImg,
    benefits: ["Improves and corrects posture", "Strengthens thighs, knees, and ankles", "Relieves sciatica"],
    instructions: "Stand with big toes touching, heels slightly apart. Engage your thighs, lengthen your tailbone, and relax your shoulders. Arms active by your side or pointing up."
  },
  "Tree Pose": {
    name: "Tree Pose",
    sanskrit: "Vrksasana",
    image: treeImg,
    benefits: ["Improves focus and balance", "Strengthens calves and ankles", "Stretches the groins and inner thighs"],
    instructions: "Shift weight to one leg. Place the other foot's sole against the inner thigh or calf (never the knee). Press hands together at chest or extend upwards."
  },
  "Warrior I Pose": {
    name: "Warrior I Pose",
    sanskrit: "Virabhadrasana I",
    image: warrior1Img,
    benefits: ["Strengthens shoulders, arms, and back", "Deep stretch for the chest and lungs", "Strengthens legs and ankles"],
    instructions: "Step one foot back, keep the back leg straight. Bend the front knee 90 degrees. Reach both arms straight up towards the ceiling alongside your ears."
  },
  "Warrior II Pose": {
    name: "Warrior II Pose",
    sanskrit: "Virabhadrasana II",
    image: warrior2Img,
    benefits: ["Strengthens legs and ankles", "Stretches groins and chest", "Increases stamina"],
    instructions: "From Warrior I, open your hips and shoulders to the side. Extend your arms parallel to the floor, gaze out over your front fingertips. Keep the front knee bent."
  },
  "Cobra Pose": {
    name: "Cobra Pose",
    sanskrit: "Bhujangasana",
    image: cobraImg,
    benefits: ["Strengthens the spine", "Stretches chest and lungs, shoulders, and abdomen", "Soothes sciatica"],
    instructions: "Lie face down, legs extended. Place your hands under your shoulders. Keep elbows bent slightly and close to your body. Press into your hands to lift your upper body."
  }
};

function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'session'>('dashboard');
  const [targetPose, setTargetPose] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [poseLandmarker, setPoseLandmarker] = useState<PoseLandmarker | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [lastSpokenPhrase, setLastSpokenPhrase] = useState('');

  // Voice debouncing ref to prevent spamming
  const lastSpokeTimeRef = useRef<number>(0);

  // Backend State
  const [currentPose, setCurrentPose] = useState<string>("Detecting...");
  const [score, setScore] = useState<number>(0);
  const [hints, setHints] = useState<string[]>([]);
  const [angles, setAngles] = useState<any>({ l_arm: 0, r_arm: 0, l_leg: 0, r_leg: 0 });

  const { sendMessage, lastMessage } = useWebSocket(WS_URL, {
    shouldReconnect: () => true,
    reconnectInterval: 3000,
  }, currentView === 'session');

  const speakFeedback = useCallback((text: string) => {
    if (!voiceEnabled || !window.speechSynthesis) return;

    // Don't repeat the exact same hint constantly within a short timeframe
    // Wait at least 5 seconds before repeating the identical feedback
    const now = Date.now();
    if (text === lastSpokenPhrase && (now - lastSpokeTimeRef.current < 5000)) {
      return;
    }

    // Don't interrupt if it's currently speaking (unless it's an important "Excellent form" state change)
    if (window.speechSynthesis.speaking) {
      if (!text.includes("Excellent")) return;
      window.speechSynthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;

    utterance.onend = () => {
      // Optionally do something when finished
    };

    window.speechSynthesis.speak(utterance);
    setLastSpokenPhrase(text);
    lastSpokeTimeRef.current = now;
  }, [voiceEnabled, lastSpokenPhrase]);

  useEffect(() => {
    if (lastMessage !== null && currentView === 'session') {
      try {
        const data = JSON.parse(lastMessage.data);
        if (data.pose) {
          setCurrentPose(data.pose);
          setScore(data.score);
          setHints(data.hints || []);
          setAngles(data.angles || {});

          // Voice Feedback Delivery Logic
          if (data.hints && data.hints.length > 0) {
            const activeHint = data.hints[0];
            // Only vocalize instructions, ignore 'Detecting...' internal status
            if (activeHint !== "Not enough landmarks detected.") {
              speakFeedback(activeHint);
            }
          }
        }
      } catch (err) {
        console.error("Failed to parse WS message", err);
      }
    }
  }, [lastMessage, speakFeedback, currentView]);

  useEffect(() => {
    const loadModel = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );

        const landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        setPoseLandmarker(landmarker);
        setIsModelLoaded(true);
      } catch (error) {
        console.error("Error loading MediaPipe model:", error);
      }
    };
    loadModel();
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    if (currentView !== 'session') {
      stopCamera();
      return;
    }

    if (!isModelLoaded || !poseLandmarker) return;

    let reqId: number;
    let lastVideoTime = -1;

    const startWebcam = async () => {
      if (videoRef.current && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480, facingMode: "user" }
          });
          streamRef.current = stream;
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        } catch (e) {
          console.error("Camera access denied or error", e);
        }
      }
    };

    const processVideo = () => {
      if (currentView !== 'session') return; // Double check

      if (videoRef.current && canvasRef.current && poseLandmarker && videoRef.current.currentTime !== lastVideoTime) {
        lastVideoTime = videoRef.current.currentTime;
        const canvasCtx = canvasRef.current.getContext("2d");
        if (!canvasCtx) return;

        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;

        const timestampMs = performance.now();
        const results = poseLandmarker.detectForVideo(videoRef.current, timestampMs);

        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

        if (results.landmarks && results.landmarks.length > 0) {
          const drawingUtils = new DrawingUtils(canvasCtx);
          for (const landmark of results.landmarks) {
            drawingUtils.drawLandmarks(landmark, {
              radius: (data) => DrawingUtils.lerp(data.from!.z, -0.15, 0.1, 5, 1),
              color: "#10b981",
              lineWidth: 2
            });
            drawingUtils.drawConnectors(landmark, PoseLandmarker.POSE_CONNECTIONS, {
              color: "#6366f1",
              lineWidth: 4
            });
          }
          if (sendMessage) {
            sendMessage(JSON.stringify({ landmarks: results.landmarks[0], target_pose: targetPose }));
          }
        }
        canvasCtx.restore();
      }
      reqId = requestAnimationFrame(processVideo);
    };

    videoRef.current?.addEventListener('loadeddata', processVideo);
    startWebcam();

    return () => {
      if (reqId) cancelAnimationFrame(reqId);
      stopCamera();
    };
  }, [isModelLoaded, poseLandmarker, sendMessage, currentView]);

  const handleStopSession = () => {
    stopCamera(); // Strictly enforce camera stop
    setCurrentView('dashboard');
    setTargetPose(null);
    setCurrentPose("Detecting...");
    setScore(0);
    setHints([]);
    setAngles({ l_arm: 0, r_arm: 0, l_leg: 0, r_leg: 0 });
    window.speechSynthesis.cancel();
  };

  const scoreColor = score >= 80 ? 'var(--success-color)' : score >= 50 ? 'var(--warning-color)' : 'var(--danger-color)';
  const activePoseInfo = POSE_INFO[currentPose as keyof typeof POSE_INFO] || null;

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-title" onClick={handleStopSession} style={{ cursor: 'pointer' }}>
          <Activity size={32} color="var(--primary-color)" />
          <span>Yoga AI Studio</span>
        </div>

        <button
          className={`btn-toggle ${voiceEnabled ? 'active' : ''}`}
          onClick={() => setVoiceEnabled(!voiceEnabled)}
        >
          {voiceEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          {voiceEnabled ? 'Voice On' : 'Voice Off'}
        </button>
      </header>

      {currentView === 'dashboard' ? (
        <div className="dashboard fade-in">
          <div className="dashboard-hero">
            <h1 className="hero-title">Master Your Asanas with AI</h1>
            <p className="hero-subtitle">Get real-time tracking, joint angle analysis, and personalized coaching to refine your yoga poses.</p>
            <button className="btn-primary start-btn pulse" onClick={() => {
              setTargetPose(null);
              setCurrentView('session');
            }} disabled={!isModelLoaded}>
              {!isModelLoaded ? <div className="spinner-small" /> : <Play size={20} fill="currentColor" />}
              {!isModelLoaded ? "Waking up AI Core..." : "Open Free Camera Session"}
            </button>
          </div>

          <div className="pose-catalog">
            <div className="catalog-header">
              <h2 className="catalog-title">Explore Supported Poses</h2>
              <span className="catalog-subtitle">We now detect all 5 standard poses automatically!</span>
            </div>

            <div className="pose-cards">
              {Object.entries(POSE_INFO).map(([key, info]) => (
                <div className="pose-card glass-card" key={key}>
                  <div className="pose-card-header">
                    <div>
                      <h3>{info.name}</h3>
                      <span className="sanskrit-name">{info.sanskrit}</span>
                    </div>
                    <img src={info.image} alt={info.name} className="pose-card-image" />
                  </div>
                  <div className="pose-card-divider" />
                  <div className="pose-card-content">
                    <div className="content-section">
                      <h4><Heart size={16} className="icon-pink" /> Benefits</h4>
                      <ul className="pose-benefits-list">
                        {info.benefits.map((benefit, i) => (
                          <li key={i}><CheckCircle2 size={14} className="icon-green" /> {benefit}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="content-section instruction-box">
                      <h4><Zap size={16} className="icon-yellow" /> Execution</h4>
                      <p className="pose-instructions">{info.instructions}</p>
                    </div>
                  </div>
                  <div className="pose-card-actions" style={{ marginTop: '1rem' }}>
                    <button className="btn-primary start-btn pulse" style={{ width: '100%' }} onClick={() => {
                      setTargetPose(key);
                      setCurrentView('session');
                    }} disabled={!isModelLoaded}>
                      {!isModelLoaded ? <div className="spinner-small" /> : <Play size={20} fill="currentColor" />}
                      {!isModelLoaded ? "Waking up AI Core..." : `Start Practice`}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <main className={`main-content fade-in ${targetPose ? 'split-view' : ''}`}>
          {targetPose && POSE_INFO[targetPose as keyof typeof POSE_INFO] && (
            <div className="reference-section glass-card fade-in">
              <div className="reference-header">
                <h2>{POSE_INFO[targetPose as keyof typeof POSE_INFO].name}</h2>
                <span className="sanskrit-name" style={{ fontSize: '1.2rem' }}>{POSE_INFO[targetPose as keyof typeof POSE_INFO].sanskrit}</span>
              </div>

              <img src={POSE_INFO[targetPose as keyof typeof POSE_INFO].image} alt={targetPose} className="reference-image-large" />

              <div className="content-section instruction-box" style={{ marginTop: '1rem' }}>
                <h4><Zap size={16} className="icon-yellow" /> Execution</h4>
                <p>{POSE_INFO[targetPose as keyof typeof POSE_INFO].instructions}</p>
              </div>

              <div className="content-section" style={{ marginTop: '1rem' }}>
                <h4><Heart size={16} className="icon-pink" /> Benefits</h4>
                <ul className="pose-benefits-list">
                  {POSE_INFO[targetPose as keyof typeof POSE_INFO].benefits.map((b, i) => (
                    <li key={i}><CheckCircle2 size={14} className="icon-green" /> {b}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          <div className="video-section">
            <div className="session-controls">
              <button className="btn-secondary hover-shift" onClick={handleStopSession}>
                <ArrowLeft size={18} /> Exit Practice
              </button>
              <div className="camera-badge">
                <div className="live-dot" /> LIVE CAMERA
              </div>
            </div>

            <div className="video-container">
              <video ref={videoRef} className="webcam-feed" playsInline muted />
              <canvas ref={canvasRef} className="landmark-canvas" />
              <div className="overlay-ui">
                <div className="score-ring-wrapper">
                  <svg className="score-svg" viewBox="0 0 100 100">
                    <circle className="score-bg" cx="50" cy="50" r="45" />
                    <circle
                      className="score-progress"
                      cx="50" cy="50" r="45"
                      style={{ stroke: scoreColor, strokeDasharray: `${(score / 100) * 283} 283` }}
                    />
                  </svg>
                  <span className="score-value" style={{ color: scoreColor }}>{score}</span>
                  <span className="score-label">ACCURACY</span>
                </div>
              </div>
            </div>
          </div>

          <aside className="sidebar">
            <div className="glass-card pose-status-card">
              <div className={`status-badge ${currentPose !== "Unknown" ? "status-good pulse" : "status-warning"}`}>
                {currentPose !== "Unknown" ? "AI Tracking Active" : "Waiting for Pose..."}
              </div>
              <h2 className="pose-title">{currentPose}</h2>

              {activePoseInfo && (
                <div className="live-benefits fade-in">
                  <h4>Benefits of {activePoseInfo.sanskrit}:</h4>
                  <ul>
                    {activePoseInfo.benefits.map((b, i) => <li key={i}>{b}</li>)}
                  </ul>
                </div>
              )}
            </div>

            <div className="glass-card">
              <h3 className="card-title">
                <Award size={20} className="icon-primary" /> Real-time Coaching
              </h3>
              <ul className="hints-list">
                {hints.length === 0 ? (
                  <li className="hint-item success-hint fade-in">
                    <CheckCircle2 size={16} className="hint-icon-success" />
                    Posture looks perfect! Keep holding the alignment.
                  </li>
                ) : (
                  hints.map((hint, idx) => (
                    <li key={idx} className="hint-item fade-in">
                      <Zap size={16} className="hint-icon" />
                      {hint}
                    </li>
                  ))
                )}
              </ul>
            </div>

            <div className="glass-card">
              <h3 className="card-title">
                <Shield size={20} className="icon-primary" /> Joint Telemetry
              </h3>
              <div className="angles-grid">
                <div className="angle-box">
                  <div className="angle-label">L. Arm</div>
                  <div className="angle-value">{angles.l_arm}°</div>
                </div>
                <div className="angle-box">
                  <div className="angle-label">R. Arm</div>
                  <div className="angle-value">{angles.r_arm}°</div>
                </div>
                <div className="angle-box">
                  <div className="angle-label">L. Leg</div>
                  <div className="angle-value">{angles.l_leg}°</div>
                </div>
                <div className="angle-box">
                  <div className="angle-label">R. Leg</div>
                  <div className="angle-value">{angles.r_leg}°</div>
                </div>
              </div>
            </div>
          </aside>
        </main>
      )}
    </div>
  );
}

export default App;
