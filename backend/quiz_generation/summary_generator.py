import json

from .gemini_client import client
from .summary_builder import build_summary_prompt
from backend.embeddings.retriever import retrieve_chunks


def generate_summary(
    study_set_id: str = None,
    document_ids: list[str] | str = None
):

    print("===== generate_summary() called =====")

    if isinstance(document_ids, str):
        document_ids = [document_ids]

    if not study_set_id and not document_ids:
        raise ValueError(
            "Either study_set_id or document_ids must be provided for summary generation."
        )

    # Retrieve structured chunk objects from vector store
    chunks = retrieve_chunks(
        "Summarize the uploaded study material.",
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

    prompt = build_summary_prompt(text)

    print("Calling Gemini...")

    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents=prompt
    )

    print("Gemini responded.")

    response_text = response.text.strip()

    if response_text.startswith("```json"):
        response_text = response_text[7:]
    if response_text.endswith("```"):
        response_text = response_text[:-3]

    response_text = response_text.strip()

    summary_data = json.loads(response_text)

    return summary_data