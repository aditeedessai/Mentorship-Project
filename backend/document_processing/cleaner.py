import re

def clean_text(text):
    """
    Cleans extracted text by removing extra spaces,
    tabs, and multiple new lines.
    """
    if not text:
        return ""
    text = re.sub(r'\s+', ' ', text)
    return text.strip()