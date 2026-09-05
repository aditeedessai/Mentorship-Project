def build_quiz_prompt(
    text: str,
    question_type: str,
    student_grade_or_year: str | None = None,
    student_field: str | None = None,
    student_curriculum: str | None = None,
) -> str:

    if question_type == "mcq":
        type_instruction = """
Generate exactly 5 Multiple Choice Questions (MCQs).

For every question:
- question_type must be "mcq".
- Include exactly four options: A, B, C, and D.
- Include correct_option containing only A, B, C, or D.
- Include a reference_answer explaining the correct answer.
"""

    elif question_type == "application":
        type_instruction = """
Generate exactly 5 application-based questions.

Each question must require the student to apply a concept
from the study material to a situation, scenario, or problem.

For every question:
- question_type must be "application".
- Do NOT include options.
- Do NOT include correct_option.
- Include a reference_answer describing the expected reasoning or answer.
"""

    elif question_type == "long":
        type_instruction = """
Generate exactly 5 long-answer questions.

Each question must require a detailed explanation of the concept.

For every question:
- question_type must be "long".
- Do NOT include options.
- Do NOT include correct_option.
- Include a reference_answer containing the key points
  that an ideal long answer should include.
"""

    elif question_type == "short":
        type_instruction = """
Generate exactly 5 short-answer questions.

Each question must require a concise written answer.

For every question:
- question_type must be "short".
- Do NOT include options.
- Do NOT include correct_option.
- Include a reference_answer containing the expected answer.
"""

    else:
        raise ValueError(
            "Invalid question type. "
            "Expected: mcq, application, long, or short."
        )

    # Build the optional student-level adaptation block
    student_level_block = ""
    if student_grade_or_year or student_field or student_curriculum:
        student_level_block = f"""
The student's educational profile is:
- Grade / Year of Study: {student_grade_or_year or "Not specified"}
- Field of Study: {student_field or "Not specified"}
- Curriculum: {student_curriculum or "Not specified"}

Adapt the difficulty, depth of reasoning, complexity of wording, terminology,
expected prior knowledge, and level of conceptual or application-based thinking
to be appropriate for this student's academic level.

IMPORTANT: The student's educational information is ONLY a difficulty and level
calibration signal. It is NOT a source of quiz content. Every question, option,
correct answer, and reference answer must be supported exclusively by the study
material provided below. Do NOT introduce any information merely because it is
normally taught at that grade/year, belongs to the student's field, appears in
the student's curriculum, or is common knowledge for that academic level.
"""

    return f"""
You are an experienced university professor creating an educational quiz.

The student has selected the question type: "{question_type}".
{student_level_block}
{type_instruction}

For every question:
- Give it a unique question_id such as q1, q2, q3, q4, q5.
- Include question_type.
- Include the topic being tested.
- Include the question.
- Include a plain-text reference_answer.

Return ONLY valid JSON.

Use this structure:

{{
    "questions": [
        {{
            "question_id": "q1",
            "question_type": "{question_type}",
            "topic": "Topic name",
            "question": "Question text",
            "reference_answer": "Plain-text model answer."
        }}
    ]
}}

For MCQ questions, use this structure:

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
        }}
    ]
}}

Generate exactly 5 questions.

Do not mix question types.
Generate ONLY the selected question type.

Do not invent information that is not supported by the study material.

The reference_answer should be an accurate model answer
that can later be used to evaluate a student's answer.

STUDY MATERIAL:
{text}
"""