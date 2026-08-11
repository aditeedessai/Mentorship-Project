def chunk_text(text, chunk_size=500):
    """
    Splits text into chunks of fixed size.
    """

    chunks = []

    for i in range(0, len(text), chunk_size):
        chunks.append(text[i:i + chunk_size])

    return chunks