from sentence_transformers import SentenceTransformer

# Load SBERT model once
model = SentenceTransformer("all-MiniLM-L6-v2")


def generate_embeddings(chunks):
    """
    Generate embeddings for a list of text chunks using optimized batching.
    """
    if not chunks:
        return []

    # batch_size=32 or 64 accelerates vector inference on multi-core CPUs
    return model.encode(
        chunks,
        batch_size=32,
        show_progress_bar=False,
        normalize_embeddings=True
    )


def generate_query_embedding(query):
    """
    Generate an embedding for a search query.
    """
    return model.encode(query, normalize_embeddings=True)