from document_processing.extractor import extract_text
from document_processing.cleaner import clean_text
from document_processing.chunker import chunk_text

def process_pdf(pdf_path):
    """
    Complete preprocessing pipeline.
    """

    text = extract_text(pdf_path)
    cleaned_text = clean_text(text)
    chunks = chunk_text(cleaned_text)

    return chunks