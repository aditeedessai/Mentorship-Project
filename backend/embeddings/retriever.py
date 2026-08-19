"""
backend.embeddings.retriever

Retrieves the most relevant document chunks for a query via pgvector
cosine-distance search against document_chunks, replacing the previous
ChromaDB-backed implementation.
"""

from backend.database.database import get_connection
from backend.embeddings.embedding_model import generate_query_embedding


def _row_to_chunk(row: dict) -> dict:
    return {
        "id": str(row["chunk_id"]),
        "text": row["content"],
        "document_id": str(row["document_id"]) if row.get("document_id") else None,
        "study_set_id": str(row["study_set_id"]) if row.get("study_set_id") else None,
        "chunk_number": row.get("chunk_number"),
    }


def retrieve_chunks(
    query: str,
    study_set_id: str = None,
    document_ids: list[str] | str = None,
    top_k: int = 5
):
    """
    Returns the top_k most semantically similar chunks to `query`.

    Tries study_set_id first (if given); falls back to per-document_id
    lookups if that yields nothing or wasn't provided at all - same
    fallback behavior as the previous ChromaDB version, just against
    document_chunks with a pgvector `<=>` (cosine distance) ORDER BY
    instead of a Chroma collection.query() call.
    """
    query_embedding = generate_query_embedding(query)
    connection = get_connection()
    all_chunks = []

    try:
        if study_set_id:
            rows = connection.execute(
                """
                SELECT chunk_id, content, document_id, study_set_id, chunk_number
                FROM document_chunks
                WHERE study_set_id = ?
                ORDER BY embedding <=> ?
                LIMIT ?
                """,
                (study_set_id, query_embedding, top_k)
            ).fetchall()

            all_chunks = [_row_to_chunk(row) for row in rows]

            print(f"Study Set {study_set_id}: retrieved {len(all_chunks)} chunks")

        # Fallback to document_ids if study_set_id yielded no chunks or wasn't provided
        if not all_chunks and document_ids:
            if isinstance(document_ids, str):
                document_ids = [document_ids]

            for doc_id in document_ids:
                rows = connection.execute(
                    """
                    SELECT chunk_id, content, document_id, study_set_id, chunk_number
                    FROM document_chunks
                    WHERE document_id = ?
                    ORDER BY embedding <=> ?
                    LIMIT ?
                    """,
                    (doc_id, query_embedding, top_k)
                ).fetchall()

                print(f"Document {doc_id}: retrieved {len(rows)} chunks")

                all_chunks.extend(_row_to_chunk(row) for row in rows)

        print(f"Total retrieved chunks: {len(all_chunks)}")

        return all_chunks

    finally:
        connection.close()