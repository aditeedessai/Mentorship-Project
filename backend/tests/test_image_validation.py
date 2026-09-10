import io
import sys
import uuid
from pathlib import Path
from unittest.mock import MagicMock, patch

from PIL import Image

# Ensure project root is in sys.path
TEST_DIR = Path(__file__).resolve().parent
BACKEND_DIR = TEST_DIR.parent
PROJECT_ROOT = BACKEND_DIR.parent

for p in (str(PROJECT_ROOT), str(BACKEND_DIR)):
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    import pytest
except ImportError:
    pytest = None

from backend.database.database import get_connection, init_db
from backend.database import study_set_repository
from backend.document_processing.image_validator import (
    ImageValidationError,
    evaluate_study_material_heuristics,
    validate_and_extract_image_study_material,
    validate_image_file_properties,
)
from backend.services import document_service


def create_test_image_file(tmp_path, filename: str, size: tuple[int, int] = (300, 300), fmt: str = "PNG") -> Path:
    """Creates a temporary image file of given dimensions and format."""
    file_path = tmp_path / filename
    img = Image.new("RGB", size, color=(240, 240, 240))
    img.save(file_path, format=fmt)
    return file_path


# =====================================================================
# 1. BASIC IMAGE PROPERTY TESTS
# =====================================================================

def test_validate_supported_formats_and_dimensions(tmp_path):
    """Test 1: Valid PNG/JPG images with size >= 200x200 pass basic property validation."""
    png_path = create_test_image_file(tmp_path, "notes.png", (300, 300), "PNG")
    bytes_out, w, h = validate_image_file_properties(str(png_path))
    assert len(bytes_out) > 0
    assert w == 300
    assert h == 300

    jpg_path = create_test_image_file(tmp_path, "lecture.jpg", (400, 500), "JPEG")
    bytes_out, w, h = validate_image_file_properties(str(jpg_path))
    assert w == 400
    assert h == 500


def test_reject_unsupported_image_extension(tmp_path):
    """Test 8: Unsupported image file format raises ImageValidationError."""
    file_path = tmp_path / "graphic.gif"
    file_path.write_bytes(b"GIF89a...")
    if pytest:
        with pytest.raises(ImageValidationError) as exc_info:
            validate_image_file_properties(str(file_path))
        assert "Unsupported image format" in str(exc_info.value)


def test_reject_small_dimensions(tmp_path):
    """Test 10: Image below minimum 200x200 dimensions is rejected."""
    small_path = create_test_image_file(tmp_path, "tiny.png", (100, 150), "PNG")
    if pytest:
        with pytest.raises(ImageValidationError) as exc_info:
            validate_image_file_properties(str(small_path))
        assert "too small" in str(exc_info.value)


def test_reject_corrupted_image(tmp_path):
    """Test 7: Corrupted or unreadable image bytes raise ImageValidationError."""
    corrupted_path = tmp_path / "corrupted.jpg"
    corrupted_path.write_bytes(b"NOT_AN_IMAGE_HEADER_GARBAGE_BYTES_12345")
    if pytest:
        with pytest.raises(ImageValidationError) as exc_info:
            validate_image_file_properties(str(corrupted_path))
        assert "could not be read" in str(exc_info.value)


def test_reject_oversized_image(tmp_path):
    """Test 9: Image exceeding 15 MB limit is rejected."""
    large_path = tmp_path / "huge.png"
    # Create fake oversized file > 15MB
    large_path.write_bytes(b"0" * (15 * 1024 * 1024 + 100))
    if pytest:
        with pytest.raises(ImageValidationError) as exc_info:
            validate_image_file_properties(str(large_path))
        assert "exceeds the 15 MB maximum limit" in str(exc_info.value)


# =====================================================================
# 2. STUDY MATERIAL HEURISTIC DECISION MODEL TESTS
# =====================================================================

