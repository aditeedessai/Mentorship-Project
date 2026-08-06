import fitz  # PyMuPDF

def extract_text(pdf_path):
    """
    Extracts all text from a PDF file.
    """

    text = ""

    try:
        pdf = fitz.open(pdf_path)

        for page in pdf:
            text += page.get_text()

        pdf.close()

    except Exception as e:
        print(f"Error reading PDF: {e}")

    return text