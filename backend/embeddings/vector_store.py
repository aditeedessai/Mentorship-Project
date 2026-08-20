"""
backend.embeddings.vector_store

Persists document chunk embeddings into Postgres (Supabase) via the
document_chunks table, using pgvector. This replaces the previous
ChromaDB-backed implementation - there is no separate vector database
anymore, everything lives in the same Postgres instance as the rest of
the app's data.
"""

from backend.database.database import get_connection


def store_embeddings(document_id: str, chunks: list, embeddings, study_set_id: str = None):
    """
    Stores each chunk's text + embedding as one row in document_chunks.

    `embeddings` is expected to be array-like (a numpy array from
    SentenceTransformer.encode(), or a list of lists) with one row per
    chunk, in the same order as `chunks`. get_connection() registers
    pgvector's adapter, so each row can be passed straight through as
    the `embedding` parameter without any manual formatting.
    """
    connection = get_connection()

    try:
        for chunk_number, (chunk_text, embedding) in enumerate(zip(chunks, embeddings)):
            connection.execute(
                """
                INSERT INTO document_chunks (
                    document_id,
                    study_set_id,
                    chunk_number,
                    content,
                    embedding
                )
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    document_id,
                    study_set_id,
                    chunk_number,
                    chunk_text,
                    embedding,
                )
            )

        connection.commit()
        print(f"Stored {len(chunks)} chunk embeddings in Supabase (document_chunks).")

    finally:
        connection.close()