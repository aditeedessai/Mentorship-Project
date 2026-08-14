import os
import chromadb
from backend.embeddings.embedding_model import generate_query_embedding

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROMA_DIR = os.path.join(BASE_DIR, "chroma_db")

client = chromadb.PersistentClient(path=CHROMA_DIR)

collection = client.get_or_create_collection(
    name="course_material"
)


def retrieve_chunks(
    query: str,
    document_ids: list[str] | str,
    top_k: int = 5
):
    if isinstance(document_ids, str):
        document_ids = [document_ids]

    query_embedding = generate_query_embedding(query)

    all_chunks = []

    for doc_id in document_ids:
        results = collection.query(
            query_embeddings=[query_embedding.tolist()],
            n_results=top_k,
            where={
                "document_id": doc_id
            },
        )

        documents = results.get("documents", [[]])[0]

        print(
            f"Document {doc_id}: "
            f"retrieved {len(documents)} chunks"
        )

        all_chunks.extend(documents)

    print(
        f"Total retrieved chunks: {len(all_chunks)}"
    )

    return all_chunks