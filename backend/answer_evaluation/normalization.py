"""
backend.answer_evaluation.normalization

Pre-scoring text normalization: contraction expansion + typo correction.

Motivation: the "typos" and "casual" answer styles cost the model accuracy
points not because the student's understanding was wrong, but because
surface noise (misspellings, "can't"/"won't"-style contractions) shifted
the embeddings/cross-encoder score just enough to fall through a
threshold. Cleaning that noise before scoring - not after - means every
downstream signal (semantic score, concept coverage, stuffing detection)
sees the same normalized text and none of them have to special-case typos.

Two libraries do the work:
  - `contractions`  : expands "can't" -> "cannot", "it's" -> "it is", etc.
  - `symspellpy`     : fast dictionary-based spelling correction (Symmetric
                        Delete algorithm) for individual word typos.

Both are optional at import time: if either package or its dictionary
file is unavailable in a given environment, normalization degrades
gracefully to a no-op for that step rather than crashing the pipeline.

Install with:
    pip install contractions symspellpy
"""

import re
import logging

logger = logging.getLogger(__name__)

# --- Contraction expansion -------------------------------------------
try:
    import contractions
    _HAS_CONTRACTIONS = True
except ImportError:  # pragma: no cover
    _HAS_CONTRACTIONS = False
    logger.warning(
        "normalization.py: 'contractions' package not installed - "
        "contraction expansion will be skipped. Run `pip install contractions`."
    )

# --- Typo correction ---------------------------------------------------
_MAX_EDIT_DISTANCE = 2
_PREFIX_LENGTH = 7
_sym_spell = None
_HAS_SYMSPELL = False

# Domain/technical terms that a general-English frequency dictionary will
# aggressively (and wrongly) "correct" into an unrelated common word (e.g.
# a misspelled "overfiting" gets corrected to "overriding" instead of
# "overfitting" because the base dictionary has never seen the real word).
# Two things happen with this list:
#   1. Already-correct terms are protected from being "corrected" away.
#   2. They're injected into SymSpell's own dictionary with a high
#      frequency count so misspelled variants resolve TO them instead of
#      to an unrelated common word.
# Extend this set per-subject if you deploy across more domains.
_PROTECTED_TERMS = {
    "dna", "rna", "atp", "co2", "ph", "mrna", "photosynthesis",
    "mitochondria", "chloroplast", "chloroplasts", "overfitting",
    "thermodynamics", "tectonics", "asthenosphere", "lithosphere",
    "covalent", "enzymes", "enzyme", "inflation", "tectonic",
}
_DOMAIN_TERM_FREQUENCY = 100_000  # comfortably above common-word counts

# --- Per-question dynamic term protection -------------------------------
# The static _PROTECTED_TERMS list above only covers terms we thought to
# hardcode ahead of time. It doesn't know "asthenosphere" matters for one
# question and "opportunity cost" for another. But every reference answer
# IS the ground-truth vocabulary for that specific question, so we can
# derive a second, per-question protection set straight from it at
# scoring time: any sufficiently long word in the reference is assumed to
# be a term worth protecting from SymSpell "correcting" it into an
# unrelated common word - the same failure mode the static list exists to
# prevent, just scoped to whatever question is currently being graded
# instead of requiring someone to extend a hardcoded set per subject.
# This runs once per question (not once per student), so the added cost
# is negligible even across a large batch.
_DYNAMIC_TERM_MIN_LENGTH = 6


def extract_dynamic_protected_terms(reference_answer: str) -> set:
    """
    Derives a per-question protected-term set from a reference answer.
    Pass the result into correct_typos()/normalize_text() as
    `protected_terms` so it's applied to BOTH the student and reference
    text for that question (protection must be symmetric, or a typo in
    the reference itself could get "corrected" while the same word in
    the student answer doesn't, or vice versa).
    """
    if not reference_answer:
        return set()
    words = re.findall(r"[a-zA-Z][a-zA-Z\-]*", reference_answer.lower())
    return {w for w in words if len(w) >= _DYNAMIC_TERM_MIN_LENGTH}

try:
    from symspellpy import SymSpell, Verbosity
    import importlib.resources as _pkg_resources

    _sym_spell = SymSpell(max_dictionary_edit_distance=_MAX_EDIT_DISTANCE, prefix_length=_PREFIX_LENGTH)

    _dictionary_loaded = False
    try:
        # symspellpy ships a bundled frequency dictionary inside its own package.
        with _pkg_resources.path("symspellpy", "frequency_dictionary_en_82_765.txt") as _dict_path:
            _dictionary_loaded = _sym_spell.load_dictionary(str(_dict_path), term_index=0, count_index=1)
    except Exception as e:  # pragma: no cover
        logger.warning("normalization.py: could not load symspellpy bundled dictionary (%s).", e)

    if _dictionary_loaded:
        for _term in _PROTECTED_TERMS:
            _sym_spell.create_dictionary_entry(_term, _DOMAIN_TERM_FREQUENCY)

    _HAS_SYMSPELL = _dictionary_loaded
    if not _HAS_SYMSPELL:
        logger.warning(
            "normalization.py: symspellpy dictionary failed to load - "
            "typo correction will be skipped."
        )
except ImportError:  # pragma: no cover
    logger.warning(
        "normalization.py: 'symspellpy' package not installed - "
        "typo correction will be skipped. Run `pip install symspellpy`."
    )


