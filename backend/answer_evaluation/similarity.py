"""
backend.answer_evaluation.similarity

Concept-level supporting signal, keyword-stuffing detector, and universal
polarity/negation checker for the hybrid grading engine.
"""

import re
from sentence_transformers import util
from backend.answer_evaluation.sbert_model import get_embedding

_STOPWORDS = {
    "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
    "to", "of", "in", "on", "at", "by", "for", "with", "about", "as",
    "and", "or", "but", "if", "then", "than", "so", "that", "this",
    "these", "those", "it", "its", "their", "his", "her", "they",
    "he", "she", "we", "you", "i", "not", "no", "do", "does", "did",
    "will", "would", "shall", "should", "can", "could", "may", "might",
    "must", "has", "have", "had", "which", "what", "when", "where",
    "who", "how", "into", "before", "after", "during", "while",
}

_CONCEPT_MATCH_THRESHOLD = 0.42

# --- Keyword-stuffing detection thresholds ---------------------------
_STOPWORD_RATIO_THRESHOLD = 0.10
_KEYWORD_DENSITY_THRESHOLD = 0.85
_WORDS_PER_CONCEPT_THRESHOLD = 1.8
_MIN_WORDS_FOR_RATIO_SIGNALS = 10

_EXPLANATORY_CONNECTORS = [
    "because", "therefore", "thus", "hence", "since", "so that",
    "results in", "resulting", "leads to", "leading to", "causes",
    "caused by", "due to", "which means", "means that", "in order to",
    "as a result", "consequently", "this means", "for example",
    "such as", "in other words", "which is why", "that is why",
]
_CONNECTOR_MIN_WORDS = 15
_VERBATIM_OVERLAP_RATIO_THRESHOLD = 0.60
_VERBATIM_MIN_RUN_LENGTH = 4
_FRAGMENT_MIN_CLAUSE_WORDS = 4
_FRAGMENT_CHECK_MIN_WORDS = 7
_STUFFING_MIN_SIGNALS_B = 2

_DANGLING_ENDERS = {
    "if", "and", "or", "but", "so", "because", "when", "that", "which",
    "to", "the", "a", "an", "of", "in", "on", "for", "with", "while",
    "so that", "as",
}

# Universal logical negation / reversal modifiers (Domain-Agnostic)
_UNIVERSAL_NEGATION_WORDS = {
    "not", "no", "never", "none", "neither", "nor", "cannot", "cant",
    "stops", "stop", "prevent", "prevents", "avoid", "avoids", "halt",
    "halts", "opposite", "instead", "fails", "fail", "unable", "without",
    "disables", "disable", "rejects", "reject"
}


def extract_key_concepts(reference_answer: str, max_bigrams: int = 6) -> list:
    """Extracts candidate key terms/phrases from reference answer."""
    words = re.findall(r"[a-zA-Z][a-zA-Z\-]*", reference_answer.lower())
    unigrams = {w for w in words if w not in _STOPWORDS and len(w) > 2}

    bigrams = set()
    for i in range(len(words) - 1):
        w1, w2 = words[i], words[i + 1]
        if w1 not in _STOPWORDS and w2 not in _STOPWORDS and len(w1) > 2 and len(w2) > 2:
            bigrams.add(f"{w1} {w2}")

    top_bigrams = sorted(bigrams, key=len, reverse=True)[:max_bigrams]
    return top_bigrams + sorted(unigrams)


def concept_coverage_score(student_answer: str, reference_answer: str) -> dict:
    """Returns coverage score plus which concepts matched/were missed."""
    concepts = extract_key_concepts(reference_answer)
    if not concepts:
        return {"coverage_score": 1.0, "matched": [], "missed": []}

    student_lower = student_answer.lower()
    student_embedding = get_embedding(student_answer)
    matched, missed = [], []

    for concept in concepts:
        if concept in student_lower:
            matched.append(concept)
            continue

        concept_embedding = get_embedding(concept)
        sim = util.cos_sim(concept_embedding, student_embedding).item()
        if sim >= _CONCEPT_MATCH_THRESHOLD:
            matched.append(concept)
        else:
            missed.append(concept)

    coverage_score = len(matched) / len(concepts)
    return {
        "coverage_score": round(coverage_score, 3),
        "matched": matched,
        "missed": missed,
    }


def _longest_common_run(a: list, b: list) -> int:
    """Longest run of consecutive tokens shared between two token lists."""
    if not a or not b:
        return 0
    m, n = len(a), len(b)
    prev = [0] * (n + 1)
    best = 0
    for i in range(1, m + 1):
        curr = [0] * (n + 1)
        for j in range(1, n + 1):
            if a[i - 1] == b[j - 1]:
                curr[j] = prev[j - 1] + 1
                best = max(best, curr[j])
        prev = curr
    return best


def _is_truncated(student_answer: str, words: list) -> bool:
    """Checks if an answer ends abruptly mid-clause."""
    stripped = student_answer.strip()
    if not stripped or stripped[-1] in ".!?":
        return False
    return bool(words) and words[-1] in _DANGLING_ENDERS


