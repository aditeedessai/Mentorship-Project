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
    document_ids: list[str],
    top_k: int = 3
):
    query_embedding = generate_query_embedding(query)

    all_chunks = []

    for document_id in document_ids:

        results = collection.query(
            query_embeddings=[query_embedding.tolist()],
            n_results=top_k,
            where={
                "document_id": document_id
            },
        )

        documents = results.get("documents", [[]])[0]

        print(
            f"Document {document_id}: "
            f"retrieved {len(documents)} chunks"
        )

        all_chunks.extend(documents)

    print(
        f"Total retrieved chunks: {len(all_chunks)}"
    )

    return all_chunks