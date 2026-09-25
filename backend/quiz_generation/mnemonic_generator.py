import json

from .gemini_client import generate_content_with_retry, truncate_text_chunks
from .mnemonic_builder import build_mnemonic_prompt
from backend.embeddings.retriever import retrieve_chunks


def generate_mnemonic(
    study_set_id: str = None,
    topic: str = None,
    style: str = "acronym",
    document_ids: list[str] | str = None
) -> dict:

    print(f"===== generate_mnemonic() called (topic='{topic}', style='{style}') =====")

    if not topic or not topic.strip():
        raise ValueError("Topic must be provided for mnemonic generation.")

    valid_styles = {"acronym", "rhyme", "story", "surprise"}
    normalized_style = style.lower().strip() if style else "acronym"
    if normalized_style not in valid_styles:
        raise ValueError(
            f"Invalid mnemonic style '{style}'. Allowed styles: {', '.join(sorted(valid_styles))}"
        )

    if isinstance(document_ids, str):
        document_ids = [document_ids]

    if not study_set_id and not document_ids:
        raise ValueError(
            "Either study_set_id or document_ids must be provided for mnemonic generation."
        )

    # 1. Targeted semantic vector search using the topic query
    chunks = retrieve_chunks(
        query=topic.strip(),
        study_set_id=study_set_id,
        document_ids=document_ids,
        top_k=8
    )

    # Fallback to general material query if topic search yielded 0 chunks
    if not chunks:
        chunks = retrieve_chunks(
            query="Key study concepts and terminology",
            study_set_id=study_set_id,
            document_ids=document_ids,
            top_k=8
        )

    print("Retrieved chunks for mnemonic:", len(chunks))

    if not chunks:
        raise ValueError(
            "No study material was found for the uploaded study set / documents."
        )

    # Extract raw text string for prompt builder with context limit protection
    text = truncate_text_chunks(chunks)

    print("Text length for mnemonic:", len(text))

    prompt = build_mnemonic_prompt(text=text, topic=topic.strip(), style=normalized_style)

    print("Calling Gemini for mnemonic...")

    dedup_key = f"mnemonic:{study_set_id}:{topic.strip().lower()}:{normalized_style}" if study_set_id else None

    response = generate_content_with_retry(
        prompt=prompt,
        task_name="mnemonic_generation",
        dedup_key=dedup_key
    )

    print("Gemini responded for mnemonic.")

    response_text = response.text.strip()

    if response_text.startswith("```json"):
        response_text = response_text[7:]
    if response_text.endswith("```"):
        response_text = response_text[:-3]

    response_text = response_text.strip()

    mnemonic_data = json.loads(response_text)

    # Guarantee required fields are present
    if "title" not in mnemonic_data:
        mnemonic_data["title"] = f"Remember: {topic}"
    if "style" not in mnemonic_data:
        mnemonic_data["style"] = normalized_style
    if "breakdown" not in mnemonic_data or not isinstance(mnemonic_data["breakdown"], list):
        mnemonic_data["breakdown"] = []

    return mnemonic_data