def _correct_word(word: str, protected_terms: set = None) -> str:
    """
    Corrects a single lowercase word via SymSpell, protecting technical
    terms. `protected_terms` is the optional per-question dynamic set
    from extract_dynamic_protected_terms(), checked in addition to the
    static _PROTECTED_TERMS list.
    """
    if not _HAS_SYMSPELL or not word.isalpha() or len(word) < 3:
        return word
    if word.lower() in _PROTECTED_TERMS or (protected_terms and word.lower() in protected_terms):
        return word

    suggestions = _sym_spell.lookup(word, Verbosity.CLOSEST, max_edit_distance=_MAX_EDIT_DISTANCE)
    if not suggestions:
        return word

    best = suggestions[0]
    # Only accept close, high-confidence corrections (distance <= 2 already
    # enforced by SymSpell config); skip "corrections" that are identical.
    return best.term if best.term != word.lower() else word


def correct_typos(text: str, protected_terms: set = None) -> str:
    """
    Applies SymSpell correction word-by-word while preserving original
    casing/punctuation as much as possible. No-ops if symspellpy/dictionary
    isn't available.

    `protected_terms`: optional per-question set (see
    extract_dynamic_protected_terms) merged with the static
    _PROTECTED_TERMS list for this call only.
    """
    if not _HAS_SYMSPELL or not text:
        return text

    def _replace(match: "re.Match") -> str:
        original = match.group(0)
        corrected = _correct_word(original.lower(), protected_terms)
        if corrected == original.lower():
            return original
        # Preserve capitalization of the original token.
        if original[:1].isupper():
            corrected = corrected.capitalize()
        return corrected

    return re.sub(r"[a-zA-Z]+", _replace, text)


def is_real_word(word: str, protected_terms: set = None) -> bool:
    """
    True if `word` is a real, recognized word: SymSpell finds at least one
    suggestion for it within max edit distance (an exact dictionary hit is
    itself returned as a distance-0 suggestion, so this covers both
    "already correct" and "close enough to a known word" in one check) -
    a word with ZERO suggestions at ANY edit distance is genuinely
    unrecognized, not merely "wasn't auto-corrected".

    Protected terms (the static _PROTECTED_TERMS set, plus an optional
    per-question `protected_terms` set from extract_dynamic_protected_terms)
    always count as real, matching correct_typos()'s protection behavior -
    a correct technical term shouldn't be flagged just because a general-
    English frequency dictionary has never seen it.

    Very short words (<3 letters) and non-alphabetic tokens are treated as
    real without a lookup - SymSpell isn't reliable at that length (same
    floor _correct_word already uses), and short function words ("is",
    "an", "to") would otherwise dilute the signal this exists to provide.

    Returns True (assume real) if the SymSpell dictionary failed to load,
    so anything built on this - e.g. evaluator.py's gibberish gate -
    degrades to a no-op rather than misclassifying legitimate answers when
    the optional dependency is unavailable.
    """
    if not word or not word.isalpha() or len(word) < 3:
        return True
    lower = word.lower()
    if lower in _PROTECTED_TERMS or (protected_terms and lower in protected_terms):
        return True
    if not _HAS_SYMSPELL:
        return True
    suggestions = _sym_spell.lookup(lower, Verbosity.CLOSEST, max_edit_distance=_MAX_EDIT_DISTANCE)
    return len(suggestions) > 0


def real_word_ratio(text: str, protected_terms: set = None) -> float:
    """
    Fraction of `text`'s qualifying alphabetic words (length >= 3) that
    are real per is_real_word(). Intended for a cheap, early "is this
    even real language" gate (see evaluator.py) - run BEFORE any
    semantic/embedding scoring, so gibberish never gets a chance to reach
    signals that were designed to judge subtle wrongness in well-formed
    text, not detect the absence of real text altogether.

    Returns 1.0 (assume real - i.e. "don't flag") when there are no
    qualifying words to judge (empty text, or only very short/non-
    alphabetic tokens), since a ratio computed over zero words carries no
    signal either way.
    """
    words = [w for w in re.findall(r"[a-zA-Z]+", text or "") if len(w) >= 3]
    if not words:
        return 1.0
    real_count = sum(1 for w in words if is_real_word(w, protected_terms))
    return real_count / len(words)


def expand_contractions(text: str) -> str:
    """Expands contractions ("can't" -> "cannot"). No-ops if unavailable."""
    if not _HAS_CONTRACTIONS or not text:
        return text
    try:
        return contractions.fix(text)
    except Exception as e:  # pragma: no cover
        logger.warning("normalization.py: contraction expansion failed (%s); using raw text.", e)
        return text


def normalize_text(text: str, protected_terms: set = None) -> str:
    """
    Full pre-scoring normalization pipeline: expand contractions first
    (so "can't" doesn't get typo-corrected as one broken token), then
    correct spelling.

    `protected_terms`: optional per-question dynamic protection set (see
    extract_dynamic_protected_terms). Callers should derive this ONCE
    per question from the reference answer and pass the same set into
    every normalize_text() call for that question (student AND
    reference), so protection stays symmetric.
    """
    if not text or not text.strip():
        return text
    text = expand_contractions(text)
    text = correct_typos(text, protected_terms)
    return text