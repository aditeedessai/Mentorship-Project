import json

from .gemini_client import client
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

    # Extract raw text string for prompt builder
    text_pieces = []
    for chunk in chunks:
        if isinstance(chunk, dict):
            text_pieces.append(chunk.get("text", ""))
        else:
            text_pieces.append(str(chunk))
    text = "\n\n".join(text_pieces)

    print("Text length for flashcards:", len(text))

    prompt = build_flashcard_prompt(text)

    print("Calling Gemini for flashcards...")

    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents=prompt
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
