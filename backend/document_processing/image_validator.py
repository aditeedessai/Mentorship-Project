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
    Hybrid Evaluation Model combining:
    - Text volume and vertical line structure
    - Academic/Study vocabulary cues
    - Bullet point/numbering or high-density paragraph layouts
    """
    lines = ocr_details.get("lines", [])
    confidences = ocr_details.get("confidences", [])
    boxes = ocr_details.get("boxes", [])
    width = ocr_details.get("width", 1)
    height = ocr_details.get("height", 1)

    valid_lines = [l.strip() for l in lines if l and l.strip()]
    total_lines = len(valid_lines)
    
    all_words = [w for line in valid_lines for w in line.split() if w.strip()]
    total_words = len(all_words)
    full_text_lower = " ".join(all_words).lower()

    avg_confidence = (sum(confidences) / len(confidences)) if confidences else 0.0
    total_boxes = len(boxes)

    valid_boxes = [b for b in boxes if b != (0.0, 0.0, 0.0, 0.0)]
    vert_dispersion = 0.0
    if valid_boxes and width > 0 and height > 0:
        box_centers_y = [(b[1] + b[3]) / 2.0 for b in valid_boxes]
        vert_dispersion = (max(box_centers_y) - min(box_centers_y)) / float(height)

    # 1. Academic & Study Vocabulary Keywords
    academic_keywords = [
        "definition", "theorem", "equation", "chapter", "exercise", 
        "question", "note", "notes", "example", "solution", "page", 
        "summary", "topic", "module", "assignment", "problem", "protection"
    ]
    keyword_matches = sum(1 for kw in academic_keywords if kw in full_text_lower)
    
    # 2. Structured formatting checks
    has_structured_bullets = any(
        line.startswith(("1.", "2.", "3.", "4.", "5.", "a)", "b)", "c)", "i.", "ii.", "iii.", "Q)")) 
        for line in valid_lines
    )

    # 3. High Density Paragraph check (for notes without bullets)
    has_high_density = total_lines >= 5 and total_words >= 25

    # 4. Scoring Matrix
    score = 0.0
    if total_words >= 15:
        score += 2.0
    if total_lines >= 4:
        score += 2.0
    if vert_dispersion >= 0.25:
        score += 2.0
    if keyword_matches > 0 or has_structured_bullets or has_high_density:
        score += 3.0

    metrics = {
        "total_lines": total_lines,
        "total_words": total_words,
        "keyword_matches": keyword_matches,
        "vert_dispersion": round(vert_dispersion, 3),
        "score": round(score, 2),
    }

    # Flexible Final Gate: Passes with keywords, bullets, OR dense paragraph structure
    is_valid = score >= 5.5 and total_lines >= 3 and (keyword_matches > 0 or has_structured_bullets or has_high_density)
    return is_valid, score, metrics


def validate_and_extract_image_study_material(file_path: str) -> str:
    """
    Full single-pass image validation and text extraction pipeline.
    """
    img_bytes, width, height = validate_image_file_properties(file_path)

    ocr_details = run_ocr_on_bytes(img_bytes, return_details=True)

    if not ocr_details.get("width") or not ocr_details.get("height"):
        ocr_details["width"] = width
        ocr_details["height"] = height

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