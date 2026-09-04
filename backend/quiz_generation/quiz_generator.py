import uuid
import json
import traceback

from .gemini_client import client
from .prompt_builder import build_quiz_prompt
from backend.database.quiz_repository import save_questions
from backend.embeddings.retriever import retrieve_chunks


def find_best_matching_chunks(question_text: str, reference_answer: str, chunks: list[dict]) -> list[dict]:
    """
    Deterministic source mapping engine: computes token overlap between
    a question + reference answer and retrieved chunks to link the question
    to its actual source chunk(s) and document(s).
    """
    combined_query = f"{question_text} {reference_answer}".lower()
    query_words = set(w for w in combined_query.split() if len(w) > 3)

    if not query_words or not chunks:
        return [chunks[0]] if chunks else []

    scored = []
    for chunk in chunks:
        chunk_text = chunk["text"] if isinstance(chunk, dict) else str(chunk)
        chunk_words = set(chunk_text.lower().split())
        overlap = len(query_words.intersection(chunk_words))
        scored.append((overlap, chunk))

    scored.sort(key=lambda x: x[0], reverse=True)

    if scored and scored[0][0] > 0:
        top_score = scored[0][0]
        # Return chunks within 70% of the highest overlap score
        return [chunk for score, chunk in scored if score >= max(1, top_score * 0.70)]
    elif chunks:
        return [chunks[0]]

    return []


def generate_quiz(
    study_set_id: str = None,
    question_type: str = "mcq",
    document_ids: list[str] | str = None,
    attempt_id: str = None
):

    print("===== generate_quiz() called =====")
    print("Selected question type:", question_type)

    if isinstance(document_ids, str):
        document_ids = [document_ids]

    if not study_set_id and not document_ids:
        raise ValueError(
            "Either study_set_id or document_ids must be provided for quiz generation."
        )

    # Check that the selected type is valid
    valid_types = ["mcq", "application", "long", "short"]

    if question_type not in valid_types:
        raise ValueError(
            f"Invalid question type: {question_type}. "
            f"Expected one of: {valid_types}"
        )

    # Retrieve structured chunk objects from vector store
    chunks = retrieve_chunks(
        "Generate an exam quiz from the uploaded study material.",
        study_set_id=study_set_id,
        document_ids=document_ids
    )

    print("Retrieved chunks:", len(chunks))

    if not chunks:
        raise ValueError(
            "No study material was found for the uploaded study set / documents."
        )

    # Extract raw text string for prompt builder
    text_pieces = []
    for chunk in chunks:
        if isinstance(chunk, dict):
            text_pieces.append(chunk.get("text", ""))
        else:
            text_pieces.append(str(chunk))
    text = "\n\n".join(text_pieces)

    print("Text length:", len(text))

    prompt = build_quiz_prompt(
        text,
        question_type=question_type
    )

    print("Calling Gemini...")

    try:
        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=prompt
        )
    except Exception:
        print("===== Gemini API call failed (generate_quiz) =====")
        traceback.print_exc()
        raise

    print("Gemini responded.")

    response_text = response.text.strip()

    if response_text.startswith("```json"):
        response_text = response_text[7:]
    if response_text.endswith("```"):
        response_text = response_text[:-3]

    response_text = response_text.strip()

    try:
        quiz_data = json.loads(response_text)
    except json.JSONDecodeError:
        print("===== Failed to parse Gemini response as JSON (generate_quiz) =====")
        print(f"Raw response length: {len(response_text)}")
        print("Raw response text:")
        print(response_text)
        traceback.print_exc()
        raise

    # Process and link source metadata for each generated question
    for question in quiz_data["questions"]:
        question["question_id"] = str(uuid.uuid4())
        if study_set_id:
            question["study_set_id"] = study_set_id

        # Determine marks based on question type
        question["marks"] = 2.0 if question.get("question_type") == "mcq" else 10.0

        # Deterministically match question text + reference answer to source chunk(s)
        matched_chunks = find_best_matching_chunks(
            question.get("question", ""),
            question.get("reference_answer", ""),
            chunks
        )

        resolved_chunk_ids = []
        resolved_doc_ids = []
        sources_tuples = []

        for chk in matched_chunks:
            c_id = chk.get("id") if isinstance(chk, dict) else None
            d_id = chk.get("document_id") if isinstance(chk, dict) else None

            if c_id and c_id not in resolved_chunk_ids:
                resolved_chunk_ids.append(c_id)
            if d_id and d_id not in resolved_doc_ids:
                resolved_doc_ids.append(d_id)
            if d_id:
                sources_tuples.append((d_id, c_id))

        question["source_chunk_ids"] = resolved_chunk_ids
        question["source_document_ids"] = resolved_doc_ids
        question["sources_tuples"] = sources_tuples

        # Assign document_id to primary source document (NO defaulting to document_ids[0]!)
        if resolved_doc_ids:
            question["document_id"] = resolved_doc_ids[0]

    # Save to SQLite (populating questions table and question_sources canonical table)
    # attempt_id tags this freshly-generated batch as belonging to ONE
    # specific attempt (see save_questions()'s own docstring) - this is
    # what stops a revision attempt from being served the accumulated
    # pool of every question ever generated for this study set + type.
    save_questions(
        study_set_id=study_set_id,
        questions=quiz_data["questions"],
        attempt_id=attempt_id
    )

    return quiz_data