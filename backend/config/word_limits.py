"""
Centralized Word Limit Configuration for Quiz Question Types.

Base limits:
- short: 50 words
- long: 150 words
- application: 150 words
- mcq: None (no word limit)

Tolerance:
- 10 words added to base limits

Maximum allowed limits:
- short: 60 words
- long: 160 words
- application: 160 words
- mcq: None (unlimited)
"""

WORD_LIMIT_TOLERANCE: int = 10

BASE_WORD_LIMITS: dict[str, int | None] = {
    "short": 50,
    "long": 150,
    "application": 150,
    "mcq": None,
}

QUESTION_TYPE_WORD_LIMITS: dict[str, int | None] = {
    q_type: (limit + WORD_LIMIT_TOLERANCE if limit is not None else None)
    for q_type, limit in BASE_WORD_LIMITS.items()
}


def count_words(text: str | None) -> int:
    """
    Counts words in text using whitespace separation.
    Handles leading/trailing whitespace, multiple spaces, tabs, and newlines.
    Does not count empty strings as words.
    """
    if not text:
        return 0
    return len(text.strip().split())


def validate_answer_word_limit(
    question_type: str,
    student_answer: str | None
) -> tuple[bool, int, int | None]:
    """
    Validates student_answer against hardcoded word limits for question_type.

    Returns:
        (is_valid: bool, word_count: int, max_limit: int | None)
    """
    q_type_str = str(question_type).lower().strip()
    max_limit = QUESTION_TYPE_WORD_LIMITS.get(q_type_str)

    word_count = count_words(student_answer)

    if max_limit is None:
        return True, word_count, None

    is_valid = word_count <= max_limit
    return is_valid, word_count, max_limit
