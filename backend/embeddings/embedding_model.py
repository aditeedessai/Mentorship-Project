from sentence_transformers import SentenceTransformer

# Load SBERT model once
model = SentenceTransformer("all-MiniLM-L6-v2")


def generate_embeddings(chunks):
    """
    Generate embeddings for a list of text chunks.
    """
    return model.encode(chunks)


def generate_query_embedding(query):
    """
    Generate an embedding for a search query.
    """
    return model.encode(query)