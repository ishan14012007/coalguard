"""
Realistic Mining / Industrial CCTV Fire & Smoke Detection Training Video Generator
Generates a 75-second (2250 frames @ 30fps, 1280x720) raw CCTV training video:
- Class 1: NORMAL (0s - 18s)
- Class 2: SMOKE - Light (18s - 32s)
- Class 3: SMOKE - Heavy (32s - 46s)
- Class 4: FIRE - Small to Large (46s - 60s)
- Class 5: FIRE + SMOKE (60s - 75s)
Strictly adheres to: Fixed CCTV view, No UI/text overlays, No bounding boxes, Raw footage.
"""

import os
import sys
import time
import math
import random
import csv
import json
import numpy as np
import cv2

# Configuration
WIDTH = 1280
HEIGHT = 720
FPS = 30
TOTAL_SECONDS = 75
TOTAL_FRAMES = FPS * TOTAL_SECONDS

OUTPUT_VIDEO_PATH = "fire_smoke_cctv_training_video.mp4"
OUTPUT_CSV_PATH = "ground_truth_labels.csv"
OUTPUT_JSON_PATH = "dataset_manifest.json"

# Fixed seed for reproducibility
np.random.seed(42)
random.seed(42)

def create_base_environment(width, height):
    """
    Creates a high-detail photorealistic industrial mining / quarry equipment yard.
    Elevated fixed CCTV angle overlooking a concrete pad, industrial electrical substation,
    diesel generator, gravel yard, haul road, and quarry rock face backdrop.
    """
    img = np.zeros((height, width, 3), dtype=np.float32)
    
    # 1. Sky & Atmosphere (Elevated horizon ~ 0.33 of height)
    horizon_y = int(height * 0.33)
    for y in range(horizon_y):
        ratio = y / horizon_y
        # Daylight sky with slight haze: light cyan-blue to pale horizon
        b = 230 - 35 * (1 - ratio)
        g = 210 - 25 * (1 - ratio)
        r = 185 - 20 * (1 - ratio)
        img[y, :] = [b, g, r]
    
    # Distant subtle clouds / haze
    cloud_noise = np.random.normal(0, 3, (horizon_y, width, 1))
    img[:horizon_y, :] += cloud_noise
    
    # 2. Distant Quarry Rock Face / Terraced Hillside (y: 130 to 250)
    quarry_top = int(height * 0.18)
    for x in range(width):
        # Terraced ridge profile
        ridge_y = int(quarry_top + 30 * math.sin(x * 0.005) + 15 * math.sin(x * 0.02) + 8 * math.sin(x * 0.06))
        for y in range(ridge_y, horizon_y + 40):
            # Rocky strata colors (tan, ochre, sandstone, grey basalt)
            layer = (y + int(10 * math.sin(x * 0.015))) % 28
            if layer < 8:
                col = [110, 130, 145] # Sandstone buff
            elif layer < 18:
                col = [95, 115, 130]  # Darker earth
            else:
                col = [120, 135, 140] # Light rocky face
            # Micro-texture
            noise = np.random.uniform(-8, 8)
            img[y, x] = [np.clip(col[0] + noise, 0, 255),
                         np.clip(col[1] + noise, 0, 255),
                         np.clip(col[2] + noise, 0, 255)]
            
    # 3. Midground Industrial Structure (Conveyor Truss & Storage Hopper on the right)
    truss_start = (int(width * 0.65), int(height * 0.22))
    truss_end = (width, int(height * 0.15))
    cv2.line(img, truss_start, truss_end, (90, 100, 110), 6)
    cv2.line(img, (truss_start[0], truss_start[1] + 16), (truss_end[0], truss_end[1] + 16), (80, 90, 100), 5)
    # Truss cross braces
    for i in range(12):
        frac = i / 11.0
        x_pt = int(truss_start[0] + frac * (truss_end[0] - truss_start[0]))
        y_pt = int(truss_start[1] + frac * (truss_end[1] - truss_start[1]))
        cv2.line(img, (x_pt, y_pt), (x_pt, y_pt + 16), (70, 80, 90), 2)
        if i % 2 == 0:
            cv2.line(img, (x_pt, y_pt), (x_pt + 30, y_pt + 16), (65, 75, 85), 2)
    
    # Support pillars for conveyor
    cv2.line(img, (int(width * 0.72), int(height * 0.22)), (int(width * 0.72), int(height * 0.45)), (75, 85, 95), 5)
    cv2.line(img, (int(width * 0.90), int(height * 0.17)), (int(width * 0.90), int(height * 0.45)), (75, 85, 95), 5)

    # 4. Ground: Gravel Mining Yard & Haul Road (y: horizon_y to height)
    for y in range(horizon_y, height):
        ratio = (y - horizon_y) / (height - horizon_y)
        # Base gravel color: dusty warm brownish-grey
        base_b = 90 + 30 * ratio
        base_g = 110 + 35 * ratio
        base_r = 125 + 40 * ratio
        
        row = np.zeros((width, 3), dtype=np.float32)
        row[:, 0] = base_b
        row[:, 1] = base_g
        row[:, 2] = base_r
        
        # Add wheel tracks
        for track_x in [int(width * 0.25), int(width * 0.38), int(width * 0.75)]:
            track_w = int(25 + 60 * ratio)
            x_min = max(0, track_x - track_w)
            x_max = min(width, track_x + track_w)
            row[x_min:x_max, :] *= 0.90  # Darker compressed earth
            
        img[y, :] = row
        
    # Add high-frequency gravel noise
    gravel_noise = np.random.normal(0, 10, (height - horizon_y, width, 3))
    img[horizon_y:, :] = np.clip(img[horizon_y:, :] + gravel_noise, 0, 255)
    
    # Scatter some larger pebbles / rocks on ground
    for _ in range(120):
        rx = np.random.randint(20, width - 20)
        ry = np.random.randint(horizon_y + 20, height - 20)
        r_size = np.random.randint(2, 6)
        cv2.circle(img, (rx, ry), r_size, (70, 85, 95), -1)
        cv2.circle(img, (rx - 1, ry - 1), max(1, r_size - 1), (130, 145, 155), -1)

    # 5. Concrete Equipment Foundation Pad (Centrally placed on left-center)
    pad_pts = np.array([
        [int(width * 0.32), int(height * 0.48)],
        [int(width * 0.68), int(height * 0.48)],
        [int(width * 0.76), int(height * 0.78)],
        [int(width * 0.22), int(height * 0.78)]
    ], np.int32)
    
    # Shadow under pad
    pad_shadow = pad_pts + np.array([[12, 10], [12, 10], [12, 10], [12, 10]], np.int32)
    cv2.fillPoly(img, [pad_shadow], (60, 70, 80))
    
    # Concrete pad surface
    cv2.fillPoly(img, [pad_pts], (140, 150, 155)) # Concrete grey
    # Concrete pad edge
    edge_pts = np.array([
        [int(width * 0.22), int(height * 0.78)],
        [int(width * 0.76), int(height * 0.78)],
        [int(width * 0.76), int(height * 0.80)],
        [int(width * 0.22), int(height * 0.80)]
    ], np.int32)
    cv2.fillPoly(img, [edge_pts], (100, 110, 115))
    
    # Expansion joint
    cv2.line(img, (int(width * 0.50), int(height * 0.48)), (int(width * 0.49), int(height * 0.78)), (115, 125, 130), 2)
    
    # 6. Industrial Machinery & Electrical Equipment on Pad
    eq_x = int(width * 0.38)
    eq_y = int(height * 0.36)
    eq_w = int(width * 0.15)
    eq_h = int(height * 0.26)
    
    # Equipment shadow
    eq_shadow = np.array([
        [eq_x + eq_w, eq_y + eq_h],
        [eq_x + eq_w + 50, eq_y + eq_h - 20],
        [eq_x + eq_w + 70, eq_y + eq_h + 10],
        [eq_x + 30, eq_y + eq_h + 15]
    ], np.int32)
    cv2.fillPoly(img, [eq_shadow], (70, 75, 80))
    
    # Main metal cabinet body (Industrial Olive-Grey / Steel)
    cv2.rectangle(img, (eq_x, eq_y), (eq_x + eq_w, eq_y + eq_h), (85, 95, 100), -1)
    # Side 3D perspective face
    side_pts = np.array([
        [eq_x + eq_w, eq_y],
        [eq_x + eq_w + 24, eq_y - 12],
        [eq_x + eq_w + 24, eq_y + eq_h - 12],
        [eq_x + eq_w, eq_y + eq_h]
    ], np.int32)
    cv2.fillPoly(img, [side_pts], (65, 75, 80))
    # Top roof face
    top_pts = np.array([
        [eq_x, eq_y],
        [eq_x + 24, eq_y - 12],
        [eq_x + eq_w + 24, eq_y - 12],
        [eq_x + eq_w, eq_y]
    ], np.int32)
    cv2.fillPoly(img, [top_pts], (110, 120, 125))
    
    # Cabinet doors, seams, ventilation louvers, electrical conduit
    cv2.rectangle(img, (eq_x + 8, eq_y + 8), (eq_x + int(eq_w * 0.48), eq_y + eq_h - 10), (75, 85, 90), 2)
    cv2.rectangle(img, (eq_x + int(eq_w * 0.52), eq_y + 8), (eq_x + eq_w - 8, eq_y + eq_h - 10), (75, 85, 90), 2)
    
    # Ventilation Louvers on upper doors (Smoke origin)
    for l_y in range(eq_y + 20, eq_y + 60, 6):
        cv2.line(img, (eq_x + 16, l_y), (eq_x + int(eq_w * 0.44), l_y), (45, 50, 55), 2)
        cv2.line(img, (eq_x + int(eq_w * 0.56), l_y), (eq_x + eq_w - 16, l_y), (45, 50, 55), 2)
        
    # High Voltage warning sign
    hazard_x = eq_x + int(eq_w * 0.5) - 12
    hazard_y = eq_y + 85
    hazard_pts = np.array([
        [hazard_x + 12, hazard_y],
        [hazard_x + 24, hazard_y + 12],
        [hazard_x + 12, hazard_y + 24],
        [hazard_x, hazard_y + 12]
    ], np.int32)
    cv2.fillPoly(img, [hazard_pts], (30, 170, 230)) # Yellow
    cv2.polylines(img, [hazard_pts], True, (20, 20, 20), 1)
    
    # Heavy electrical conduit pipes
    cv2.line(img, (eq_x + 20, eq_y + eq_h), (eq_x + 20, eq_y + eq_h + 20), (50, 55, 60), 6)
    cv2.line(img, (eq_x + 45, eq_y + eq_h), (eq_x + 45, eq_y + eq_h + 25), (50, 55, 60), 8)
    
    # Object B: Adjacent Heavy Diesel Generator (Right side of pad)
    gen_x = int(width * 0.56)
    gen_y = int(height * 0.42)
    gen_w = int(width * 0.14)
    gen_h = int(height * 0.20)
    
    # Gen enclosure body
    cv2.rectangle(img, (gen_x, gen_y), (gen_x + gen_w, gen_y + gen_h), (110, 95, 75), -1)
    # Gen top
    gen_top = np.array([
        [gen_x, gen_y],
        [gen_x + 20, gen_y - 10],
        [gen_x + gen_w + 20, gen_y - 10],
        [gen_x + gen_w, gen_y]
    ], np.int32)
    cv2.fillPoly(img, [gen_top], (130, 115, 95))
    # Vertical exhaust muffler stack on generator
    cv2.line(img, (gen_x + 25, gen_y - 10), (gen_x + 25, gen_y - 45), (60, 60, 65), 7)
    cv2.circle(img, (gen_x + 25, gen_y - 45), 5, (50, 50, 55), -1)
    
    # Cooling radiator fins
    for fx in range(gen_x + 12, gen_x + gen_w - 12, 8):
        cv2.line(img, (fx, gen_y + 15), (fx, gen_y + gen_h - 15), (70, 60, 50), 2)

    # 7. Background Haul Truck (Far left)
    truck_x = int(width * 0.04)
    truck_y = int(height * 0.38)
    truck_w = int(width * 0.16)
    truck_h = int(height * 0.18)
    bed_pts = np.array([
        [truck_x, truck_y + 20],
        [truck_x + truck_w, truck_y],
        [truck_x + truck_w - 15, truck_y + truck_h - 20],
        [truck_x + 10, truck_y + truck_h - 20]
    ], np.int32)
    cv2.fillPoly(img, [bed_pts], (40, 160, 210)) # Mining Yellow
    cv2.polylines(img, [bed_pts], True, (30, 120, 160), 2)
    cv2.circle(img, (truck_x + 35, truck_y + truck_h - 10), 22, (35, 35, 38), -1)
    cv2.circle(img, (truck_x + 35, truck_y + truck_h - 10), 9, (80, 85, 90), -1)
    cv2.circle(img, (truck_x + truck_w - 35, truck_y + truck_h - 10), 22, (35, 35, 38), -1)
    cv2.circle(img, (truck_x + truck_w - 35, truck_y + truck_h - 10), 9, (80, 85, 90), -1)
    
    return img.astype(np.uint8)

