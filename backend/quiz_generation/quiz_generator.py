from .gemini_client import client
from .prompt_builder import build_quiz_prompt
from backend.database.quiz_repository import save_questions
from backend.embeddings.retriever import retrieve_chunks

import uuid
import json


def generate_quiz(
    document_ids: list[str] | str,
    question_type: str
):

    print("===== generate_quiz() called =====")
    print("Selected question type:", question_type)

    if isinstance(document_ids, str):
        document_ids = [document_ids]

    print("Documents:", len(document_ids))

    # Check that the selected type is valid
    valid_types = ["mcq", "application", "long", "short"]

    if question_type not in valid_types:
        raise ValueError(
            f"Invalid question type: {question_type}. "
            f"Expected one of: {valid_types}"
        )

    if not document_ids:
        raise ValueError(
            "No document IDs were provided."
        )

    chunks = retrieve_chunks(
        "Generate an exam quiz from the uploaded study material.",
        document_ids=document_ids
    )

    print("Retrieved chunks:", len(chunks))

    if not chunks:
        raise ValueError(
            "No study material was found for the uploaded documents."
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

    save_questions(
        document_id=document_ids[0],
        questions=quiz_data["questions"]
    )

    return quiz_data