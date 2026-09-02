def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 100):
    """
    Splits text into chunks with slight overlap to preserve sentence context.
    """
    if not text:
        return []

    chunks = []
    start = 0
    text_len = len(text)

    while start < text_len:
        end = start + chunk_size
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        start += chunk_size - overlap

    return chunks