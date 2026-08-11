import re

def clean_text(text):
    """
    Cleans extracted text by removing extra spaces,
    tabs, and multiple new lines.
    """

    text = re.sub(r'\s+', ' ', text)
    text = text.strip()

    return text