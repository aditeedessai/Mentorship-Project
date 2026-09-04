"""
backend.embeddings.embedding_model

Lazy-loaded, cached SentenceTransformer ('all-MiniLM-L6-v2') used to embed
document chunks for retrieval. Previously loaded eagerly at import time,
which meant importing this module - pulled in via document_service.py ->
api/routes/documents.py -> api/main.py - paid the full model-load cost
during Python's import of api/main.py, before the FastAPI app object even
existed and before uvicorn started accepting connections at all (earlier
and more blocking than the answer-evaluation models' own startup
preloading - see sbert_model.py). It now loads once, on first actual use
(the first document upload), and is cached for the life of the process -
the same lazy-singleton pattern already used throughout sbert_model.py.
"""

from backend.answer_evaluation.sbert_model import _model_construction_lock

_model = None


def _get_model():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        # Shares sbert_model.py's construction lock: that module's
        # docstring documents an empirically-confirmed transformers/
        # accelerate thread-safety bug where two SentenceTransformer/
        # CrossEncoder from_pretrained() calls racing concurrently can
        # raise "Cannot copy out of meta tensor; no data!". This model
        # now loads lazily (possibly while main.py's background
        # preload_models() call is still loading the other four), so it
        # needs the same lock to stay safe.
        with _model_construction_lock:
            _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


def generate_embeddings(chunks):
    """
    Generate embeddings for a list of text chunks using optimized batching.
    """
    if not chunks:
        return []

    # batch_size=32 or 64 accelerates vector inference on multi-core CPUs
    return _get_model().encode(
        chunks,
        batch_size=32,
        show_progress_bar=False,
        normalize_embeddings=True
    )


def generate_query_embedding(query):
    """
    Generate an embedding for a search query.
    """
    return _get_model().encode(query, normalize_embeddings=True)