def detect_keyword_stuffing(student_answer: str, reference_answer: str, matched_concepts: list) -> dict:
    """Flags keyword-stuffing / term-pasting answers using lexical signals."""
    words = re.findall(r"[a-zA-Z][a-zA-Z\-]*", student_answer.lower())
    reference_words = re.findall(r"[a-zA-Z][a-zA-Z\-]*", reference_answer.lower())

    empty_result = {
        "is_stuffing": False,
        "signals_triggered": [],
        "signal_count": 0,
        "group_a_triggered": False,
        "group_b_triggered": False,
        "stopword_ratio": 0.0,
        "keyword_density": 0.0,
        "words_per_concept": None,
        "verbatim_overlap_ratio": 0.0,
        "possibly_truncated": False,
    }

    if not words:
        return empty_result

    if _is_truncated(student_answer, words):
        result = dict(empty_result)
        result["possibly_truncated"] = True
        return result

    stopword_count = sum(1 for w in words if w in _STOPWORDS)
    stopword_ratio = stopword_count / len(words)

    clauses = re.split(r"[.!?]+", student_answer)
    has_complete_clause = any(
        len(re.findall(r"[a-zA-Z][a-zA-Z\-]*", c)) >= _FRAGMENT_MIN_CLAUSE_WORDS for c in clauses
    )

    well_formed = (stopword_ratio >= _STOPWORD_RATIO_THRESHOLD) and has_complete_clause
    sufficient_length = len(words) >= _MIN_WORDS_FOR_RATIO_SIGNALS

    # --- Group A ---
    signal_stopword = stopword_ratio < _STOPWORD_RATIO_THRESHOLD

    reference_terms = {w for w in reference_words if w not in _STOPWORDS and len(w) > 2}
    unique_student_words = {w for w in words if w not in _STOPWORDS and len(w) > 2}
    keyword_density = (
        len(unique_student_words & reference_terms) / len(unique_student_words)
        if unique_student_words else 0.0
    )
    signal_density = (
        not well_formed and sufficient_length and keyword_density > _KEYWORD_DENSITY_THRESHOLD
    )

    matched_words_union = set()
    for c in (matched_concepts or []):
        matched_words_union.update(c.split())
    matched_word_count = len(matched_words_union)

    if matched_word_count > 0 and sufficient_length:
        words_per_concept = len(words) / matched_word_count
        signal_padding = (not well_formed) and words_per_concept < _WORDS_PER_CONCEPT_THRESHOLD
    else:
        words_per_concept = (len(words) / matched_word_count) if matched_word_count > 0 else None
        signal_padding = False

    group_a_signals = []
    if signal_stopword:
        group_a_signals.append("stopword_ratio")
    if signal_density:
        group_a_signals.append("keyword_density")
    if signal_padding:
        group_a_signals.append("words_per_concept")

    group_a_triggered = signal_density and (signal_stopword or signal_padding)

    # --- Group B ---
    student_lower = student_answer.lower()
    has_connector = any(c in student_lower for c in _EXPLANATORY_CONNECTORS)
    signal_no_connector = (
        not well_formed and not has_connector and len(words) >= _CONNECTOR_MIN_WORDS
    )

    longest_run = _longest_common_run(words, reference_words)
    verbatim_overlap_ratio = longest_run / len(words) if words else 0.0
    signal_verbatim = (
        longest_run >= _VERBATIM_MIN_RUN_LENGTH
        and verbatim_overlap_ratio > _VERBATIM_OVERLAP_RATIO_THRESHOLD
    )

    signal_fragment = (
        not well_formed and not has_complete_clause and len(words) > _FRAGMENT_CHECK_MIN_WORDS
    )

    group_b_signals = []
    if signal_no_connector:
        group_b_signals.append("no_explanatory_connector")
    if signal_verbatim:
        group_b_signals.append("verbatim_overlap")
    if signal_fragment:
        group_b_signals.append("sentence_fragment")
    group_b_triggered = len(group_b_signals) >= _STUFFING_MIN_SIGNALS_B

    return {
        "is_stuffing": group_a_triggered or group_b_triggered,
        "signals_triggered": group_a_signals + group_b_signals,
        "signal_count": len(group_a_signals) + len(group_b_signals),
        "group_a_triggered": group_a_triggered,
        "group_b_triggered": group_b_triggered,
        "stopword_ratio": round(stopword_ratio, 3),
        "keyword_density": round(keyword_density, 3),
        "words_per_concept": round(words_per_concept, 3) if words_per_concept is not None else None,
        "verbatim_overlap_ratio": round(verbatim_overlap_ratio, 3),
    }


def detect_generic_negation_shift(student_answer: str, reference_answer: str) -> bool:
    """
    Subject-Agnostic Polarity Check:
    Detects if the student answer introduced strong negation or reversal terms
    that are absent in the reference answer.
    """
    student_words = set(re.findall(r"[a-zA-Z][a-zA-Z\-]*", student_answer.lower()))
    reference_words = set(re.findall(r"[a-zA-Z][a-zA-Z\-]*", reference_answer.lower()))

    student_negations = student_words & _UNIVERSAL_NEGATION_WORDS
    reference_negations = reference_words & _UNIVERSAL_NEGATION_WORDS

    return len(student_negations - reference_negations) > 0