class SmokeParticleSystem:
    def __init__(self, emitter_x, emitter_y):
        self.emitter_x = emitter_x
        self.emitter_y = emitter_y
        self.particles = []
        
    def update_and_render(self, frame_bgr, intensity, smoke_type="light", wind_x=0.45):
        if intensity <= 0.001:
            return frame_bgr
            
        num_spawn = int(intensity * (12 if smoke_type == "heavy" else 5))
        for _ in range(num_spawn):
            spawn_offset_x = np.random.uniform(-10, 10) if smoke_type == "light" else np.random.uniform(-25, 25)
            spawn_offset_y = np.random.uniform(-5, 5)
            p = {
                'x': self.emitter_x + spawn_offset_x,
                'y': self.emitter_y + spawn_offset_y,
                'vx': wind_x + np.random.uniform(-0.3, 0.3),
                'vy': np.random.uniform(-1.8, -3.2) if smoke_type == "heavy" else np.random.uniform(-1.0, -2.0),
                'radius': np.random.uniform(6, 12) if smoke_type == "heavy" else np.random.uniform(4, 8),
                'growth': np.random.uniform(0.35, 0.65) if smoke_type == "heavy" else np.random.uniform(0.20, 0.40),
                'age': 0,
                'max_age': np.random.randint(90, 160) if smoke_type == "heavy" else np.random.randint(60, 110),
                'density': np.random.uniform(0.4, 0.85) if smoke_type == "heavy" else np.random.uniform(0.15, 0.35),
                'angle': np.random.uniform(0, 2 * math.pi),
                'rot_speed': np.random.uniform(-0.04, 0.04),
                'type': smoke_type
            }
            self.particles.append(p)
            
        surviving = []
        h, w = frame_bgr.shape[:2]
        
        smoke_overlay = np.zeros((h, w, 3), dtype=np.float32)
        alpha_channel = np.zeros((h, w), dtype=np.float32)
        
        for p in self.particles:
            p['age'] += 1
            if p['age'] >= p['max_age']:
                continue
                
            life_ratio = p['age'] / p['max_age']
            turbulence = 0.8 * math.sin(p['age'] * 0.08 + p['angle'])
            p['x'] += p['vx'] + turbulence * 0.5
            p['y'] += p['vy']
            p['vy'] -= 0.015
            p['radius'] += p['growth']
            p['angle'] += p['rot_speed']
            
            if life_ratio < 0.15:
                current_alpha = (life_ratio / 0.15) * p['density'] * intensity
            else:
                current_alpha = (1.0 - (life_ratio - 0.15) / 0.85) * p['density'] * intensity
                
            cx = int(p['x'])
            cy = int(p['y'])
            cr = int(p['radius'])
            
            if cx + cr < 0 or cx - cr >= w or cy + cr < 0 or cy - cr >= h or cr <= 1:
                continue
                
            if p['type'] == "heavy":
                base_color = np.array([38.0, 42.0, 46.0], dtype=np.float32)
            else:
                base_color = np.array([195.0, 205.0, 210.0], dtype=np.float32)
                
            x1 = max(0, cx - cr)
            x2 = min(w, cx + cr)
            y1 = max(0, cy - cr)
            y2 = min(h, cy + cr)
            
            if x2 > x1 and y2 > y1:
                grid_y, grid_x = np.ogrid[y1 - cy:y2 - cy, x1 - cx:x2 - cx]
                dist_sq = grid_x * grid_x + grid_y * grid_y
                r_sq = cr * cr
                
                mask = dist_sq <= r_sq
                soft_val = np.exp(-3.0 * dist_sq[mask] / r_sq) * current_alpha
                
                existing_a = alpha_channel[y1:y2, x1:x2][mask]
                new_a = existing_a + soft_val * (1.0 - existing_a)
                alpha_channel[y1:y2, x1:x2][mask] = np.clip(new_a, 0.0, 0.96)
                
                for c in range(3):
                    smoke_overlay[y1:y2, x1:x2, c][mask] = base_color[c]
                    
            surviving.append(p)
            
        self.particles = surviving
        
        alpha_3d = np.expand_dims(alpha_channel, axis=2)
        blended = frame_bgr.astype(np.float32) * (1.0 - alpha_3d) + smoke_overlay * alpha_3d
        return np.clip(blended, 0, 255).astype(np.uint8)

