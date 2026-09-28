import cv2
import numpy as np
import time
import sys
import argparse
import os

def detect_fire(frame, fg_mask):
    # Get total area for resolution independence
    total_area = frame.shape[0] * frame.shape[1]
    
    # Convert frame to HSV
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    
    # Define color range for fire in HSV
    # Increased Value threshold to 200 to ensure we only catch very bright flames
    # Lowered Saturation threshold to 20 to ensure we catch the bright white/yellow core of intense fires
    lower_fire = np.array([0, 20, 200])
    upper_fire = np.array([40, 255, 255])
    
    # Threshold the HSV image
    mask = cv2.inRange(hsv, lower_fire, upper_fire)
    
    # ONLY KEEP PIXELS THAT ARE MOVING
    mask = cv2.bitwise_and(mask, fg_mask)
    
    # Blur the mask to reduce noise
    mask = cv2.GaussianBlur(mask, (15, 15), 0)
    
    # Check if there's enough fire pixels relative to frame size
    fire_pixels = cv2.countNonZero(mask)
    fire_ratio = fire_pixels / total_area
    
    # Require at least 0.1% of the screen to be fire
    return fire_ratio > 0.001

def process_video(input_path, output_path):
    print(f"[1/2] Initializing video analysis pipeline for: {input_path}")
    cap = cv2.VideoCapture(input_path)
    
    if not cap.isOpened():
        print(f"Error: Could not open video {input_path}")
        return

    # Get video properties
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    
    # Setup VideoWriter
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
    
    # Setup Background Subtractor for smoke detection
    bg_subtractor = cv2.createBackgroundSubtractorMOG2(history=500, varThreshold=25, detectShadows=True)
    
    frame_count = 0
    print("[2/2] Processing video frames...")
    start_time = time.time()
    
    # State variables for latching logic to prevent flickering
    fire_active = False
    smoke_active = False
    frames_since_fire = 9999
    frames_since_smoke = 9999
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
            
        frame_count += 1
        
        # Get foreground mask FIRST
        fg_mask_raw = bg_subtractor.apply(frame)
        
        # Threshold to keep only strong movement (ignore shadows)
        _, fg_mask = cv2.threshold(fg_mask_raw, 250, 255, cv2.THRESH_BINARY)
        
        # Morphological operations to clean up
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_OPEN, kernel)
        fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_CLOSE, kernel)
        fg_mask = cv2.GaussianBlur(fg_mask, (15, 15), 0)
        
        # --- Fire Detection ---
        # Pass the foreground mask so fire is only detected if it's moving!
        is_fire_frame = detect_fire(frame, fg_mask)
        
        # --- Smoke Detection ---
        # Get moving pixels that are grayish (low saturation)
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        s_channel = hsv[:, :, 1]
        v_channel = hsv[:, :, 2]
        
        # Smoke can mix with background color, allow more saturation and lower brightness
        smoke_color_mask = (s_channel < 100) & (v_channel > 50)
        
        # Combine movement and color masks
        smoke_mask = np.bitwise_and(fg_mask > 0, smoke_color_mask).astype(np.uint8) * 255
        
        # Count smoke pixels and calculate ratio for resolution independence
        smoke_pixels = cv2.countNonZero(smoke_mask)
        total_area = width * height
        smoke_ratio = smoke_pixels / total_area
        
        # Require at least 0.1% of the screen to be smoke
        is_smoke_frame = smoke_ratio > 0.001
        
        # --- Latching Logic (Prevents Flickering) ---
        # Once fire is detected, it stays on until the end of the video
        if is_fire_frame:
            fire_active = True
                
        # Once smoke is detected, it stays on until the end of the video
        if is_smoke_frame:
            smoke_active = True
        
        # Determine Current Status for terminal
        if fire_active and smoke_active:
            current_status = "FIRE + SMOKE"
        elif fire_active:
            current_status = "FIRE"
        elif smoke_active:
            current_status = "SMOKE"
        else:
            current_status = "NORMAL"
        
        # --- Annotation ---
        # Dynamically scale font size based on video resolution
        font_scale = height / 720.0 * 1.5
        thickness = max(2, int(height / 720.0 * 4))
        y_pos = int(height * 0.1)
        
        if fire_active:
            cv2.putText(frame, 'FIRE DETECTED', (50, y_pos), 
                        cv2.FONT_HERSHEY_SIMPLEX, font_scale, (0, 0, 255), thickness)
            y_pos += int(font_scale * 40)
            
        if smoke_active:
            cv2.putText(frame, 'SMOKE DETECTED', (50, y_pos), 
                        cv2.FONT_HERSHEY_SIMPLEX, font_scale, (255, 0, 0), thickness)
            
        # Write the annotated frame
        out.write(frame)
        
        if frame_count % 30 == 0 or frame_count == total_frames:
            elapsed = time.time() - start_time
            fps_proc = frame_count / elapsed if elapsed > 0 else 0
            percent = (frame_count / total_frames) * 100.0 if total_frames > 0 else 0
            print(f"  Frame {frame_count:4d}/{total_frames} ({percent:5.1f}%) | Speed: {fps_proc:5.1f} fps | Elapsed: {elapsed:4.1f}s | Current: {current_status}")
            sys.stdout.flush()
            
    cap.release()
    out.release()
    print(f"\nProcessing complete! Saved to {output_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Analyze video for fire and smoke.")
    parser.add_argument("input_video", type=str, help="Path to the input video file")
    
    args = parser.parse_args()
    
    input_path = args.input_video
    # Automatically generate an output filename by appending '_Annotated'
    base_name = os.path.splitext(os.path.basename(input_path))[0]
    output_path = f"{base_name}_Annotated.mp4"
    
    process_video(input_path, output_path)
