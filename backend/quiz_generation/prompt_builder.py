def build_quiz_prompt(text: str) -> str:
    return f"""
You are an experienced university professor creating an educational quiz.

Using ONLY the provided study material, generate exactly 5 questions.

The questions can be of the following types:

1. "mcq"
   - Multiple-choice question.
   - Must have exactly four options: A, B, C, and D.
   - Must have a correct_option containing only A, B, C, or D.
   - Must have a reference_answer explaining the correct answer.

2. "short"
   - Subjective question requiring a short written answer.
   - Must NOT have options.
   - Must NOT have correct_option.
   - Must have a reference_answer containing the expected answer.

3. "detailed"
   - Subjective question requiring a detailed explanation.
   - Must NOT have options.
   - Must NOT have correct_option.
   - Must have a reference_answer containing the key points an ideal answer should include.

4. "application"
   - Application-based subjective question requiring the student to apply the concept
     to a situation, scenario, or problem.
   - Must NOT have options.
   - Must NOT have correct_option.
   - Must have a reference_answer describing the expected reasoning or answer.

For every question:

- Give it a unique question_id such as q1, q2, q3, q4, q5.
- Include question_type.
- Include the topic being tested.
- Include the question.
- Include a plain-text reference_answer.

For MCQs:
- Include options A, B, C, and D.
- Include correct_option.
- Do NOT omit any of these fields.

For subjective questions:
- Do NOT include options.
- Do NOT include correct_option.

Return ONLY valid JSON.

Use this structure:

{{
    "questions": [
        {{
            "question_id": "q1",
            "question_type": "mcq",
            "topic": "Topic name",
            "question": "Question text",
            "options": {{
                "A": "Option A",
                "B": "Option B",
                "C": "Option C",
                "D": "Option D"
            }},
            "correct_option": "A",
            "reference_answer": "Plain-text explanation of the correct answer."
        }},
        {{
            "question_id": "q2",
            "question_type": "short",
            "topic": "Topic name",
            "question": "Explain the concept briefly.",
            "reference_answer": "Expected answer in plain text."
        }}
    ]
}}

Generate exactly 5 questions.

Mix the question types when appropriate to the provided material.

Do not invent information that is not supported by the study material.
The reference_answer should be an accurate model answer
that can later be used to evaluate a student's answer.

STUDY MATERIAL:
{text}
"""