def test_heuristic_valid_printed_notes():
    """Test 1: Valid printed notes image with high text amount and confidence passes heuristic."""
    mock_ocr = {
        "lines": [
            "Chapter 4: Operating Systems Concepts",
            "1. Process Management and Virtual Memory Architecture",
            "Page 102 - Multithreading and Synchronization Locks",
            "Deadlock prevention requires mutual exclusion relaxation.",
            "Semaphores provide atomic signal operations.",
            "CPU Scheduling Algorithms: Round Robin, FIFO, SJF",
        ],
        "confidences": [0.95, 0.92, 0.91, 0.88, 0.94, 0.90],
        "boxes": [
            (20.0, 30.0, 300.0, 50.0),
            (20.0, 70.0, 450.0, 90.0),
            (20.0, 110.0, 420.0, 130.0),
            (20.0, 150.0, 480.0, 170.0),
            (20.0, 190.0, 460.0, 210.0),
            (20.0, 230.0, 490.0, 250.0),
        ],
        "width": 600,
        "height": 800,
    }
    is_valid, score, metrics = evaluate_study_material_heuristics(mock_ocr)
    assert is_valid is True
    assert score >= 5.0


def test_heuristic_valid_handwritten_notes():
    """Test 2: Valid handwritten notes with decent lines & spatial spread pass heuristic."""
    mock_ocr = {
        "lines": [
            "Photosynthesis reaction:",
            "6CO2 + 6H2O -> C6H12O6 + 6O2",
            "Light dependent phase in thylakoid membrane",
            "Calvin cycle occurs in stroma",
        ],
        "confidences": [0.78, 0.85, 0.72, 0.76],
        "boxes": [
            (30.0, 40.0, 250.0, 70.0),
            (30.0, 120.0, 350.0, 150.0),
            (30.0, 220.0, 420.0, 250.0),
            (30.0, 320.0, 380.0, 350.0),
        ],
        "width": 500,
        "height": 600,
    }
    is_valid, score, metrics = evaluate_study_material_heuristics(mock_ocr)
    assert is_valid is True


def test_heuristic_sparse_text_diagram_safeguards():
    """Test 3 & 12: Sparse-text educational diagram (labels in different regions) passes via diagram safeguard."""
    mock_ocr = {
        "lines": [
            "Cell Nucleus",
            "Mitochondria",
            "Ribosome",
            "Plasma Membrane",
        ],
        "confidences": [0.82, 0.79, 0.85, 0.81],
        "boxes": [
            (50.0, 50.0, 150.0, 75.0),      # Top-Left
            (350.0, 60.0, 460.0, 85.0),     # Top-Right
            (60.0, 400.0, 160.0, 425.0),    # Bottom-Left
            (340.0, 420.0, 470.0, 445.0),   # Bottom-Right
        ],
        "width": 600,
        "height": 600,
    }
    is_valid, score, metrics = evaluate_study_material_heuristics(mock_ocr)
    assert is_valid is True
    assert metrics["quadrant_coverage"] >= 3


def test_heuristic_clearly_unrelated_photo():
    """Test 5 & 6: Clearly unrelated photo with 0 or isolated text artifact is rejected."""
    mock_ocr_empty = {
        "lines": [],
        "confidences": [],
        "boxes": [],
        "width": 600,
        "height": 600,
    }
    is_valid, score, metrics = evaluate_study_material_heuristics(mock_ocr_empty)
    assert is_valid is False
    assert score < 3.5

    mock_ocr_isolated_noise = {
        "lines": ["100ml"],
        "confidences": [0.55],
        "boxes": [(10.0, 10.0, 40.0, 25.0)],
        "width": 800,
        "height": 800,
    }
    is_valid, score, metrics = evaluate_study_material_heuristics(mock_ocr_isolated_noise)
    assert is_valid is False


# =====================================================================
# 3. END-TO-END PIPELINE & DATABASE REGISTRATION INTEGRATION TESTS
# =====================================================================

