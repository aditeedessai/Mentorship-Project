import json

from .gemini_client import generate_content_with_retry, truncate_text_chunks
from .flashcard_builder import build_flashcard_prompt
from backend.embeddings.retriever import retrieve_chunks


def generate_flashcards(
    study_set_id: str = None,
    document_ids: list[str] | str = None
) -> dict:

    print("===== generate_flashcards() called =====")

    if isinstance(document_ids, str):
        document_ids = [document_ids]

    if not study_set_id and not document_ids:
        raise ValueError(
            "Either study_set_id or document_ids must be provided for flashcard generation."
        )

    # Retrieve structured chunk objects from vector store
    chunks = retrieve_chunks(
        "Key concepts, definitions, terms, and explanations.",
        study_set_id=study_set_id,
        document_ids=document_ids,
        top_k=10
    )

    print("Retrieved chunks for flashcards:", len(chunks))

    if not chunks:
        raise ValueError(
            "No study material was found for the uploaded study set / documents."
        )

    # Extract raw text string for prompt builder with context limit protection
    text = truncate_text_chunks(chunks)

    print("Text length for flashcards:", len(text))

    prompt = build_flashcard_prompt(text)

    print("Calling Gemini for flashcards...")

    dedup_key = f"flashcards:{study_set_id}" if study_set_id else None

    response = generate_content_with_retry(
        prompt=prompt,
        task_name="flashcard_generation",
        dedup_key=dedup_key
    )

    print("Gemini responded for flashcards.")

    response_text = response.text.strip()

    if response_text.startswith("```json"):
        response_text = response_text[7:]
    if response_text.endswith("```"):
        response_text = response_text[:-3]

    response_text = response_text.strip()

    flashcard_data = json.loads(response_text)

    # Ensure format consistency
    if isinstance(flashcard_data, list):
        flashcard_data = {"flashcards": flashcard_data}

    return flashcard_data