class FireRenderer:
    def __init__(self, base_x, base_y):
        self.base_x = base_x
        self.base_y = base_y
        self.sparks = []
        
    def render(self, frame_bgr, fire_scale, frame_idx):
        if fire_scale <= 0.001:
            return frame_bgr
            
        h, w = frame_bgr.shape[:2]
        result = frame_bgr.copy().astype(np.float32)
        
        t = frame_idx / 30.0
        flicker = (0.75 + 
                   0.15 * math.sin(t * 28.0) + 
                   0.10 * math.sin(t * 45.0 + 1.2) + 
                   0.08 * math.sin(t * 72.0 + 2.5) +
                   np.random.uniform(-0.05, 0.05))
        effective_scale = fire_scale * max(0.5, flicker)
        
        # Thermal Radiative Illumination on Ground & Equipment Pad
        glow_radius = int(80 + 220 * effective_scale)
        gx1 = max(0, self.base_x - glow_radius)
        gx2 = min(w, self.base_x + glow_radius)
        gy1 = max(0, self.base_y - glow_radius)
        gy2 = min(h, self.base_y + glow_radius)
        
        if gx2 > gx1 and gy2 > gy1:
            grid_y, grid_x = np.ogrid[gy1 - self.base_y:gy2 - self.base_y, gx1 - self.base_x:gx2 - self.base_x]
            dist_sq = grid_x * grid_x + (grid_y * 1.5) ** 2
            rad_sq = glow_radius * glow_radius
            
            glow_mask = dist_sq < rad_sq
            glow_intensity = np.exp(-3.5 * dist_sq[glow_mask] / rad_sq) * effective_scale * 0.75
            
            result[gy1:gy2, gx1:gx2, 0][glow_mask] += glow_intensity * 20.0   # Blue
            result[gy1:gy2, gx1:gx2, 1][glow_mask] += glow_intensity * 105.0  # Green
            result[gy1:gy2, gx1:gx2, 2][glow_mask] += glow_intensity * 190.0  # Red
            
        # Dynamic Flame Body Synthesis
        flame_height = int((40 + 140 * effective_scale) * max(0.6, flicker))
        flame_width = int((25 + 75 * effective_scale) * max(0.7, flicker))
        
        num_tongues = int(5 + 8 * effective_scale)
        flame_layer = np.zeros((h, w, 3), dtype=np.float32)
        flame_alpha = np.zeros((h, w), dtype=np.float32)
        
        for k in range(num_tongues):
            phase_offset = k * 1.3
            t_sway = math.sin(t * 18.0 + phase_offset) * (8.0 + 15.0 * effective_scale)
            tongue_w = flame_width * (0.35 + 0.65 * math.sin(k * 0.9))
            tongue_h = flame_height * (0.55 + 0.45 * math.cos(k * 1.1))
            
            bx = self.base_x + int((k - num_tongues / 2.0) * (flame_width / (num_tongues + 1)))
            by = self.base_y
            
            pts_left = []
            pts_right = []
            steps = 14
            for s in range(steps):
                s_ratio = s / (steps - 1.0)
                cur_y = int(by - s_ratio * tongue_h)
                sway = t_sway * (s_ratio ** 1.3)
                cur_w = tongue_w * (1.0 - s_ratio ** 1.1) * (1.0 + 0.2 * math.sin(s * 0.8 + t * 20.0))
                
                pts_left.append([bx - cur_w * 0.5 + sway, cur_y])
                pts_right.append([bx + cur_w * 0.5 + sway, cur_y])
                
            tongue_pts = np.array(pts_left + pts_right[::-1], np.int32)
            
            cv2.fillPoly(flame_layer, [tongue_pts], (20.0, 80.0, 245.0))
            cv2.fillPoly(flame_alpha, [tongue_pts], 0.85)
            
            mid_pts_left = [[pt[0] * 0.75 + bx * 0.25, pt[1]] for pt in pts_left[:int(steps * 0.85)]]
            mid_pts_right = [[pt[0] * 0.75 + bx * 0.25, pt[1]] for pt in pts_right[:int(steps * 0.85)]]
            if len(mid_pts_left) > 2:
                mid_pts = np.array(mid_pts_left + mid_pts_right[::-1], np.int32)
                cv2.fillPoly(flame_layer, [mid_pts], (30.0, 160.0, 255.0))
                cv2.fillPoly(flame_alpha, [mid_pts], 0.95)
                
            core_pts_left = [[pt[0] * 0.40 + bx * 0.60, pt[1]] for pt in pts_left[:int(steps * 0.50)]]
            core_pts_right = [[pt[0] * 0.40 + bx * 0.60, pt[1]] for pt in pts_right[:int(steps * 0.50)]]
            if len(core_pts_left) > 2:
                core_pts = np.array(core_pts_left + core_pts_right[::-1], np.int32)
                cv2.fillPoly(flame_layer, [core_pts], (180.0, 245.0, 255.0))
                cv2.fillPoly(flame_alpha, [core_pts], 1.0)

        flame_layer = cv2.GaussianBlur(flame_layer, (9, 9), 0)
        flame_alpha = cv2.GaussianBlur(flame_alpha, (9, 9), 0)
        
        alpha_3d = np.expand_dims(flame_alpha, axis=2)
        result = result * (1.0 - alpha_3d * 0.3) + flame_layer * alpha_3d
        
        # Rising Embers
        if effective_scale > 0.15:
            num_new_sparks = int(effective_scale * 4)
            for _ in range(num_new_sparks):
                self.sparks.append({
                    'x': self.base_x + np.random.uniform(-flame_width * 0.4, flame_width * 0.4),
                    'y': self.base_y - np.random.uniform(10, 30),
                    'vx': np.random.uniform(-0.8, 1.2),
                    'vy': np.random.uniform(-3.5, -6.5),
                    'life': np.random.randint(15, 35),
                    'size': np.random.choice([1, 2])
                })
                
        surviving_sparks = []
        for sp in self.sparks:
            sp['x'] += sp['vx'] + 0.3 * math.sin(sp['y'] * 0.1)
            sp['y'] += sp['vy']
            sp['life'] -= 1
            if sp['life'] > 0 and 0 <= int(sp['x']) < w and 0 <= int(sp['y']) < h:
                sx, sy = int(sp['x']), int(sp['y'])
                result[sy, sx] = [150.0, 220.0, 255.0]
                if sp['size'] > 1 and sy + 1 < h and sx + 1 < w:
                    result[sy + 1, sx] = [40.0, 140.0, 255.0]
                    result[sy, sx + 1] = [40.0, 140.0, 255.0]
                surviving_sparks.append(sp)
        self.sparks = surviving_sparks
        
        return np.clip(result, 0, 255).astype(np.uint8)

