"""
NEXUS AQUA - Model Training Pipeline with NOAA AI4Shipwrecks AUV Sonar Dataset
Trains the YOLOv8 AI Agent using real-world AUV side-scan sonar shipwreck data
from NOAA Thunder Bay National Marine Sanctuary (Iver3 AUV / EdgeTech 2205 sonar)
combined with the 10 specialized marine debris classes and hard negative seabed textures.
"""

import os
import sys
import time
import shutil
import logging
from pathlib import Path
from ultralytics import YOLO

os.environ['TQDM_DISABLE'] = '1'

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger("nexus_train_shipwrecks")

BACKEND_DIR = Path(__file__).resolve().parent
DATASET_OUT = BACKEND_DIR / "dataset_ai4shipwrecks"
DATA_YAML = DATASET_OUT / "data.yaml"

CLASSES = [
    "ghost_net",          # 0: Fishing nets, entangled ropes
    "submerged_tire",     # 1: Automotive / marine fender tires
    "plastic_bottle",     # 2: Beverage bottles, PET containers
    "metal_drum",         # 3: 55-gallon oil/chemical barrels
    "plastic_waste",      # 4: Plastic bags, sheeting, wrappers
    "subsea_pipe_cable",  # 5: Industrial pipes, armored cables
    "cargo_container",    # 6: Crates, shipping container fragments
    "wood_timber",        # 7: Submerged logs, treated timber piles
    "glass_debris",       # 8: Glass bottles, jars
    "shipwreck_hull",     # 9: Structural wreckage, vessel fragments (Real NOAA AUV Sonar)
]


def train_nexus_ai_agent(epochs: int = 8):
    """
    Fine-tunes YOLOv8 on the AI4Shipwrecks + Marine Debris dataset.
    Saves the resulting weights directly to nexus_debris_v1.pt.
    """
    base_model_file = BACKEND_DIR / "yolov8n.pt"
    if not base_model_file.exists():
        base_model_file = "yolov8n.pt"

    logger.info(f"Initializing YOLOv8 from base model: {base_model_file}")
    model = YOLO(str(base_model_file))

    logger.info(f"Starting AI agent training ({epochs} epochs, batch=16, imgsz=640, cosine LR on CPU)...")
    start_time = time.time()

    results = model.train(
        data=str(DATA_YAML),
        epochs=epochs,
        imgsz=640,
        batch=16,
        workers=0,
        device="cpu",
        cos_lr=True,
        lr0=0.01,
        lrf=0.001,
        plots=False,
        verbose=True,
        project=str(DATASET_OUT / "runs"),
        name="ai4shipwrecks_trained",
    )

    train_duration = time.time() - start_time
    logger.info(f"Training completed in {train_duration / 60:.1f} minutes.")

    # Validate model
    logger.info("Running validation metrics on test/val set...")
    metrics = model.val()

    map50 = float(getattr(metrics.box, "map50", 0.0))
    p = float(getattr(metrics.box, "mp", 0.0))
    r = float(getattr(metrics.box, "mr", 0.0))
    map50_95 = float(getattr(metrics.box, "map", 0.0))

    logger.info(f"Validation Metrics: Precision={p:.1%} | Recall={r:.1%} | mAP@50={map50:.1%} | mAP@50-95={map50_95:.1%}")

    # Copy best weights directly to backend/nexus_debris_v1.pt
    dest_path = BACKEND_DIR / "nexus_debris_v1.pt"
    best_weights = DATASET_OUT / "runs" / "ai4shipwrecks_trained" / "weights" / "best.pt"
    if best_weights.exists():
        shutil.copy(best_weights, dest_path)
        logger.info(f"Copied best weights to: {dest_path}")
    else:
        model.save(str(dest_path))
        logger.info(f"Saved model to: {dest_path}")

    print("\n" + "=" * 70)
    print(" [SUCCESS] NEXUS AQUA AI AGENT TRAINED ON AI4SHIPWRECKS DATASET")
    print("=" * 70)
    print(f" Trained Model Path: {dest_path}")
    print(f" Dataset:           NOAA Thunder Bay AI4Shipwrecks AUV Sonar + Marine Debris")
    print(f" Total Classes:     {len(CLASSES)}")
    print(f" Validation Prec:   {p:.1%}")
    print(f" Validation Recall: {r:.1%}")
    print(f" Validation mAP@50: {map50:.1%}")
    print("=" * 70 + "\n")

    return dest_path


if __name__ == "__main__":
    train_nexus_ai_agent(epochs=8)
