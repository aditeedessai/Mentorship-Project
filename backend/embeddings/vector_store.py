"""
backend.embeddings.vector_store

Persists document chunk embeddings into Postgres (Supabase) via the
document_chunks table, using pgvector.
"""

from backend.database.database import get_connection


def store_embeddings(document_id: str, chunks: list, embeddings, study_set_id: str = None):
    """
    Stores all chunk texts + embeddings in a single batch database transaction.
    """
    if not chunks:
        return

    connection = get_connection()

    # Prepare records with embeddings formatted as lists or numpy arrays
    records = [
        (
            document_id,
            study_set_id,
            chunk_number,
            chunk_text,
            embedding if isinstance(embedding, list) else embedding.tolist(),
        )
        for chunk_number, (chunk_text, embedding) in enumerate(zip(chunks, embeddings))
    ]

    # Use %s placeholders for PostgreSQL / Supabase
    insert_query = """
    INSERT INTO document_chunks (
        document_id,
        study_set_id,
        chunk_number,
        content,
        embedding
    )
    VALUES (%s, %s, %s, %s, %s)
    """

    try:
        cursor = connection.cursor() if hasattr(connection, "cursor") else connection
        cursor.executemany(insert_query, records)
        connection.commit()
        print(f"Stored {len(chunks)} chunk embeddings in Supabase in 1 batch.")
    finally:
        connection.close()