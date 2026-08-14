from .gemini_client import client
from .prompt_builder import build_quiz_prompt
from backend.database.quiz_repository import save_questions
from backend.embeddings.retriever import retrieve_chunks

import uuid
import json


def generate_quiz(
    study_set_id: str = None,
    question_type: str = "mcq",
    document_ids: list[str] | str = None
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

    text = "\n\n".join(chunks)

    print("Text length:", len(text))

    # Pass the selected question type to the prompt builder
    prompt = build_quiz_prompt(
        text,
        question_type=question_type
    )

    print("Calling Gemini...")

    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents=prompt
    )

    print("Gemini responded.")

    response_text = response.text.strip()

    print(response_text)

    if response_text.startswith("```json"):
        response_text = response_text[7:]

    if response_text.endswith("```"):
        response_text = response_text[:-3]

    response_text = response_text.strip()

    quiz_data = json.loads(response_text)

    # Generate unique IDs for every question
    for question in quiz_data["questions"]:
        question["question_id"] = str(uuid.uuid4())
        if study_set_id:
            question["study_set_id"] = study_set_id

    doc_id = document_ids[0] if (document_ids and len(document_ids) == 1) else None

    save_questions(
        study_set_id=study_set_id,
        questions=quiz_data["questions"],
        document_id=doc_id
    )

    return quiz_data