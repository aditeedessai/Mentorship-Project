from .gemini_client import client, GEMINI_MODEL
from .gemini_retry import generate_json_with_retry
from .summary_builder import build_summary_prompt
from backend.database.student_profile_repository import get_student_profile
from backend.database import study_set_repository
from backend.embeddings.retriever import retrieve_chunks


def generate_summary(
    study_set_id: str = None,
    document_ids: list[str] | str = None,
    user_id: str = None
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

    print(f"[summary_generation] user_id={user_id} study_set_id={study_set_id} retrieved_chunks={len(chunks)}")

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

    print("Text length:", len(text))

    # Fetch student profile for level adaptation (if user_id available)
    student_grade_or_year = None
    student_field = None
    student_curriculum = None
    if user_id:
        profile = get_student_profile(user_id)
        if profile:
            student_grade_or_year = profile.get("grade_or_year")
            student_field = profile.get("field_stream")
            student_curriculum = profile.get("curriculum_type")

    prompt = build_summary_prompt(
        text,
        student_grade_or_year=student_grade_or_year,
        student_field=student_field,
        student_curriculum=student_curriculum,
    )

    print("Calling Gemini...")

    summary_data = generate_json_with_retry(
        client,
        GEMINI_MODEL,
        prompt,
        label="generate_summary",
    )

    print("Gemini responded.")

    return summary_data