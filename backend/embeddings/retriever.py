"""
backend.embeddings.retriever

Retrieves the most relevant document chunks for a query via pgvector
cosine-distance search against document_chunks, replacing the previous
ChromaDB-backed implementation.
"""

from uuid import UUID

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
    study_set_id: str | UUID = None,
    document_ids: list[str | UUID] | str | UUID = None,
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
    # Normalize study_set_id and document_ids to string UUIDs for psycopg2 compatibility
    if study_set_id is not None:
        study_set_id = str(study_set_id)

    if document_ids is not None:
        if isinstance(document_ids, (str, UUID)):
            document_ids = [str(document_ids)]
        elif isinstance(document_ids, list):
            document_ids = [str(d) for d in document_ids if d is not None]

    query_embedding = generate_query_embedding(query)
    emb_list = query_embedding.tolist() if hasattr(query_embedding, "tolist") else list(query_embedding)
    vector_str = "[" + ",".join(str(float(x)) for x in emb_list) + "]"

    connection = get_connection()
    all_chunks = []

    try:
        if study_set_id:
            sql_query = """
                SELECT chunk_id, content, document_id, study_set_id, chunk_number,
                       (embedding <=> ?::vector) AS dist
                FROM document_chunks
                WHERE study_set_id = ?
            """
            rows = connection.execute(sql_query, (vector_str, study_set_id)).fetchall()
            rows_sorted = sorted(rows, key=lambda r: r["dist"])[:top_k] if rows else []

            all_chunks = [_row_to_chunk(row) for row in rows_sorted]
            print(f"Study Set {study_set_id}: retrieved {len(all_chunks)} chunks")

        # Fallback to document_ids if study_set_id yielded no chunks or wasn't provided
        if not all_chunks and document_ids:
            for doc_id in document_ids:
                sql_doc_query = """
                    SELECT chunk_id, content, document_id, study_set_id, chunk_number,
                           (embedding <=> ?::vector) AS dist
                    FROM document_chunks
                    WHERE document_id = ?
                """
                rows = connection.execute(sql_doc_query, (vector_str, doc_id)).fetchall()
                rows_sorted = sorted(rows, key=lambda r: r["dist"])[:top_k] if rows else []

                all_chunks.extend(_row_to_chunk(row) for row in rows_sorted)

        print(f"Total retrieved chunks: {len(all_chunks)}")
        return all_chunks

    finally:
        connection.close()