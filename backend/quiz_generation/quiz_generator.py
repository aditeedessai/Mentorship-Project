from .gemini_client import client
from .prompt_builder import build_quiz_prompt
from backend.database.quiz_repository import save_questions
from backend.embeddings.retriever import retrieve_chunks

import uuid
import json


def generate_quiz(
    document_ids: list[str],
    question_type: str
):

    print("===== generate_quiz() called =====")
    print("Selected question type:", question_type)
    print("Documents:", len(document_ids))

    # ---------------------------------------------------------
    # Validate question type
    # ---------------------------------------------------------

    valid_types = [
        "mcq",
        "application",
        "long",
        "short"
    ]

    if question_type not in valid_types:
        raise ValueError(
            f"Invalid question type: {question_type}. "
            f"Expected one of: {valid_types}"
        )

    # ---------------------------------------------------------
    # Validate document IDs
    # ---------------------------------------------------------

    if not document_ids:
        raise ValueError(
            "No document IDs were provided."
        )

    # ---------------------------------------------------------
    # Retrieve chunks from all uploaded documents
    # ---------------------------------------------------------

    chunks = retrieve_chunks(
        "Generate an exam quiz from the uploaded study material.",
        document_ids=document_ids
    )

    print(
        "Retrieved chunks:",
        len(chunks)
    )

    if not chunks:
        raise ValueError(
            "No study material was found for the uploaded documents."
        )

    # ---------------------------------------------------------
    # Combine retrieved chunks
    # ---------------------------------------------------------

    text = "\n\n".join(chunks)

    print(
        "Text length:",
        len(text)
    )

    # ---------------------------------------------------------
    # Build Gemini prompt
    # ---------------------------------------------------------

    prompt = build_quiz_prompt(
        text,
        question_type=question_type
    )

    print(
        "Calling Gemini..."
    )

    # ---------------------------------------------------------
    # Generate quiz
    # ---------------------------------------------------------

    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents=prompt
    )

    print(
        "Gemini responded."
    )

    response_text = response.text.strip()

    print(
        response_text
    )

    # ---------------------------------------------------------
    # Clean JSON response
    # ---------------------------------------------------------

    if response_text.startswith("```json"):
        response_text = response_text[7:]

    if response_text.endswith("```"):
        response_text = response_text[:-3]

    response_text = response_text.strip()

    # ---------------------------------------------------------
    # Parse JSON
    # ---------------------------------------------------------

    quiz_data = json.loads(
        response_text
    )

    # ---------------------------------------------------------
    # Generate unique question IDs
    # ---------------------------------------------------------

    for question in quiz_data["questions"]:
        question["question_id"] = str(
            uuid.uuid4()
        )

    # ---------------------------------------------------------
    # Save questions
    #
    # Current database supports one document_id per question.
    # Save the combined quiz once against the first document.
    # ---------------------------------------------------------

    save_questions(
        document_id=document_ids[0],
        questions=quiz_data["questions"]
    )

    return quiz_data