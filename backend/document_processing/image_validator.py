import cv2
import numpy as np
from pathlib import Path
from io import BytesIO
from PIL import Image

from backend.document_processing.extractor import (
    IMAGE_EXTENSIONS,
    run_ocr_on_bytes,
)

MAX_IMAGE_SIZE_BYTES = 15 * 1024 * 1024  # 15 MB limit
MIN_IMAGE_DIMENSION = 200                # 200 x 200 pixels minimum


class ImageValidationError(ValueError):
    """Exception raised when an uploaded image fails study-material validation rules."""
    pass


def validate_image_file_properties(file_path: str) -> tuple[bytes, int, int]:
    """
    Validates basic image file properties before processing/OCR:
    - Supported extension (.png, .jpg, .jpeg, .webp)
    - File size limit (<= 15 MB)
    - Header/magic byte consistency and readability
    - Minimum pixel dimensions (>= 200x200 px)

    Returns:
        tuple: (img_bytes, width, height)
    """
    path = Path(file_path).expanduser().resolve()

    if not path.exists():
        raise ImageValidationError(f"File not found: {path.name}")

    ext = path.suffix.lower()
    if ext not in IMAGE_EXTENSIONS:
        allowed = ", ".join(sorted(IMAGE_EXTENSIONS))
        raise ImageValidationError(
            f"Unsupported image format '{ext}'. Allowed formats: {allowed}"
        )

    file_size = path.stat().st_size
    if file_size > MAX_IMAGE_SIZE_BYTES:
        raise ImageValidationError(
            "File size exceeds the 15 MB maximum limit for image uploads."
        )

    try:
        with open(path, "rb") as f:
            img_bytes = f.read()
    except Exception:
        raise ImageValidationError("The uploaded image file could not be read.")

    if not img_bytes:
        raise ImageValidationError("The uploaded image file is empty.")

    # 1. Inspect image content with OpenCV for decoding and dimensions
    nparr = np.frombuffer(img_bytes, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if image is None:
        # Fallback to Pillow check before rejecting
        try:
            pil_img = Image.open(BytesIO(img_bytes))
            width, height = pil_img.size
            pil_img.verify()
        except Exception:
            raise ImageValidationError(
                "The uploaded image could not be read. Please upload a valid image file."
            )
    else:
        height, width = image.shape[:2]

    # 2. Check minimum dimensions
    if width < MIN_IMAGE_DIMENSION or height < MIN_IMAGE_DIMENSION:
        raise ImageValidationError(
            f"Image dimensions ({width}x{height}px) are too small. "
            f"Please upload an image with at least {MIN_IMAGE_DIMENSION}x{MIN_IMAGE_DIMENSION} resolution."
        )

    return img_bytes, width, height


def evaluate_study_material_heuristics(ocr_details: dict) -> tuple[bool, float, dict]:
    """
    Evaluates whether OCR metadata from an image provides reasonable evidence
    that it contains study/document material (notes, textbook pages, worksheets,
    mathematical workings, diagrams, graphs, slides).

    Uses a multi-signal decision model combining:
    - Text amount (words, lines, character count)
    - Number of detected text regions / bounding boxes
    - Average and high-confidence OCR scores
    - Bounding-box spatial dispersion across page canvas
    - Quadrant grid coverage
    - Safeguards for sparse-text diagrams, handwritten notes, and formulas

    Returns:
        tuple: (is_valid: bool, score: float, metrics: dict)
    """
    lines = ocr_details.get("lines", [])
    confidences = ocr_details.get("confidences", [])
    boxes = ocr_details.get("boxes", [])
    width = ocr_details.get("width", 1)
    height = ocr_details.get("height", 1)

    total_lines = len(lines)
    all_words = [w for line in lines for w in line.split() if w.strip()]
    total_words = len(all_words)
    total_chars = sum(len(line) for line in lines)

    avg_confidence = (sum(confidences) / len(confidences)) if confidences else 0.0
    total_boxes = len(boxes)

    # Filter non-zero valid bounding boxes for spatial calculations
    valid_boxes = [b for b in boxes if b != (0.0, 0.0, 0.0, 0.0)]

    # Spatial dispersion metrics
    if valid_boxes and width > 0 and height > 0:
        box_centers_x = [(b[0] + b[2]) / 2.0 for b in valid_boxes]
        box_centers_y = [(b[1] + b[3]) / 2.0 for b in valid_boxes]
        vert_dispersion = (max(box_centers_y) - min(box_centers_y)) / float(height)
        horiz_dispersion = (max(box_centers_x) - min(box_centers_x)) / float(width)

        # Quadrant grid coverage (2x2 grid)
        mid_x = width / 2.0
        mid_y = height / 2.0
        quadrants = set()
        for cx, cy in zip(box_centers_x, box_centers_y):
            q_x = 0 if cx < mid_x else 1
            q_y = 0 if cy < mid_y else 1
            quadrants.add((q_x, q_y))
        quadrant_coverage = len(quadrants)
    else:
        vert_dispersion = 0.0
        horiz_dispersion = 0.0
        quadrant_coverage = 0

    # Multi-signal scoring
    score = 0.0

    # 1. Text Amount Signals
    if total_words >= 15:
        score += 3.0
    elif total_words >= 8:
        score += 2.0
    elif total_words >= 3:
        score += 1.0

    if total_lines >= 5:
        score += 1.5
    elif total_lines >= 3:
        score += 1.0
    elif total_lines >= 1:
        score += 0.5

    # 2. Confidence Signals
    if avg_confidence >= 0.80:
        score += 2.0
    elif avg_confidence >= 0.65:
        score += 1.0

    # 3. Text Region Count
    if total_boxes >= 5:
        score += 2.5
    elif total_boxes >= 3:
        score += 1.5
    elif total_boxes >= 1:
        score += 0.5

    # 4. Spatial Dispersion & Grid Coverage (Document/Page-like composition)
    if vert_dispersion >= 0.30:
        score += 1.5
    elif vert_dispersion >= 0.15:
        score += 0.75

    if horiz_dispersion >= 0.30:
        score += 1.0

    if quadrant_coverage >= 3:
        score += 2.5
    elif quadrant_coverage >= 2:
        score += 1.5

    # 5. False-Rejection Safeguard for Diagrams, Graphs & Handwritten Notes
    # If text is sparse but there are multiple distinct text boxes, decent confidence,
    # and spatial dispersion (e.g. labeled diagram, math formula, chart), give bonus.
    if total_boxes >= 2 and avg_confidence >= 0.60 and (quadrant_coverage >= 2 or vert_dispersion >= 0.20):
        score += 2.0

    metrics = {
        "total_lines": total_lines,
        "total_words": total_words,
        "total_chars": total_chars,
        "avg_confidence": round(avg_confidence, 3),
        "total_boxes": total_boxes,
        "vert_dispersion": round(vert_dispersion, 3),
        "quadrant_coverage": quadrant_coverage,
        "score": round(score, 2),
    }

    # Conservative pass threshold: 3.5 points
    is_valid = score >= 3.5
    return is_valid, score, metrics


def validate_and_extract_image_study_material(file_path: str) -> str:
    """
    Full single-pass image validation and text extraction pipeline.

    1. Validates basic file properties (type, size <= 15MB, readable, min 200x200px).
    2. Runs a SINGLE pass of PaddleOCR returning text and structured details.
    3. Evaluates study material evidence heuristics.
    4. If invalid, raises ImageValidationError (HTTP 400 user-friendly rejection).
    5. If valid, returns extracted OCR text directly (avoiding double OCR).

    Returns:
        str: Extracted OCR text for valid study material images.
    """
    # Step 1: Basic property validation (file type, size, dimensions, corrupted check)
    img_bytes, width, height = validate_image_file_properties(file_path)

    # Step 2: Single-pass OCR execution with details
    ocr_details = run_ocr_on_bytes(img_bytes, return_details=True)

    # Fall back to validated width/height if OCR canvas dimensions missing
    if not ocr_details.get("width") or not ocr_details.get("height"):
        ocr_details["width"] = width
        ocr_details["height"] = height

    # Step 3: Heuristic study material decision
    is_valid, score, metrics = evaluate_study_material_heuristics(ocr_details)

    if not is_valid:
        raise ImageValidationError(
            "This image doesn't appear to contain study notes or learning material. "
            "Please upload a clear photo of your notes, textbook page, worksheet, diagram, or other study material."
        )

    text = ocr_details.get("text", "").strip()
    if not text:
        raise ImageValidationError(
            "This image doesn't appear to contain study notes or learning material. "
            "Please upload a clear photo of your notes, textbook page, worksheet, diagram, or other study material."
        )

    return text
