"""
backend.embeddings.retriever

Retrieves relevant document chunks for a query via pgvector cosine-distance
search against document_chunks with balanced source coverage across all
uploaded sources (documents and photo OCR outputs) within a study set.
"""

import math
from uuid import UUID

from backend.database.database import get_connection
from backend.embeddings.embedding_model import generate_query_embedding

# Context budget constants
MIN_CHUNKS_PER_SOURCE = 1
DEFAULT_CONTEXT_BUDGET = 12
MAX_CONTEXT_BUDGET = 30


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
) -> list[dict]:
    """
    Returns relevant document chunks for `query` with balanced source coverage
    across all uploaded sources (PDF/DOCX/PPTX files and photo OCR outputs)
    within the given study set.

    - Discovers all distinct sources (document_id) for the study set.
    - Allocates slots per source based on requested top_k and available context budget.
    - Ranks chunks within each source by cosine similarity (<=>).
    - Guarantees every source with usable chunks gets represented.
    - Redistributes surplus capacity to the remaining highest-similarity chunks.
    - Limits total context budget to safe model limits (MAX_CONTEXT_BUDGET = 30).
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
        # Step 1: Discover distinct document_ids for this study_set_id
        distinct_doc_ids = []
        if study_set_id:
            sql_docs = """
                SELECT DISTINCT document_id
                FROM document_chunks
                WHERE study_set_id = ?
            """
            rows = connection.execute(sql_docs, (study_set_id,)).fetchall()
            distinct_doc_ids = [
                str(r["document_id"])
                for r in rows
                if r.get("document_id") is not None
            ]

        # Fallback to document_ids if study_set_id yielded no distinct docs or wasn't provided
        if not distinct_doc_ids and document_ids:
            distinct_doc_ids = list(dict.fromkeys(document_ids))

        num_sources = len(distinct_doc_ids)

        # Fallback: if no sources found, execute un-scoped or raw document search
        if num_sources == 0:
            if study_set_id:
                sql_fallback = """
                    SELECT chunk_id, content, document_id, study_set_id, chunk_number,
                           (embedding <=> ?::vector) AS dist
                    FROM document_chunks
                    WHERE study_set_id = ?
                """
                rows = connection.execute(sql_fallback, (vector_str, study_set_id)).fetchall()
                rows_sorted = sorted(rows, key=lambda r: r["dist"])[:top_k] if rows else []
                all_chunks = [_row_to_chunk(r) for r in rows_sorted]
            print(f"Total retrieved chunks (fallback): {len(all_chunks)}")
            return all_chunks

        # Step 2: Determine retrieval context budget & per-source slot allocation
        if num_sources == 1:
            target_total = max(top_k, DEFAULT_CONTEXT_BUDGET)
            target_total = min(target_total, MAX_CONTEXT_BUDGET)
            doc_id = distinct_doc_ids[0]
            sql_single = """
                SELECT chunk_id, content, document_id, study_set_id, chunk_number,
                       (embedding <=> ?::vector) AS dist
                FROM document_chunks
                WHERE document_id = ?
                ORDER BY dist ASC
            """
            rows = connection.execute(sql_single, (vector_str, doc_id)).fetchall()
            rows_sorted = sorted(rows, key=lambda r: r["dist"])[:target_total] if rows else []
            all_chunks = [_row_to_chunk(r) for r in rows_sorted]
            print(f"Study Set {study_set_id} (1 source): retrieved {len(all_chunks)} chunks")
            return all_chunks

        # Multi-source balanced retrieval (num_sources >= 2)
        total_budget = max(top_k * num_sources, DEFAULT_CONTEXT_BUDGET, num_sources * 2)
        total_budget = min(total_budget, MAX_CONTEXT_BUDGET)

        slots_per_source = max(MIN_CHUNKS_PER_SOURCE, math.ceil(total_budget / num_sources))

        selected_rows = []
        selected_chunk_ids = set()
        remaining_candidates = []

        # Step 3: Retrieve top relevant chunks per source (ranked by cosine distance ASC)
        for doc_id in distinct_doc_ids:
            if study_set_id:
                sql_per_doc = """
                    SELECT chunk_id, content, document_id, study_set_id, chunk_number,
                           (embedding <=> ?::vector) AS dist
                    FROM document_chunks
                    WHERE study_set_id = ? AND document_id = ?
                    ORDER BY dist ASC
                """
                doc_rows = connection.execute(sql_per_doc, (vector_str, study_set_id, doc_id)).fetchall()
            else:
                sql_per_doc = """
                    SELECT chunk_id, content, document_id, study_set_id, chunk_number,
                           (embedding <=> ?::vector) AS dist
                    FROM document_chunks
                    WHERE document_id = ?
                    ORDER BY dist ASC
                """
                doc_rows = connection.execute(sql_per_doc, (vector_str, doc_id)).fetchall()

            if not doc_rows:
                continue

            # Take up to slots_per_source
            for i, r in enumerate(doc_rows):
                chk_id = str(r["chunk_id"])
                if i < slots_per_source:
                    selected_rows.append(r)
                    selected_chunk_ids.add(chk_id)
                else:
                    remaining_candidates.append(r)

        # Step 4: Surplus capacity redistribution
        # If total selected chunks < total_budget, fill remaining slots with best unused candidates
        if len(selected_rows) < total_budget and remaining_candidates:
            remaining_candidates.sort(key=lambda r: r["dist"])
            for r in remaining_candidates:
                if len(selected_rows) >= total_budget:
                    break
                chk_id = str(r["chunk_id"])
                if chk_id not in selected_chunk_ids:
                    selected_rows.append(r)
                    selected_chunk_ids.add(chk_id)

        all_chunks = [_row_to_chunk(r) for r in selected_rows]
        print(f"Study Set {study_set_id} ({num_sources} sources): retrieved {len(all_chunks)} balanced chunks")
        return all_chunks

    finally:
        connection.close()