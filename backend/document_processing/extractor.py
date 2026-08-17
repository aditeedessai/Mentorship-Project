import os
from abc import ABC, abstractmethod

import pymupdf as fitz
from docx import Document
from pptx import Presentation


SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".pptx"}


class DocumentExtractor(ABC):
    """
    Abstract base class for document text extraction.

    All document-specific extractors must implement
    extract_text().
    """

    @abstractmethod
    def extract_text(self, file_path: str) -> str:
        pass


class PDFExtractor(DocumentExtractor):
    """
    Extracts text from PDF files.
    """

    def extract_text(self, file_path: str) -> str:
        text = ""

        doc = fitz.open(file_path)

        try:
            for page in doc:
                text += page.get_text() + "\n"
        finally:
            doc.close()

        return text


class DOCXExtractor(DocumentExtractor):
    """
    Extracts text from DOCX files.
    """

    def extract_text(self, file_path: str) -> str:
        text = ""

        doc = Document(file_path)

        for paragraph in doc.paragraphs:
            if paragraph.text:
                text += paragraph.text + "\n"

        return text


class PPTXExtractor(DocumentExtractor):
    """
    Extracts text from PPTX files.
    """

    def extract_text(self, file_path: str) -> str:
        text = ""

        prs = Presentation(file_path)

        for slide in prs.slides:
            for shape in slide.shapes:
                if hasattr(shape, "text") and shape.text:
                    text += shape.text + "\n"

        return text


def get_extractor(file_path: str) -> DocumentExtractor:
    """
    Return the appropriate document extractor based
    on the file extension.
    """

    ext = os.path.splitext(file_path)[1].lower()

    if ext == ".pdf":
        return PDFExtractor()

    elif ext == ".docx":
        return DOCXExtractor()

    elif ext == ".pptx":
        return PPTXExtractor()

    raise ValueError(
        f"Unsupported file type '{ext}'. "
        "Allowed formats: PDF, DOCX, PPTX."
    )


def extract_text(file_path: str) -> str:
    """
    Extract text from a supported document.

    The appropriate extractor is selected automatically.
    """

    extractor = get_extractor(file_path)

    text = extractor.extract_text(file_path)

    if not text.strip():
        raise ValueError(
            "No text could be extracted from the uploaded file."
        )

    return text