def test_pipeline_valid_image_single_pass_ocr(tmp_path):
    """Test 1-4 & 11: Valid image passes validation and returns OCR text in single pass."""
    img_path = create_test_image_file(tmp_path, "study_page.png", (400, 400), "PNG")

    fake_ocr_details = {
        "lines": [
            "Neural Networks Architecture",
            "Forward propagation computes activations",
            "Backpropagation computes gradients via chain rule",
            "Loss Function optimization with Adam Optimizer",
        ],
        "confidences": [0.92, 0.90, 0.94, 0.89],
        "boxes": [
            (20.0, 30.0, 300.0, 50.0),
            (20.0, 80.0, 380.0, 100.0),
            (20.0, 130.0, 390.0, 150.0),
            (20.0, 180.0, 370.0, 200.0),
        ],
        "width": 400,
        "height": 400,
        "text": "Neural Networks Architecture\nForward propagation computes activations\nBackpropagation computes gradients via chain rule\nLoss Function optimization with Adam Optimizer",
    }

    with patch("backend.document_processing.image_validator.run_ocr_on_bytes", return_value=fake_ocr_details) as mock_ocr:
        extracted_text = validate_and_extract_image_study_material(str(img_path))
        assert "Neural Networks" in extracted_text
        assert mock_ocr.call_count == 1  # Verify SINGLE PASS OCR!


def test_rejected_image_does_not_reach_db_or_embeddings(tmp_path):
    """Test 14 & 15: Rejected image stops immediately BEFORE create_document() or embeddings."""
    init_db()
    conn = get_connection()
    user_id = "51894975-43bb-4e64-8fa1-9492453b558e"
    conn.close()

    # Create a test study set
    set_record = study_set_repository.create_study_set(
        study_set_id=str(uuid.uuid4()),
        name="Validation Isolation Test Set",
        user_id=user_id,
    )
    study_set_id = set_record["study_set_id"]

    unrelated_img = create_test_image_file(tmp_path, "unrelated_photo.png", (300, 300), "PNG")

    # Mock OCR returning 0 lines (unrelated photo)
    fake_empty_ocr = {
        "lines": [],
        "confidences": [],
        "boxes": [],
        "width": 300,
        "height": 300,
        "text": "",
    }

    with patch("backend.document_processing.image_validator.run_ocr_on_bytes", return_value=fake_empty_ocr), \
         patch("backend.database.study_set_repository.create_document") as mock_create_doc, \
         patch("backend.embeddings.embedding_model.generate_embeddings") as mock_gen_embed:

        if pytest:
            with pytest.raises(ImageValidationError) as exc_info:
                document_service.process_pdf(
                    pdf_path=str(unrelated_img),
                    study_set_id=study_set_id,
                    user_id=user_id,
                )
            assert "doesn't appear to contain study notes" in str(exc_info.value)
        else:
            try:
                document_service.process_pdf(
                    pdf_path=str(unrelated_img),
                    study_set_id=study_set_id,
                    user_id=user_id,
                )
                assert False, "Should have raised ImageValidationError"
            except ImageValidationError as e:
                assert "doesn't appear to contain study notes" in str(e)

        # CONFIRM: Neither create_document() nor generate_embeddings() was ever called!
        assert mock_create_doc.call_count == 0
        assert mock_gen_embed.call_count == 0


def test_pdf_bypasses_image_validation(tmp_path):
    """Test 11: PDF files bypass image validation completely and follow standard PDFExtractor flow."""
    pdf_file = tmp_path / "lecture.pdf"
    pdf_file.write_bytes(b"%PDF-1.4 ... fake pdf content ...")

    with patch("backend.services.document_service.extract_text", return_value="PDF digital text content for lecture") as mock_extract, \
         patch("backend.services.document_service.generate_embeddings", return_value=[[0.1] * 384]), \
         patch("backend.services.document_service.store_embeddings"):

        doc_id = document_service.process_pdf(
            pdf_path=str(pdf_file),
            study_set_id=str(uuid.uuid4()),
            user_id="51894975-43bb-4e64-8fa1-9492453b558e",
        )

        assert doc_id is not None
        assert mock_extract.call_count == 1  # Called standard PDF extract_text
