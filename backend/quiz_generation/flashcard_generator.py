from .gemini_client import client, GEMINI_MODEL
from .gemini_retry import generate_json_with_retry
from .flashcard_builder import build_flashcard_prompt
from backend.database import study_set_repository
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

    print(f"[flashcard_generation] study_set_id={study_set_id} retrieved_chunks={len(chunks)}")

    if not chunks:
        if study_set_id:
            docs = study_set_repository.get_documents_by_study_set(study_set_id)
            if not docs:
                raise ValueError(
                    "No study material was found for this study set. Please upload documents first."
                )
            else:
                raise ValueError(
                    "Uploaded study material exists but processing is incomplete or no text could be extracted."
                )
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

    flashcard_data = generate_json_with_retry(
        client,
        GEMINI_MODEL,
        prompt,
        label="generate_flashcards",
    )

    print("Gemini responded for flashcards.")

    # Ensure format consistency
    if isinstance(flashcard_data, list):
        flashcard_data = {"flashcards": flashcard_data}

    return flashcard_data
