"""
NEXUS AQUA - Sonar Image Preprocessor
Performs lightweight preprocessing on user-uploaded side-scan sonar images:
  1. Validate (format, size, corrupt check)
  2. Noise reduction (Gaussian blur)
  3. Contrast enhancement (CLAHE)
  4. Normalization
  5. Resize to model input dimensions

Design goal: < 2ms preprocessing to support overall < 10ms inference target.
"""

import cv2
import numpy as np
from PIL import Image
import io
import time
from typing import Tuple
import logging

logger = logging.getLogger(__name__)

# Target model input size (YOLOv8n default)
MODEL_INPUT_SIZE = 640

# Max dimension to support Ultra-HD 4K, 8K, and long AUV side-scan sonar waterfall swaths (up to 16K)
MAX_IMAGE_DIMENSION = 16384


class PreprocessingError(Exception):
    """Raised when preprocessing fails due to invalid input."""
    pass


class SonarPreprocessor:
    """
    Lightweight sonar image preprocessor.
    Designed for speed: all operations are in-memory using NumPy/OpenCV.
    """

    def __init__(self):
        # CLAHE for contrast enhancement
        self.clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))

    def validate_image_bytes(self, image_bytes: bytes) -> None:
        """
        Validate raw image bytes before processing.
        Raises PreprocessingError on failure.
        """
        if not image_bytes or len(image_bytes) == 0:
            raise PreprocessingError("Empty image data received.")

        try:
            # Try opening with PIL to catch corrupt files
            img = Image.open(io.BytesIO(image_bytes))
            img.verify()  # Raises on corrupt file
        except Exception as e:
            raise PreprocessingError(f"Invalid or corrupt image file: {str(e)}")

        # Re-open after verify (verify closes the file)
        img = Image.open(io.BytesIO(image_bytes))
        width, height = img.size

        if width > MAX_IMAGE_DIMENSION or height > MAX_IMAGE_DIMENSION:
            raise PreprocessingError(
                f"Image too large ({width}x{height}). Max dimension: {MAX_IMAGE_DIMENSION}px"
            )

        if width < 32 or height < 32:
            raise PreprocessingError(
                f"Image too small ({width}x{height}). Min dimension: 32px"
            )

    def preprocess(self, image_bytes: bytes) -> Tuple[np.ndarray, np.ndarray, dict]:
        """
        Full preprocessing pipeline.

        Args:
            image_bytes: Raw bytes of the uploaded sonar image

        Returns:
            Tuple of:
                - preprocessed_array: np.ndarray (H, W, 3) BGR, ready for YOLO
                - original_array: np.ndarray original image for bbox overlay
                - metadata: dict with shape, timing, etc.

        Raises:
            PreprocessingError on invalid input
        """
        t0 = time.perf_counter()

        # 1. Validate
        self.validate_image_bytes(image_bytes)

        # 2. Decode to numpy
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise PreprocessingError("cv2 could not decode the image.")

        original = img.copy()
        h_orig, w_orig = img.shape[:2]

        # 3. Convert to grayscale for sonar-specific processing, then back to BGR
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # 4. Noise reduction — mild Gaussian blur preserves debris edges
        denoised = cv2.GaussianBlur(gray, (3, 3), 0)

        # 5. Contrast enhancement with CLAHE (adaptive histogram equalization)
        enhanced = self.clahe.apply(denoised)

        # 6. Convert back to BGR for YOLO (expects 3-channel)
        enhanced_bgr = cv2.cvtColor(enhanced, cv2.COLOR_GRAY2BGR)

        # 7. Normalize to [0, 255] uint8 (already is, but ensure)
        normalized = cv2.normalize(enhanced_bgr, None, 0, 255, cv2.NORM_MINMAX, cv2.CV_8U)

        # 8. Resize if needed (YOLO handles resize internally, but we cap for memory)
        if max(h_orig, w_orig) > MODEL_INPUT_SIZE * 2:
            scale = (MODEL_INPUT_SIZE * 2) / max(h_orig, w_orig)
            new_w = int(w_orig * scale)
            new_h = int(h_orig * scale)
            normalized = cv2.resize(normalized, (new_w, new_h), interpolation=cv2.INTER_LINEAR)
            original = cv2.resize(original, (new_w, new_h), interpolation=cv2.INTER_LINEAR)

        elapsed_ms = (time.perf_counter() - t0) * 1000

        metadata = {
            "original_shape": (h_orig, w_orig),
            "processed_shape": normalized.shape[:2],
            "preprocessing_ms": round(elapsed_ms, 3),
        }

        logger.debug(f"Preprocessing completed in {elapsed_ms:.2f}ms | shape: {normalized.shape}")
        return normalized, original, metadata


# Module-level singleton for reuse
_preprocessor_instance = None


def get_preprocessor() -> SonarPreprocessor:
    global _preprocessor_instance
    if _preprocessor_instance is None:
        _preprocessor_instance = SonarPreprocessor()
    return _preprocessor_instance
