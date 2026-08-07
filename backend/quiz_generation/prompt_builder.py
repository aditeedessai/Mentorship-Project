def build_quiz_prompt(text: str):

    return f"""
You are an experienced university professor creating an educational quiz.

TASK

Generate exactly 5 multiple-choice questions from the supplied study material.

IMPORTANT RULES

1. Use ONLY the supplied study material.
2. Do NOT use outside knowledge.
3. Each question must test an important concept from the material.
4. Questions should be clear and unambiguous.
5. Questions should have medium difficulty.
6. Each question must have exactly 4 options.
7. Each question must have exactly ONE correct answer.
8. Do not create duplicate or very similar questions.
9. The correct answer must be supported directly by the supplied material.
10. The reference answer must explain the correct concept using only information from the supplied material.
11. Do not invent facts that are not present in the material.

REFERENCE ANSWER RULES

For each question:

- Write a concise but complete reference answer.
- The answer should explain the concept rather than simply saying "Option A", "Option B", etc.
- The reference answer must be based ONLY on the supplied text.
- The reference answer should be suitable for comparing with a student's written answer.

OUTPUT FORMAT

Return ONLY valid JSON.

Do NOT include:
- Markdown
- ```json
- Explanations outside the JSON
- Introductory text

Use exactly this structure:

{{
    "questions": [
        {{
            "id": 1,
            "question": "Question text",
            "options": [
                "Option 1",
                "Option 2",
                "Option 3",
                "Option 4"
            ],
            "correct_answer": "The complete correct option",
            "reference_answer": "A concise explanation of the correct answer based only on the supplied text."
        }}
    ]
}}

STUDY MATERIAL

{text}
"""