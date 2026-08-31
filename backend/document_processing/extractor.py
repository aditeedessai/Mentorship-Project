import os
from abc import ABC, abstractmethod
import cv2
import numpy as np
import pymupdf as fitz
from docx import Document
from paddleocr import PaddleOCR
from pptx import Presentation

# Disable problematic oneDNN & PIR optimizations on Windows CPU before engine initialization
os.environ["FLAGS_use_mkldnn"] = "0"
os.environ["FLAGS_enable_pir_api"] = "0"

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
DOCUMENT_EXTENSIONS = {".pdf", ".docx", ".pptx"}
SUPPORTED_EXTENSIONS = DOCUMENT_EXTENSIONS | IMAGE_EXTENSIONS

_ocr_engine = None


def get_ocr_engine():
    global _ocr_engine
    if _ocr_engine is None:
        _ocr_engine = PaddleOCR(
            use_angle_cls=True,
            lang="en",
            enable_mkldnn=False,
            ocr_version="PP-OCRv4"
        )
    return _ocr_engine


def preprocess_image_to_grayscale(img_bytes: bytes) -> np.ndarray:
    """
    Decodes image bytes, applies grayscale transformation, noise reduction,
    and adaptive thresholding, then converts back to 3-channel for OCR processing.
    """
    nparr = np.frombuffer(img_bytes, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if image is None:
        raise ValueError("Could not decode the uploaded image file.")

    # 1. Grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # 2. Denoising & Adaptive Thresholding
    denoised = cv2.fastNlMeansDenoising(gray, h=10)
    enhanced = cv2.adaptiveThreshold(
        denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
    )

    # 3. Convert back to 3-channel BGR
    return cv2.cvtColor(enhanced, cv2.COLOR_GRAY2BGR)


def extract_text_safely(result) -> list[str]:
    """
    Safely extract recognized text lines across different output structures.
    """
    lines = []
    if not result:
        return lines

    def parse_node(node):
        if node is None:
            return

        if hasattr(node, "json") and isinstance(node.json, dict):
            parse_node(node.json)
            return

        if isinstance(node, dict):
            if "rec_texts" in node and isinstance(node["rec_texts"], list):
                for t in node["rec_texts"]:
                    val = str(t).strip()
                    if val and val not in lines:
                        lines.append(val)
                return

            for key in ["rec_text", "text", "transcription"]:
                if key in node and node[key]:
                    val = str(node[key]).strip()
                    if val and val not in lines:
                        lines.append(val)

            for v in node.values():
                if isinstance(v, (list, tuple, dict)):
                    parse_node(v)
            return

        if isinstance(node, (list, tuple)):
            if (
                len(node) == 2
                and isinstance(node[1], (list, tuple))
                and len(node[1]) >= 1
                and isinstance(node[1][0], str)
            ):
                val = node[1][0].strip()
                if val and val not in lines:
                    lines.append(val)
                return

            for sub in node:
                parse_node(sub)

    parse_node(result)
    return lines


def run_ocr_on_bytes(img_bytes: bytes) -> str:
    """
    Runs Grayscale preprocessing and executes OCR extraction.
    """
    processed_img = preprocess_image_to_grayscale(img_bytes)
    ocr = get_ocr_engine()

    try:
        result = ocr.ocr(processed_img, cls=True)
    except Exception:
        try:
            result = ocr.ocr(processed_img)
        except Exception as err:
            print(f"[OCR Warning] Primary OCR call error: {err}")
            result = None

    lines = extract_text_safely(result)

    # Fallback to raw grayscale image if adaptive threshold was too harsh
    if not lines:
        nparr = np.frombuffer(img_bytes, np.uint8)
        raw_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if raw_bgr is not None:
            try:
                result = ocr.ocr(raw_bgr)
                lines = extract_text_safely(result)
            except Exception:
                pass

    return "\n".join(lines)


class DocumentExtractor(ABC):
    @abstractmethod
    def extract_text(self, file_path: str) -> str:
        pass


class ImageExtractor(DocumentExtractor):
    def extract_text(self, file_path: str) -> str:
        with open(file_path, "rb") as f:
            img_bytes = f.read()
        return run_ocr_on_bytes(img_bytes)


class PDFExtractor(DocumentExtractor):
    def extract_text(self, file_path: str) -> str:
        text = ""
        doc = fitz.open(file_path)

        try:
            for page in doc:
                page_text = page.get_text().strip()

                if len(page_text) > 40:
                    text += page_text + "\n\n"
                else:
                    pix = page.get_pixmap(dpi=200)
                    img_bytes = pix.tobytes("png")
                    ocr_text = run_ocr_on_bytes(img_bytes)
                    if ocr_text:
                        text += ocr_text + "\n\n"
        finally:
            doc.close()

        return text


class DOCXExtractor(DocumentExtractor):
    def extract_text(self, file_path: str) -> str:
        text = ""
        doc = Document(file_path)
        for paragraph in doc.paragraphs:
            if paragraph.text:
                text += paragraph.text + "\n"
        return text


class PPTXExtractor(DocumentExtractor):
    def extract_text(self, file_path: str) -> str:
        text = ""
        prs = Presentation(file_path)
        for slide in prs.slides:
            for shape in slide.shapes:
                if hasattr(shape, "text") and shape.text:
                    text += shape.text + "\n"
        return text


def get_extractor(file_path: str) -> DocumentExtractor:
    ext = os.path.splitext(file_path)[1].lower()

    if ext in IMAGE_EXTENSIONS:
        return ImageExtractor()
    elif ext == ".pdf":
        return PDFExtractor()
    elif ext == ".docx":
        return DOCXExtractor()
    elif ext == ".pptx":
        return PPTXExtractor()

    allowed_list = ", ".join(sorted(SUPPORTED_EXTENSIONS))
    raise ValueError(
        f"Unsupported file type '{ext}'. Allowed formats: {allowed_list}"
    )


def extract_text(file_path: str) -> str:
    extractor = get_extractor(file_path)
    text = extractor.extract_text(file_path)

    if not text.strip():
        raise ValueError("No text could be extracted from the uploaded file.")

    return text