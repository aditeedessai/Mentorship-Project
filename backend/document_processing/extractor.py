import os
import pymupdf as fitz
from docx import Document
from pptx import Presentation

SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".doc", ".pptx", ".ppt"}
REJECTED_EXTENSIONS = {
    ".mp3", ".mp4", ".wav", ".avi", ".mov", ".m4a", ".mkv", ".flac", ".ogg", ".webm"
}


def extract_text(file_path: str) -> str:
    ext = os.path.splitext(file_path)[1].lower()

    if ext in REJECTED_EXTENSIONS:
        raise ValueError(f"Unsupported file type '{ext}'. Audio/video files are not allowed.")

    if ext not in SUPPORTED_EXTENSIONS:
        raise ValueError(f"Unsupported file type '{ext}'. Allowed formats: PDF, PPT/PPTX, DOC/DOCX.")

    text = ""

    # 1. PDF
    if ext == ".pdf":
        doc = fitz.open(file_path)
        for page in doc:
            text += page.get_text() + "\n"

    # 2. Word (.docx)
    elif ext == ".docx":
        doc = Document(file_path)
        for paragraph in doc.paragraphs:
            if paragraph.text:
                text += paragraph.text + "\n"

    # 3. PowerPoint (.pptx)
    elif ext == ".pptx":
        prs = Presentation(file_path)
        for slide in prs.slides:
            for shape in slide.shapes:
                if hasattr(shape, "text") and shape.text:
                    text += shape.text + "\n"

    # 4. Legacy Formats
    elif ext in [".doc", ".ppt"]:
        target_ext = ".docx" if ext == ".doc" else ".pptx"
        raise ValueError(f"Legacy format '{ext}' is not supported directly. Please convert to {target_ext} or PDF.")

    if not text.strip():
        raise ValueError("No text could be extracted from the uploaded file.")

    return text
