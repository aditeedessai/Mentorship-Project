import json

from .gemini_client import client
from .prompt_builder import build_quiz_prompt


def generate_quiz(text: str):
    prompt = build_quiz_prompt(text)

    response = client.models.generate_content(
        model="gemini-flash-latest",
        contents=prompt
    )

    response_text = response.text.strip()

    # Remove Markdown code fences if Gemini adds them
    if response_text.startswith("```json"):
        response_text = response_text[7:]

    if response_text.startswith("```"):
        response_text = response_text[3:]

    if response_text.endswith("```"):
        response_text = response_text[:-3]

    response_text = response_text.strip()

    try:
        quiz = json.loads(response_text)
    except json.JSONDecodeError as e:
        raise ValueError(
            f"Gemini returned invalid JSON: {response_text}"
        ) from e

    return quiz