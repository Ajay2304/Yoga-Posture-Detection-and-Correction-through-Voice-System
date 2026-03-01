import numpy as np
from pydantic import BaseModel
from typing import List, Dict, Tuple, Optional

class Landmark(BaseModel):
    x: float
    y: float
    z: float
    visibility: Optional[float] = 0.0

class PosePayload(BaseModel):
    landmarks: List[Landmark]

def calculate_angle(a: Tuple[float, float], b: Tuple[float, float], c: Tuple[float, float]) -> float:
    """Calculate the 2D angle between three points."""
    a = np.array(a)
    b = np.array(b)
    c = np.array(c)
    
    radians = np.arctan2(c[1]-b[1], c[0]-b[0]) - np.arctan2(a[1]-b[1], a[0]-b[0])
    angle = np.abs(radians * 180.0 / np.pi)
    
    if angle > 180.0:
        angle = 360.0 - angle
        
    return angle

def evaluate_pose(landmarks: List[Landmark], target_pose: Optional[str] = None) -> Dict:
    """Evaluate pose flexibly to detect intention and provide granular corrections."""
    if len(landmarks) < 33:
        return {"pose": "Detecting...", "score": 0, "hints": ["Not enough landmarks detected."]}

    lm = landmarks
    
    # Extract left landmarks
    l_shoulder = (lm[11].x, lm[11].y)
    l_elbow = (lm[13].x, lm[13].y)
    l_wrist = (lm[15].x, lm[15].y)
    l_hip = (lm[23].x, lm[23].y)
    l_knee = (lm[25].x, lm[25].y)
    l_ankle = (lm[27].x, lm[27].y)
    
    # Extract right landmarks
    r_shoulder = (lm[12].x, lm[12].y)
    r_elbow = (lm[14].x, lm[14].y)
    r_wrist = (lm[16].x, lm[16].y)
    r_hip = (lm[24].x, lm[24].y)
    r_knee = (lm[26].x, lm[26].y)
    r_ankle = (lm[28].x, lm[28].y)
    
    # Calculate angles
    l_arm_angle = calculate_angle(l_shoulder, l_elbow, l_wrist)
    l_leg_angle = calculate_angle(l_hip, l_knee, l_ankle)
    r_arm_angle = calculate_angle(r_shoulder, r_elbow, r_wrist)
    r_leg_angle = calculate_angle(r_hip, r_knee, r_ankle)

    leg_angle = min(l_leg_angle, r_leg_angle)
    straight_leg = max(l_leg_angle, r_leg_angle)
    arm_angle = (l_arm_angle + r_arm_angle) / 2.0
    
    # Distance Helpers for flexible intention detection
    def calc_dist(p1, p2):
        return ((p1[0]-p2[0])**2 + (p1[1]-p2[1])**2)**0.5
        
    ankle_dist = calc_dist(l_ankle, r_ankle)
    shoulder_width = calc_dist(l_shoulder, r_shoulder) + 0.001
    relative_ankle_dist = ankle_dist / shoulder_width

    # Verticality
    avg_shoulder_y = (l_shoulder[1] + r_shoulder[1]) / 2.0
    avg_hip_y = (l_hip[1] + r_hip[1]) / 2.0
    is_lying_down = abs(avg_shoulder_y - avg_hip_y) < shoulder_width * 1.5

    # 1. Intention Guessing
    if target_pose:
        pose_name = target_pose
    else:
        pose_name = "Unknown"
        
        if is_lying_down:
            pose_name = "Cobra Pose"
        elif leg_angle < 140:
            # One leg is bent. Tree or Warrior?
            # In Tree pose, one foot is raised off the floor (large vertical difference between ankles)
            ankle_y_diff = abs(l_ankle[1] - r_ankle[1])
            if ankle_y_diff > shoulder_width * 0.5:
                pose_name = "Tree Pose"
            else:
                # Feet are planted on the floor
                arms_raised = l_wrist[1] < l_shoulder[1] and r_wrist[1] < r_shoulder[1]
                pose_name = "Warrior I Pose" if arms_raised else "Warrior II Pose"
        else:
            # Both legs are relatively straight
            if relative_ankle_dist > 1.8:
                # Standing with wide legs
                arms_raised = l_wrist[1] < l_shoulder[1] and r_wrist[1] < r_shoulder[1]
                pose_name = "Warrior I Pose" if arms_raised else "Warrior II Pose"
            else:
                pose_name = "Mountain Pose"

    # 2. Form Correction & Scoring
    score = 40
    hints = []
    
    if pose_name == "Cobra Pose":
        if not is_lying_down:
            hints.append("Lie down on your stomach on the floor first.")
            score -= 20
        else:
            if arm_angle > 170:
                hints.append("Keep a micro-bend in your elbows.")
            else:
                score += 30
                
            if avg_hip_y > avg_shoulder_y + 0.1:
                score += 30
            else:
                hints.append("Keep your pelvis firmly on the floor.")

    elif pose_name == "Mountain Pose":
        if straight_leg > 165 and leg_angle > 165:
            score += 30
        else:
            hints.append("Straighten your posture and legs completely.")
            
        arms_down = l_wrist[1] > l_shoulder[1] and r_wrist[1] > r_shoulder[1]
        if arms_down:
            score += 30
        else:
            hints.append("Relax your arms down by your sides.")

    elif pose_name == "Tree Pose":
        if straight_leg < 160:
            hints.append("Keep your standing leg straight and engaged.")
        else:
            score += 20
            
        if 60 < leg_angle < 110:
            score += 20
        else:
            hints.append("Bring your bent foot higher up your inner thigh.")
            
        arms_up_or_chest = l_wrist[1] < l_elbow[1] and r_wrist[1] < r_elbow[1]
        if arms_up_or_chest:
            score += 20
        else:
            hints.append("Bring your hands to your chest or reach them up.")

    elif pose_name == "Warrior I Pose":
        if straight_leg < 160:
            hints.append("Straighten your back leg strong.")
        else:
            score += 20
            
        if 80 < leg_angle < 125:
            score += 20
        else:
            hints.append("Lunge deeper. Bend your front knee closer to 90 degrees.")
            
        if l_arm_angle > 150 and r_arm_angle > 150:
            score += 20
        else:
            hints.append("Keep your arms perfectly straight as you reach up.")

    elif pose_name == "Warrior II Pose":
        if straight_leg < 160:
            hints.append("Straighten your back leg strong.")
        else:
            score += 20
            
        if 80 < leg_angle < 125:
            score += 20
        else:
            hints.append("Lunge deeper on your front leg.")
            
        arms_parallel = abs(l_wrist[1] - l_shoulder[1]) < 0.2 and abs(r_wrist[1] - r_shoulder[1]) < 0.2
        if arms_parallel:
            score += 20
        else:
            hints.append("Hold your arms out straight, parallel to the floor.")

    if not hints:
        hints.append(f"Excellent form! Hold this {pose_name}.")

    score = max(0, min(100, int(score)))

    return {
        "pose": pose_name,
        "score": score,
        "hints": hints,
        "angles": {
            "l_arm": int(l_arm_angle),
            "r_arm": int(r_arm_angle),
            "l_leg": int(l_leg_angle),
            "r_leg": int(r_leg_angle)
        }
    }
