"""
backend.answer_evaluation.grading

Single source of truth for turning a raw score into a human-facing
REMARK - plain qualitative words (Excellent / Very Good / Good /
Average / Needs Improvement / Weak). No letter grades (A1, B2, etc.)
are exposed anywhere in this module's public output - only the remark
and the percentage it was derived from.

Why this file exists
---------------------
Before this module, topic_scorer.py had one hardcoded number
(WEAK_TOPIC_THRESHOLD = 70.0) deciding "weak" vs "strong" for every
topic, and performance_scorer.py had no grading concept at all - just a
bare percentage. Two problems with that:

  1. A single 70% cliff-edge is not how any real grading system works -
     a 69% and a 40% both get lumped into "weak" even though they are
     very different outcomes, and a 71% and a 99% both get lumped into
     "strong" the same way.
  2. It only speaks in percentages. Different callers score things on
     different scales - a raw cross-encoder/NLI score is 0-1, a marks
     total might be out of 10, and a UI wants a 0-100 percentage - and
     nothing converted between them consistently.

This module fixes both: it uses the CBSE (Central Board of Secondary
Education, India) Classes IX & X grading scheme's percentage cut-points
as the band boundaries (91/81/71/51/33, the same real cut-offs schools
use), but reports them purely as plain-English remarks rather than the
CBSE letter grades - so the output reads as "Good" / "Needs
Improvement" rather than "B1" / "D".

This file has ZERO dependencies on anything else in the package
(evaluator.py, sbert_model.py, normalization.py, similarity.py,
llm_judge.py) and ZERO third-party dependencies - it is pure Python,
safe to import anywhere without pulling in models or network calls.

------------------------------------------------------------------------
REMARK BANDS (boundaries sourced from the CBSE grading scheme;
labels are this module's own plain-English remarks)
------------------------------------------------------------------------
  Percentage   Remark
  91-100       Excellent
  81-90        Very Good
  71-80        Good
  51-70        Average
  33-50        Needs Improvement
  0-32         Weak

These 6 remarks are also rolled up into 3 coarse STATUS buckets, used
wherever code needs a simple weak/average/strong split (e.g. topic
weak/strong lists) instead of the full 6-way remark:

    strong  : Excellent, Very Good, Good      (71-100)
    average : Average                         (51-70)
    weak    : Needs Improvement, Weak         (0-50)

------------------------------------------------------------------------
SCALE HANDLING (0-1 vs 0-10 vs 0-100)
------------------------------------------------------------------------
Different parts of this project produce scores on different scales:
  - evaluator.py's final_score / semantic_score / concept_score: 0-1
  - marks_awarded out of a max_marks that's commonly 10 (but can be
    anything the caller passes, e.g. 2 for MCQs)
  - topic_scorer.py / performance_scorer.py's own percentage: 0-100

`percentage_from_score()` below normalizes any of these to a 0-100
percentage, either via explicit `scale=` (when the caller already knows
what they have) or `scale="auto"` (when they don't, e.g. a raw number
came from a tester/log without its scale attached) - see that
function's docstring for the auto-detection rule.

------------------------------------------------------------------------
INTEGRATION
------------------------------------------------------------------------
Import from elsewhere in the package as:

    from backend.answer_evaluation.grading import (
        Remark,
        grade_for_percentage,
        percentage_from_score,
        grade_score,
        grade_from_marks,
        scaled_score,
        PASS_THRESHOLD_PERCENT,
        WEAK_TOPIC_THRESHOLD,
    )

See INTEGRATION_NOTES.md (shipped alongside this change) for exactly
which __init__.py lines to add and the exact input/output shapes every
public function here takes.
"""

from dataclasses import dataclass, asdict

# ---------------------------------------------------------------------
# Remark band table - ordered highest to lowest, each entry is
# (min_percent_inclusive, remark, status)
# ---------------------------------------------------------------------
_REMARK_BANDS = [
    (91, "Excellent", "strong"),
    (81, "Very Good", "strong"),
    (71, "Good", "strong"),
    (51, "Average", "average"),
    (33, "Needs Improvement", "weak"),
    (0, "Weak", "weak"),
]

# Kept for callers that still want a single weak/strong cut-line (e.g.
# an older dashboard) rather than the full 3-way status. Matches the
# CBSE "D and below" qualifying-grade boundary (33%), which is a more
# defensible real-world line than an arbitrary 70%.
PASS_THRESHOLD_PERCENT = 33.0

