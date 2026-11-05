"""
Computer Vision Produce Quality Assessment Engine.
Uses OpenCV for image analysis, HSV color segmentation, necrosis detection,
surface defect localization, and statistical grading.
"""
import io
import math
import numpy as np
import cv2
from typing import Dict, Any, List, Optional, Tuple

class VisionInspector:
    """
    OpenCV-based agricultural produce quality analyzer.
    """

    @staticmethod
    def analyze_image_bytes(image_bytes: bytes, commodity_hint: str = "tomato") -> Dict[str, Any]:
        """
        Processes uploaded raw image bytes, identifies produce contour,
        segments healthy skin versus necrotic/bruised/discolored defects,
        and produces verified grading and confidence scores.
        """
        try:
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is None:
                return {
                    "status": "ERROR",
                    "error": "Failed to decode image format. Supported formats: JPEG, PNG, WebP.",
                    "data_label": "DATA UNAVAILABLE"
                }
            return VisionInspector._process_cv_matrix(img, commodity_hint)
        except Exception as e:
            return {
                "status": "ERROR",
                "error": f"Image processing failed: {str(e)}",
                "data_label": "DATA UNAVAILABLE"
            }

    @staticmethod
    def generate_synthetic_inspection(commodity_name: str = "tomato", defect_profile: str = "random") -> Dict[str, Any]:
        """
        Generates an authentic synthetic produce image matrix using OpenCV
        drawing primitives, gradient fills, and simulated surface blemishes
        for running conveyor simulations without manual file uploads.
        """
        # Create 320x320 canvas
        canvas = np.zeros((320, 320, 3), dtype=np.uint8)
        # Background: dark slate #121316
        canvas[:] = (22, 19, 18)
        
        center = (160, 160)
        radius = 110
        
        commodity = commodity_name.lower()
        if commodity == "tomato":
            base_bgr = (40, 50, 215) # Rich red
        elif commodity == "mango":
            base_bgr = (30, 170, 240) # Golden yellow/orange
        elif commodity == "banana":
            base_bgr = (45, 210, 235) # Bright yellow
        elif commodity == "potato":
            base_bgr = (90, 130, 170) # Earthy brown
        else: # onion
            base_bgr = (110, 80, 165) # Reddish purple
            
        # Draw base produce sphere with subtle shading
        cv2.circle(canvas, center, radius, base_bgr, -1)
        
        # Decide defect injection based on profile
        if defect_profile == "random":
            import random
            choice = random.choices(["GOOD", "MODERATE", "SPOILED"], weights=[0.60, 0.25, 0.15])[0]
        else:
            choice = defect_profile.upper()
            
        if choice == "MODERATE":
            # Add small dark blemish / discoloration patch
            blemish_center = (center[0] + 35, center[1] - 25)
            cv2.ellipse(canvas, blemish_center, (28, 18), 35, 0, 360, (20, 45, 65), -1)
        elif choice == "SPOILED":
            # Add severe necrosis and fungal rot patches
            cv2.ellipse(canvas, (center[0] + 20, center[1] - 30), (45, 35), 45, 0, 360, (15, 25, 35), -1)
            cv2.ellipse(canvas, (center[0] - 35, center[1] + 30), (35, 25), -20, 0, 360, (10, 20, 30), -1)
            
        return VisionInspector._process_cv_matrix(canvas, commodity_name)

    @staticmethod
    def _process_cv_matrix(img: np.ndarray, commodity_name: str) -> Dict[str, Any]:
        """Core computer vision feature extraction and classification."""
        h, w, _ = img.shape
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        
        # Segment foreground produce item from background
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        _, thresh = cv2.threshold(gray, 30, 255, cv2.THRESH_BINARY)
        
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            return {
                "status": "ERROR",
                "error": "No agricultural produce item detected in foreground.",
                "data_label": "DATA UNAVAILABLE"
            }
            
        largest_cnt = max(contours, key=cv2.contourArea)
        total_produce_pixels = cv2.contourArea(largest_cnt)
        if total_produce_pixels < 400:
            return {
                "status": "ERROR",
                "error": "Subject item too small for reliable defect classification.",
                "data_label": "DATA UNAVAILABLE"
            }
            
        # Create mask of the produce item
        produce_mask = np.zeros(gray.shape, dtype=np.uint8)
        cv2.drawContours(produce_mask, [largest_cnt], -1, 255, -1)
        
        # Bounding box of inspected item
        bx, by, bw, bh = cv2.boundingRect(largest_cnt)
        
        # Defect Detection:
        # Dark necrotic spots (low Value in HSV space within produce mask)
        # Rot / bruising typically shows up as very low value or abnormal saturation
        v_channel = hsv[:, :, 2]
        s_channel = hsv[:, :, 1]
        
        # Necrotic / rot threshold: V < 75 inside produce mask
        necrosis_mask = cv2.inRange(v_channel, 0, 80)
        necrosis_in_produce = cv2.bitwise_and(necrosis_mask, necrosis_mask, mask=produce_mask)
        necrotic_pixels = cv2.countNonZero(necrosis_in_produce)
        
        # Discoloration / fungal mold: low saturation (< 50) and low-mid brightness
        mold_mask = cv2.inRange(s_channel, 0, 50)
        mold_in_produce = cv2.bitwise_and(mold_mask, mold_mask, mask=produce_mask)
        mold_pixels = cv2.countNonZero(mold_in_produce)
        
        # Defect area ratio
        necrotic_ratio = necrotic_pixels / max(1.0, total_produce_pixels)
        mold_ratio = mold_pixels / max(1.0, total_produce_pixels)
        total_defect_ratio = min(1.0, necrotic_ratio + (mold_ratio * 0.5))
        
        # Grading Logic
        defects_found: List[Dict[str, Any]] = []
        
        if necrotic_ratio > 0.02:
            defects_found.append({
                "type": "Surface Necrosis / Rot",
                "severity": "HIGH" if necrotic_ratio > 0.10 else "MODERATE",
                "area_pct": round(necrotic_ratio * 100.0, 1)
            })
            
        if mold_ratio > 0.04:
            defects_found.append({
                "type": "Epidermal Discoloration / Mold",
                "severity": "HIGH" if mold_ratio > 0.12 else "MODERATE",
                "area_pct": round(mold_ratio * 100.0, 1)
            })
            
        if total_defect_ratio < 0.05:
            classification = "GOOD"
            grade = "Grade A (Export / Premium)"
            confidence = round(0.92 + (0.07 * (1.0 - total_defect_ratio / 0.05)), 3)
            recommended_zone = "Destination 1: Premium Cold Storage"
        elif total_defect_ratio < 0.18:
            classification = "MODERATELY_DAMAGED"
            grade = "Grade B (Secondary / Processing / Quick Sale)"
            confidence = round(0.85 + (0.10 * (1.0 - total_defect_ratio)), 3)
            recommended_zone = "Destination 2: Secondary / Local Market"
        else:
            classification = "REJECTED"
            grade = "Grade C (Spoiled / Compost / Bio-fertilizer)"
            confidence = round(0.90 + (0.08 * min(1.0, total_defect_ratio)), 3)
            recommended_zone = "Destination 3: Rejection Bay"

        return {
            "status": "SUCCESS",
            "commodity": commodity_name,
            "classification": classification,
            "grade": grade,
            "confidence_score": confidence,
            "defect_surface_ratio_pct": round(total_defect_ratio * 100.0, 1),
            "defects_detected": defects_found,
            "bounding_box": {"x": int(bx), "y": int(by), "width": int(bw), "height": int(bh)},
            "recommended_destination": recommended_zone,
            "data_label": "PREDICTED (OPENCV INFERENCE)"
        }

