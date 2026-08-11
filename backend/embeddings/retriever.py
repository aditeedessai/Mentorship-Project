import os
import chromadb
from backend.embeddings.embedding_model import generate_query_embedding

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROMA_DIR = os.path.join(BASE_DIR, "chroma_db")

client = chromadb.PersistentClient(path=CHROMA_DIR)
collection = client.get_or_create_collection(name="course_material")

def retrieve_chunks(query: str, document_id: str, top_k: int = 5):
    query_embedding = generate_query_embedding(query)
    results = collection.query(
        query_embeddings=[query_embedding.tolist()],
        n_results=top_k,
        where={"document_id": document_id},
    )
    return results["documents"][0] if results["documents"] else []