# Backward-compat alias: topic_scorer.py historically exposed this name
# as its own hardcoded "weak" cut-line (70.0). Existing imports of
# WEAK_TOPIC_THRESHOLD keep working; it's just now derived from the
# same real cut-points above (the Needs-Improvement / Average boundary
# at 51%) instead of a flat, hand-picked 70.
WEAK_TOPIC_THRESHOLD = 51.0


@dataclass
class Remark:
    """One graded result. `percentage` is always 0-100. No letter
    grade is included - `remark` is the plain-English label, `status`
    is the coarse strong/average/weak bucket."""
    percentage: float
    remark: str
    status: str  # "strong" | "average" | "weak"

    def as_dict(self) -> dict:
        return asdict(self)

    def __str__(self) -> str:
        return f"{self.remark} ({self.percentage:.1f}%)"


def grade_for_percentage(percentage: float) -> Remark:
    """Looks up the remark band for a 0-100 percentage. Values outside
    [0, 100] are clamped rather than raising, since upstream rounding
    can occasionally push a value a hair past either end."""
    pct = max(0.0, min(100.0, float(percentage)))
    for min_pct, remark, status in _REMARK_BANDS:
        if pct >= min_pct:
            return Remark(percentage=round(pct, 1), remark=remark, status=status)
    # Unreachable (last band starts at 0) but keeps type-checkers happy.
    min_pct, remark, status = _REMARK_BANDS[-1]
    return Remark(percentage=round(pct, 1), remark=remark, status=status)


def percentage_from_score(score: float, scale: str = "auto") -> float:
    """
    Normalizes a raw score to a 0-100 percentage.

    `scale`:
      - "0-1"   : score is a fraction (e.g. evaluator.py's final_score) -> * 100
      - "0-10"  : score is out of 10 (e.g. a marks-out-of-10 tester)    -> * 10
      - "0-100" : score is already a percentage                        -> as-is
      - "auto"  : infer from magnitude (see rule below) when the caller
                  genuinely doesn't know which scale a number came in
                  on. Prefer passing an explicit scale whenever you
                  know it - auto-detection is a fallback, not a
                  replacement for a known scale, since 7 could
                  legitimately mean "7/10" (70%) or "7%" depending on
                  the source; auto-detect resolves that ambiguity by
                  assuming the more common case (marks-out-of-10)
                  rather than guessing "7%" for an otherwise reasonable
                  student mark.

      auto-detection rule, applied in order:
        0.0 <= score <= 1.0   -> treat as a 0-1 fraction
        1.0 <  score <= 10.0  -> treat as out of 10
        10.0 < score <= 100.0 -> treat as already a percentage
    """
    s = float(score)
    if scale == "0-1":
        pct = s * 100.0
    elif scale == "0-10":
        pct = s * 10.0
    elif scale == "0-100":
        pct = s
    elif scale == "auto":
        if 0.0 <= s <= 1.0:
            pct = s * 100.0
        elif 1.0 < s <= 10.0:
            pct = s * 10.0
        else:
            pct = s
    else:
        raise ValueError(f"Unknown scale {scale!r}; expected one of 'auto', '0-1', '0-10', '0-100'.")
    return max(0.0, min(100.0, pct))


def grade_score(score: float, scale: str = "auto") -> Remark:
    """Convenience one-shot: normalize a raw score (whatever scale it's
    on) straight to a Remark. Equivalent to
    grade_for_percentage(percentage_from_score(score, scale))."""
    return grade_for_percentage(percentage_from_score(score, scale))


def grade_from_marks(marks_awarded: float, max_marks: float) -> Remark:
    """Convenience for the common marks_awarded/max_marks shape used
    throughout evaluator.py / topic_scorer.py / performance_scorer.py.
    Returns the "Weak" remark at 0% if max_marks is 0 (nothing to
    grade) rather than dividing by zero."""
    if not max_marks:
        return grade_for_percentage(0.0)
    return grade_for_percentage((float(marks_awarded) / float(max_marks)) * 100.0)


def scaled_score(marks_awarded: float, max_marks: float, scale: float = 10.0) -> float:
    """Re-expresses a marks_awarded/max_marks ratio on an arbitrary
    target scale (e.g. scale=10 for a '7.4/10' display, scale=1 for a
    raw 0-1 fraction). Purely a display convenience - the remark itself
    is always computed from the underlying percentage, not from this
    scaled value, so rounding here never affects grading."""
    if not max_marks:
        return 0.0
    return round((float(marks_awarded) / float(max_marks)) * scale, 2)