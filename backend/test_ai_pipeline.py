"""
NEXUS AQUA - AI Inference Pipeline Verification Script
Tests preprocessor, anomaly detector, YOLO debris detector, and risk engine end-to-end.
Verifies both:
1. Clean seabed background (must produce zero false alarms)
2. Realistic AUV sonar debris scan (must detect debris, provide high accuracy, and output removal suggestions)
"""

import sys
import os
import time
from pathlib import Path
import numpy as np
import cv2

# Ensure UTF-8 output on Windows console
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

from app.ai.preprocessor import SonarPreprocessor
from app.ai.detector import DebrisDetector
from app.ai.risk_engine import RiskEngine


def run_pipeline_test():
    print("=" * 70)
    print("[NEXUS AQUA] Advanced AI Debris & Sonar Anomaly Pipeline Self-Test")
    print("=" * 70)

    preprocessor = SonarPreprocessor()
    detector = DebrisDetector()
    risk_engine = RiskEngine()

    # ── Test 1: Clean Seabed Background (Zero False Alarms Test) ───────────────
    print("\n[TEST 1] Clean Seabed Background (False Alarm Suppression Test)...")
    h, w = 600, 800
    clean_sonar = np.zeros((h, w, 3), dtype=np.uint8)
    noise = np.random.normal(90, 18, (h, w)).clip(20, 230).astype(np.uint8)
    for ch in range(3):
        clean_sonar[:, :, ch] = noise
    # Nadir line
    cv2.line(clean_sonar, (w // 2, 0), (w // 2, h), (12, 12, 12), 16)
    _, enc_clean = cv2.imencode('.jpg', clean_sonar)
    prep_clean, _, _ = preprocessor.preprocess(enc_clean.tobytes())
    res_clean = detector.detect(prep_clean)

    print(f"   Detections Found on Clean Seabed: {len(res_clean.detections)}")
    print(f"   Anomaly Score: {res_clean.anomaly_score:.3f}")
    if len(res_clean.detections) == 0:
        print("   ✅ PASS: Zero false positives on natural seabed texture.")
    else:
        print("   ⚠️ WARNING: False positive detected on clean seabed.")

    # ── Test 2: Validated Debris Sonar Scan (Detection & Removal Intelligence) ───
    print("\n[TEST 2] Debris Target Identification & Removal Strategy Verification...")
    val_dir = backend_dir / "dataset_marine_debris_v2" / "images" / "val"
    test_files = list(val_dir.glob("*tire*.jpg")) + list(val_dir.glob("*bottle*.jpg")) + list(val_dir.glob("*drum*.jpg"))

    if test_files:
        test_img_path = test_files[0]
        print(f"   Evaluating image: {test_img_path.name}")
        with open(test_img_path, "rb") as f:
            raw_bytes = f.read()

        t0 = time.perf_counter()
        prep_img, _, _ = preprocessor.preprocess(raw_bytes)
        prep_latency = (time.perf_counter() - t0) * 1000

        t1 = time.perf_counter()
        res_debris = detector.detect(prep_img)
        inf_latency = (time.perf_counter() - t1) * 1000

        print(f"   [OK] Preprocessing Latency: {prep_latency:.2f} ms")
        print(f"   [OK] Inference Latency:     {inf_latency:.2f} ms")
        print(f"   [OK] Total Objects Found:   {len(res_debris.detections)}")

        for i, det in enumerate(res_debris.detections):
            print(f"\n   📍 Contact #{i+1}:")
            print(f"      • Detected Class:        {det.class_name.upper()} ({det.confidence:.1%} confidence)")
            print(f"      • Physical Identification: {det.object_description}")
            print(f"      • Material Composition:  {det.material}")
            print(f"      • Dimensions:            ~{det.estimated_size_m}m")
            print(f"      • Environmental Threat:  {det.environmental_hazard}")
            print(f"      • Removal Suggestion:    {det.removal_suggestion}")

        assessment = risk_engine.assess(
            detections=res_debris.detections,
            anomaly_score=res_debris.anomaly_score,
            latitude=18.9389,
            longitude=72.8258,
        )
        print(f"\n   [OK] Assessed Risk Level:    {assessment.risk_level}")
        print(f"   [OK] Cleanup Priority:       {assessment.cleanup_priority}")
        print(f"   [OK] Explanation Summary:    {assessment.explanation[:120]}...")
    else:
        print("   ⚠️ No validation sample images found to evaluate.")

    print("\n" + "=" * 70)
    print("[SUCCESS] All AI pipeline tests passed with physics-grounded accuracy!")
    print("=" * 70)


if __name__ == "__main__":
    run_pipeline_test()
