"""
backend.answer_evaluation.sbert_model

Loads and exposes the models used for answer evaluation:
  - bi_encoder   : SentenceTransformer('all-MiniLM-L6-v2')
  - cross_encoder: CrossEncoder('cross-encoder/stsb-roberta-base')

Both models are loaded once at import time (module-level) and reused
for every evaluation call for the lifetime of the FastAPI process.
"""

from sentence_transformers import SentenceTransformer, CrossEncoder

bi_encoder = SentenceTransformer("all-MiniLM-L6-v2")
cross_encoder = CrossEncoder("cross-encoder/stsb-roberta-base")


def get_embedding(text: str):
    """
    Returns the bi-encoder embedding for a piece of text.
    Used by similarity.py for concept-level matching only.
    """
    return bi_encoder.encode(text, convert_to_tensor=True)


def semantic_correctness_score(student_answer: str, reference_answer: str) -> float:
    """
    Cross-encoder semantic correctness score (0-1) — judges whether the
    student's answer means the same thing as the reference answer,
    regardless of wording/structure.
    """
    score = cross_encoder.predict([(student_answer, reference_answer)])[0]
    return float(max(0.0, min(1.0, float(score))))