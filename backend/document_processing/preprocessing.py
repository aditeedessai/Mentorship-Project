from backend.document_processing.extracter import extract_text
from backend.document_processing.cleaner import clean_text
from backend.document_processing.chunker import chunk_text

def process_pdf(pdf_path):
    text = extract_text(pdf_path)
    cleaned_text = clean_text(text)
    return chunk_text(cleaned_text)
