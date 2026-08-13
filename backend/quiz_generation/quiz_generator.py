from .gemini_client import client
from .prompt_builder import build_quiz_prompt
from backend.database.quiz_repository import save_questions
from backend.embeddings.retriever import retrieve_chunks

import uuid
import json

def generate_quiz(document_id: str):

    print("===== generate_quiz() called =====")

    chunks = retrieve_chunks(
    "Generate an exam quiz from the uploaded study material.",
    document_id=document_id
    )

    print("Retrieved chunks:", len(chunks))

    text = "\n\n".join(chunks)

    print("Text length:", len(text))

    prompt = build_quiz_prompt(text)

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
        document_id=document_id,
        questions=quiz_data["questions"]
    )

    return quiz_data