def draw_worker(frame_bgr, pos_x, pos_y, step_phase):
    h, w = frame_bgr.shape[:2]
    worker_h = 68
    
    leg_swing = math.sin(step_phase) * 12
    arm_swing = math.cos(step_phase) * 10
    
    # 1. Drop shadow on ground
    shadow_pts = np.array([
        [pos_x - 10, pos_y + 4],
        [pos_x + 18, pos_y + 1],
        [pos_x + 28, pos_y + 6],
        [pos_x + 2, pos_y + 9]
    ], np.int32)
    cv2.fillPoly(frame_bgr, [shadow_pts], (65, 75, 80))
    
    # 2. Boots
    left_boot_y = int(pos_y - leg_swing * 0.2)
    right_boot_y = int(pos_y + leg_swing * 0.2)
    cv2.rectangle(frame_bgr, (int(pos_x - 6 - leg_swing * 0.5), left_boot_y - 4), 
                             (int(pos_x - 1 - leg_swing * 0.5), left_boot_y + 2), (25, 30, 35), -1)
    cv2.rectangle(frame_bgr, (int(pos_x + 2 + leg_swing * 0.5), right_boot_y - 4), 
                             (int(pos_x + 7 + leg_swing * 0.5), right_boot_y + 2), (25, 30, 35), -1)
    
    # 3. Work Trousers
    torso_bottom_y = pos_y - int(worker_h * 0.45)
    cv2.line(frame_bgr, (pos_x - 3, torso_bottom_y), 
                        (int(pos_x - 4 - leg_swing * 0.5), left_boot_y - 4), (65, 45, 35), 4)
    cv2.line(frame_bgr, (pos_x + 3, torso_bottom_y), 
                        (int(pos_x + 4 + leg_swing * 0.5), right_boot_y - 4), (65, 45, 35), 4)
    
    # 4. Hi-Vis Safety Vest & Torso
    torso_top_y = pos_y - int(worker_h * 0.78)
    cv2.rectangle(frame_bgr, (pos_x - 8, torso_top_y), (pos_x + 8, torso_bottom_y), (15, 120, 245), -1) # Orange
    cv2.line(frame_bgr, (pos_x - 5, torso_top_y + 3), (pos_x - 5, torso_bottom_y - 3), (220, 230, 235), 2)
    cv2.line(frame_bgr, (pos_x + 5, torso_top_y + 3), (pos_x + 5, torso_bottom_y - 3), (220, 230, 235), 2)
    cv2.line(frame_bgr, (pos_x - 8, torso_top_y + 12), (pos_x + 8, torso_top_y + 12), (220, 230, 235), 2)
    
    # 5. Arms & Hands / Clipboard
    cv2.line(frame_bgr, (pos_x - 8, torso_top_y + 4), 
                        (int(pos_x - 10 + arm_swing * 0.6), torso_bottom_y - 2), (15, 100, 220), 3)
    cv2.line(frame_bgr, (pos_x + 8, torso_top_y + 4), 
                        (int(pos_x + 10 - arm_swing * 0.6), torso_bottom_y - 2), (15, 100, 220), 3)
    cv2.rectangle(frame_bgr, (int(pos_x + 9 - arm_swing * 0.6), torso_bottom_y - 6), 
                             (int(pos_x + 15 - arm_swing * 0.6), torso_bottom_y + 2), (50, 60, 70), -1)

    # 6. Head & Safety Helmet
    head_y = pos_y - int(worker_h * 0.88)
    cv2.circle(frame_bgr, (pos_x, head_y), 6, (120, 150, 185), -1)
    helmet_pts = np.array([
        [pos_x - 8, head_y - 1],
        [pos_x - 6, head_y - 9],
        [pos_x + 6, head_y - 9],
        [pos_x + 8, head_y - 1]
    ], np.int32)
    cv2.fillPoly(frame_bgr, [helmet_pts], (25, 215, 245))
    cv2.line(frame_bgr, (pos_x - 9, head_y - 1), (pos_x + 9, head_y - 1), (20, 180, 210), 2)

def add_cctv_sensor_optics(frame_bgr):
    noise = np.random.normal(0, 1.8, frame_bgr.shape).astype(np.float32)
    noisy = frame_bgr.astype(np.float32) + noise
    clamped = np.clip(noisy, 0, 255).astype(np.uint8)
    return clamped

def main():
    print(f"================================================================")
    print(f"Generating Realistic CCTV Fire & Smoke Detection Training Video")
    print(f"Resolution: {WIDTH}x{HEIGHT} @ {FPS} FPS | Duration: {TOTAL_SECONDS}s ({TOTAL_FRAMES} frames)")
    print(f"Target Output: {OUTPUT_VIDEO_PATH}")
    print(f"================================================================")
    
    print("[1/5] Synthesizing static industrial mining environment...")
    base_bg = create_base_environment(WIDTH, HEIGHT)
    
    smoke_source_x = int(WIDTH * 0.44)
    smoke_source_y = int(HEIGHT * 0.39)
    
    fire_source_x = int(WIDTH * 0.44)
    fire_source_y = int(HEIGHT * 0.58)
    
    sec_fire_x = int(WIDTH * 0.48)
    sec_fire_y = int(HEIGHT * 0.58)
    
    smoke_system_light = SmokeParticleSystem(smoke_source_x, smoke_source_y)
    smoke_system_heavy = SmokeParticleSystem(smoke_source_x + 10, smoke_source_y)
    
    fire_renderer_main = FireRenderer(fire_source_x, fire_source_y)
    fire_renderer_sec = FireRenderer(sec_fire_x, sec_fire_y)
    
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    writer = cv2.VideoWriter(OUTPUT_VIDEO_PATH, fourcc, FPS, (WIDTH, HEIGHT))
    
    if not writer.isOpened():
        print(f"Error: OpenCV could not open VideoWriter for {OUTPUT_VIDEO_PATH}")
        return
        
    ground_truth_records = []
    
    print("[2/5] Rendering frames across 5 progressive training phases...")
    start_time = time.time()
    
    for frame_idx in range(TOTAL_FRAMES):
        t = frame_idx / float(FPS)
        current_frame = base_bg.copy()
        
        if t < 18.0:
            target_class = "NORMAL"
            sub_state = "Normal operations, worker transit, equipment baseline"
            light_smoke_intensity = 0.0
            heavy_smoke_intensity = 0.0
            fire_intensity = 0.0
        elif t < 32.0:
            target_class = "SMOKE"
            sub_state = "Light electrical smoke, wispy plume building up"
            light_smoke_intensity = np.clip((t - 18.0) / 10.0, 0.1, 1.0)
            heavy_smoke_intensity = 0.0
            fire_intensity = 0.0
        elif t < 46.0:
            target_class = "SMOKE"
            sub_state = "Heavy dense black industrial smoke plume"
            light_smoke_intensity = 0.4
            heavy_smoke_intensity = np.clip((t - 32.0) / 8.0, 0.2, 1.0)
            fire_intensity = 0.0
        elif t < 60.0:
            target_class = "FIRE"
            sub_state = "Fire ignition, small flame growing to medium-large fire"
            light_smoke_intensity = 0.25
            heavy_smoke_intensity = 0.0
            fire_intensity = 0.2 + 0.65 * np.clip((t - 46.0) / 10.0, 0.0, 1.0)
        else:
            target_class = "FIRE + SMOKE"
            sub_state = "Full emergency: Large active fire + heavy billowing smoke plume"
            light_smoke_intensity = 0.0
            heavy_smoke_intensity = 1.0
            fire_intensity = 0.95
            
        # 1. Normal Phase Animation: Worker crossing yard (from t=3.0s to t=14.5s)
        if 3.0 <= t <= 14.5:
            worker_progress = (t - 3.0) / 11.5
            worker_x = int(WIDTH * 0.18 + worker_progress * (WIDTH * 0.58))
            worker_y = int(HEIGHT * 0.72 - worker_progress * (HEIGHT * 0.08))
            step_phase = (t - 3.0) * 8.0
            draw_worker(current_frame, worker_x, worker_y, step_phase)
            
        # 2. Fire Simulation & Thermal Radiative Glow
        if fire_intensity > 0.0:
            current_frame = fire_renderer_main.render(current_frame, fire_intensity, frame_idx)
            if target_class == "FIRE + SMOKE":
                current_frame = fire_renderer_sec.render(current_frame, fire_intensity * 0.75, frame_idx + 15)
                
        # 3. Smoke Simulation
        if light_smoke_intensity > 0.0:
            current_frame = smoke_system_light.update_and_render(current_frame, light_smoke_intensity, smoke_type="light")
        if heavy_smoke_intensity > 0.0:
            current_frame = smoke_system_heavy.update_and_render(current_frame, heavy_smoke_intensity, smoke_type="heavy")
            
        # 4. CCTV Camera Optics & Sensor Characteristics
        final_cctv_frame = add_cctv_sensor_optics(current_frame)
        
        # Write frame to video
        writer.write(final_cctv_frame)
        
        # Record ground truth metadata
        ground_truth_records.append({
            "frame_number": frame_idx,
            "timestamp_sec": round(t, 3),
            "class_label": target_class,
            "has_fire": fire_intensity > 0.1,
            "has_smoke": (light_smoke_intensity > 0.1 or heavy_smoke_intensity > 0.1),
            "smoke_level": "None" if (light_smoke_intensity <= 0.1 and heavy_smoke_intensity <= 0.1) else ("Heavy" if heavy_smoke_intensity > 0.3 else "Light"),
            "fire_level": "None" if fire_intensity <= 0.1 else ("Large" if fire_intensity > 0.7 else ("Medium" if fire_intensity > 0.4 else "Small")),
            "description": sub_state
        })
        
        if (frame_idx + 1) % 30 == 0 or frame_idx == TOTAL_FRAMES - 1:
            elapsed = time.time() - start_time
            fps_proc = (frame_idx + 1) / elapsed
            percent = ((frame_idx + 1) / TOTAL_FRAMES) * 100.0
            print(f"  Frame {frame_idx + 1:4d}/{TOTAL_FRAMES} ({percent:5.1f}%) | Speed: {fps_proc:5.1f} fps | Elapsed: {elapsed:4.1f}s | Current: {target_class}")
            sys.stdout.flush()

    writer.release()
    print(f"\n[3/5] Video generation complete: {OUTPUT_VIDEO_PATH}")
    
    # Step 3: Write Ground Truth CSV
    print("[4/5] Exporting Ground Truth CSV label dataset...")
    with open(OUTPUT_CSV_PATH, mode='w', newline='', encoding='utf-8') as f:
        writer_csv = csv.DictWriter(f, fieldnames=[
            "frame_number", "timestamp_sec", "class_label", 
            "has_fire", "has_smoke", "smoke_level", "fire_level", "description"
        ])
        writer_csv.writeheader()
        writer_csv.writerows(ground_truth_records)
    print(f"  Saved: {OUTPUT_CSV_PATH}")
    
    # Step 4: Write Dataset Manifest JSON
    print("[5/5] Exporting Dataset Manifest JSON...")
    manifest = {
        "video_file": OUTPUT_VIDEO_PATH,
        "format": "MP4 (H.264 / mp4v)",
        "resolution": f"{WIDTH}x{HEIGHT}",
        "fps": FPS,
        "total_frames": TOTAL_FRAMES,
        "duration_seconds": TOTAL_SECONDS,
        "camera_type": "Fixed Mining / Industrial CCTV Surveillance Camera (Static Mount)",
        "classes": ["NORMAL", "SMOKE", "FIRE", "FIRE + SMOKE"],
        "timeline_segments": [
            {
                "phase": 1,
                "label": "NORMAL",
                "time_range": "00:00 - 00:18",
                "start_sec": 0.0,
                "end_sec": 18.0,
                "start_frame": 0,
                "end_frame": 540,
                "description": "Baseline mining equipment yard operations, clear daylight, worker transit, no fire, no smoke"
            },
            {
                "phase": 2,
                "label": "SMOKE",
                "time_range": "00:18 - 00:32",
                "start_sec": 18.0,
                "end_sec": 32.0,
                "start_frame": 540,
                "end_frame": 960,
                "description": "Early incipient electrical smoke, light wispy semi-transparent plumes rising from equipment louvers"
            },
            {
                "phase": 3,
                "label": "SMOKE",
                "time_range": "00:32 - 00:46",
                "start_sec": 32.0,
                "end_sec": 46.0,
                "start_frame": 960,
                "end_frame": 1380,
                "description": "Heavy dense dark soot smoke column billowing upward and dispersing into the sky"
            },
            {
                "phase": 4,
                "label": "FIRE",
                "time_range": "00:46 - 01:00",
                "start_sec": 46.0,
                "end_sec": 60.0,
                "start_frame": 1380,
                "end_frame": 1800,
                "description": "Visible fire ignition at equipment base, transitioning from small flame to medium/large fire with incandescent thermal flicker"
            },
            {
                "phase": 5,
                "label": "FIRE + SMOKE",
                "time_range": "01:00 - 01:15",
                "start_sec": 60.0,
                "end_sec": 75.0,
                "start_frame": 1800,
                "end_frame": 2250,
                "description": "Severe industrial safety incident: Vigorous active fire with high thermal radiative glow and dense billowing smoke plume"
            }
        ]
    }
    with open(OUTPUT_JSON_PATH, mode='w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2)
    print(f"  Saved: {OUTPUT_JSON_PATH}")
    print("\nAll tasks completed successfully!")

if __name__ == "__main__":
    main()
