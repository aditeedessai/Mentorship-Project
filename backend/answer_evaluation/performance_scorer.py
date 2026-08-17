"""
backend.answer_evaluation.performance_scorer

Attempt-level TOTAL / OVERALL performance aggregation, sitting one layer
above evaluator.py and topic_scorer.py:

    evaluator.py           -> grades ONE question               (marks_awarded)
    topic_scorer.py        -> rolls many questions into ONE TOPIC (percentage, weak/strong, remark)
    performance_scorer.py  -> rolls many SECTIONS (MCQ / Application / Subjective /
                               any other question-type your product defines) of ONE
                               attempt into a single overall percentage, updated
                               live as each section is submitted.

------------------------------------------------------------------------
WHAT CHANGED FROM THE ORIGINAL VERSION
------------------------------------------------------------------------
Two additions, both purely additive - every existing key this module
returned still exists with the exact same meaning:

  1. PLAIN-ENGLISH REMARKS. Every percentage this module produces
     (per-section and overall) now also gets a plain qualitative remark
     via grading.py - Excellent / Very Good / Good / Average / Needs
     Improvement / Weak. No letter grades (A1, B2, etc.) are used
     anywhere. A raw score handed to this module can be on ANY common
     scale (a 0-1 fraction, a mark out of 10, or an already-computed
     0-100 percentage) - grading.percentage_from_score() normalizes it
     before grading, so callers don't need to pre-convert depending on
     which "tester" or scoring convention produced the number.

  2. STRONGER DIAGNOSTICS. overall_performance() now also reports:
       - `consistency`: how much the attempted sections' percentages
         vary from each other (stdev), labeled "consistent" /
         "uneven" / "inconsistent" - flags a student who is, say, 95%
         on MCQ but 40% on Subjective, which a single averaged overall
         percentage alone hides.
       - `strongest_section` / `weakest_section`: quick pointers into
         `sections` for whichever attempted section has the highest/
         lowest percentage, so a caller doesn't have to scan the dict
         itself to render "You're strongest in X, focus on Y" copy.

------------------------------------------------------------------------
WHERE THIS FITS IN THE PROJECT
------------------------------------------------------------------------
This module does NOT call, import, or depend on the semantic models
(sbert_model.py), the LLM judge (llm_judge.py), or the normalization
pipeline (normalization.py) in any way. It never touches raw student/
reference text. It only consumes the OUTPUT that evaluator.py's
evaluate_mcq() / evaluate_answer() / evaluate_answers_batch() already
produce for each question - specifically the `marks_awarded` field every
one of those three functions already returns - paired with the
`max_marks` the caller asked for when it graded that question, and
grading.py's remark bands.

Because of that, this file:
  - can be imported and used by the route/service layer immediately after
    calling evaluate_mcq / evaluate_answer / evaluate_answers_batch, with
    zero changes to those functions or their call signatures,
  - never needs the ML models loaded to run (no GPU/CPU inference cost),
  - is deterministic and trivially unit-testable on its own.

------------------------------------------------------------------------
INPUTS THIS MODULE NEEDS FROM THE REST OF THE PROJECT
------------------------------------------------------------------------
The route/service layer is responsible for supplying, per question, per
section:
  1. `max_marks`   (float) - whatever was passed into evaluate_mcq /
                    evaluate_answer / evaluate_answers_batch for that
                    question. This module never invents or defaults it.
  2. the matching result dict returned by one of those three grading
                    functions - specifically its `marks_awarded` field
                    is what gets read; every other field in that result
                    dict is ignored here (topic_scorer.py and the route
                    layer can still read the rest for their own needs).
  3. `topic`       (string, OPTIONAL) - only required if the caller wants
                    the strong/weak topic breakdown (topic_breakdown()
                    below); if omitted, questions are grouped under a
                    single "general" topic so aggregation still works.
  4. a `section_name` (string) chosen by the caller for each question
                    type in their product (e.g. "mcq", "application",
                    "subjective", or any other names the product uses -
                    this module does not hardcode section names anywhere
                    except as display defaults, see SECTION_DISPLAY_ORDER
                    below, which callers can override).
  5. an `attempt_id` (string) - however the route layer identifies a
                    single test-taking session/attempt (e.g. a DB row
                    id, a UUID) - used only as a label on this object and
                    its output, not looked up or persisted by this module.

This module does NOT persist anything itself, and does NOT ship any
example/sample data of its own - every number in every output comes
from whatever `items`/`results`/`entries` the caller passes in. If the
product needs an attempt's progress to survive across separate HTTP
requests (e.g. one request per section submitted), the route/service
layer is responsible for serializing/deserializing a TestAttempt's
state (its section entries) between requests - e.g. storing the
entries per section in the database against `attempt_id` and
reconstructing a TestAttempt (via repeated submit_section calls) at
the start of each request that needs it. This module only defines the
in-memory aggregation logic, not the persistence layer.

------------------------------------------------------------------------
OVERALL PERFORMANCE RULE
------------------------------------------------------------------------
Overall performance is the SIMPLE AVERAGE of every section's own
percentage (marks_awarded / max_marks * 100) among sections that have
actually been ATTEMPTED (submitted) so far - it is NOT a marks-weighted
average across every question ever answered, so a section with many
questions does not count more toward the overall number than a section
with few. Sections that have not yet been submitted are excluded from
the average entirely (never treated as a 0%), so a partially-completed
attempt's overall percentage reflects only what's actually been
attempted. (Unchanged from the original implementation.)

------------------------------------------------------------------------
INTEGRATION
------------------------------------------------------------------------
Import from elsewhere in the package as:

    from backend.answer_evaluation.performance_scorer import (
        TestAttempt,
        build_scored_entries,
        section_summary,
        grade_raw_score,
        SECTION_DISPLAY_ORDER,
    )

See INTEGRATION_NOTES.md for the exact input/output shapes of every
public function/method below, and for how this ties together with
evaluator.py's outputs and topic_scorer.py.
"""

import logging
import statistics

from backend.answer_evaluation.topic_scorer import aggregate_topic_scores, WEAK_TOPIC_THRESHOLD
from backend.answer_evaluation.grading import grade_for_percentage, percentage_from_score, scaled_score

logger = logging.getLogger(__name__)

__all__ = [
    "SECTION_DISPLAY_ORDER",
    "CONSISTENCY_STDEV_EVEN",
    "CONSISTENCY_STDEV_UNEVEN",
    "build_scored_entries",
    "section_summary",
    "grade_raw_score",
    "TestAttempt",
]

# Display-only default ordering / default "known sections" list, used to
# populate `not_attempted` before a caller has told this module what
# sections it plans to use (see TestAttempt.__init__'s `known_sections`
# param). Callers whose product uses different section names (e.g.
# "definition" instead of "subjective", or additional custom types)
# should pass their own list explicitly - this default only exists so the
# module is usable out of the box for the common MCQ/Application/
# Subjective case.
SECTION_DISPLAY_ORDER = ["mcq", "application", "subjective"]

# Consistency labeling thresholds, applied to the standard deviation (in
# percentage points) across attempted sections' percentages. These are
# intentionally coarse - the point is to flag "wildly uneven across
# sections" (e.g. 95% MCQ / 35% Subjective) for follow-up, not to make a
# precise statistical claim from what's usually only 2-4 data points.
CONSISTENCY_STDEV_EVEN = 10.0    # <= this: "consistent"
CONSISTENCY_STDEV_UNEVEN = 20.0  # <= this: "uneven"; above it: "inconsistent"


def _round1(value: float) -> float:
    return round(value, 1)


def _consistency_label(stdev: float) -> str:
    if stdev <= CONSISTENCY_STDEV_EVEN:
        return "consistent"
    if stdev <= CONSISTENCY_STDEV_UNEVEN:
        return "uneven"
    return "inconsistent"


def build_scored_entries(items: list, results: list, max_marks_field: str = "max_marks",
                          topic_field: str = "topic") -> list:
    """
    Zips a list of input items (whatever the caller passed to
    evaluate_mcq / evaluate_answer / evaluate_answers_batch for a batch
    of questions - each must carry `max_marks`, and optionally `topic`)
    together with the parallel list of result dicts those functions
    returned (each must carry `marks_awarded`), into the flat
    {marks_awarded, max_marks, topic} entries this module and
    topic_scorer.aggregate_topic_scores() both consume.

    `items` and `results` must be the same length and in the same order
    - i.e. results[i] is the grading result for items[i]. This is
    exactly the relationship the route layer already has right after
    calling evaluate_answers_batch(items) (or looping evaluate_answer/
    evaluate_mcq over items one at a time and collecting results in the
    same order).

    `max_marks_field` / `topic_field` let the caller's item dicts use
    different key names than "max_marks"/"topic" without needing to
    reshape them first. Items missing the topic field are assigned
    topic="general" so aggregation still works when topics aren't used.

    Raises ValueError if `items` and `results` are different lengths.
    Returns an empty list for empty input (no example/placeholder
    entries are ever fabricated).
    """
    if len(items) != len(results):
        raise ValueError(f"items ({len(items)}) and results ({len(results)}) must be the same length")

    entries = []
    for item, res in zip(items, results):
        entries.append({
            "marks_awarded": float(res["marks_awarded"]),
            "max_marks": float(item[max_marks_field]),
            "topic": item.get(topic_field, "general"),
        })
    return entries


def section_summary(entries: list) -> dict:
    """
    Rolls up one section's per-question scored entries (see
    build_scored_entries) into {marks_awarded, max_marks, percentage,
    remark}. An empty entries list yields max_marks=0 / percentage=0.0
    here - the caller (TestAttempt) is what decides whether an empty/
    missing section counts as "not attempted" rather than "attempted
    with 0%"; this function only reports totals for whatever entries
    it's given.
    """
    marks_awarded = sum(e["marks_awarded"] for e in entries)
    max_marks = sum(e["max_marks"] for e in entries)
    percentage = _round1((marks_awarded / max_marks) * 100) if max_marks > 0 else 0.0
    remark = grade_for_percentage(percentage)
    return {
        "marks_awarded": round(marks_awarded, 2),
        "max_marks": round(max_marks, 2),
        "percentage": percentage,
        "remark": remark.remark,
    }


def grade_raw_score(score: float, scale: str = "auto") -> dict:
    """
    Grades a single raw score directly, without needing a marks_awarded/
    max_marks pair - useful for products that just have "a number" from
    a tester (e.g. a 0-1 model confidence, a mark out of 10, or an
    already-computed percentage) and want a remark for it without
    reshaping it into entries first.

    `scale`: "0-1", "0-10", "0-100", or "auto" (infer from magnitude -
    see grading.percentage_from_score for the exact rule). Prefer
    passing the real scale when you know it; "auto" is a convenience
    fallback for callers that genuinely don't track it.
    """
    remark = grade_for_percentage(percentage_from_score(score, scale))
    return {
        "percentage": remark.percentage,
        "remark": remark.remark,
        "status": remark.status,
    }


class TestAttempt:
    """
    Tracks ONE attempt (one attempt_id) across however many sections get
    submitted to it, and computes overall/final performance the same way
    at any point in the flow - the route layer calls submit_section()
    once per section as the user completes it (in whatever order the
    product's flow allows), and reads the returned snapshot to render
    "Updated Overall Performance" after each one. Calling
    final_performance() at the end (e.g. on "End Test") is the identical
    calculation - it exists as a separate, clearly-named entry point for
    callers that want to distinguish "still mid-attempt" snapshots from
    the attempt's closing summary, and as a natural extension point if
    end-of-attempt-only behavior (e.g. locking further submissions) is
    ever added later.

    This class holds NO persistence of its own and ships NO built-in
    example data - it starts empty and only ever reflects whatever
    entries the caller submits via submit_section(). See the module
    docstring's note on persistence responsibility.
    """

    def __init__(self, attempt_id: str, known_sections: list = None):
        """
        `known_sections`: the full set of section names this attempt is
        expected to cover (e.g. ["mcq", "application", "subjective"], or
        whatever names the calling product uses). Used only to populate
        `not_attempted` in performance snapshots before every section
        has been submitted yet. Defaults to SECTION_DISPLAY_ORDER; pass
        your product's actual section names here if they differ (a
        section name not present in this list, and not yet submitted,
        will not appear in `not_attempted` until it's known about -
        either via this param or by having been submitted at least
        once).
        """
        self.attempt_id = attempt_id
        self._known_sections = list(known_sections) if known_sections is not None else list(SECTION_DISPLAY_ORDER)
        self._sections = {}       # section_name -> list of scored entries
        self._submit_order = []   # order sections were attempted in, for display/ordering purposes

    def submit_section(self, section_name: str, entries: list) -> dict:
        """
        Records a section's scored entries (see build_scored_entries) as
        attempted (or REPLACES that section's entries if it was already
        submitted - callers that want to support "retake this section"
        can call this again with the new entries) and returns the
        updated overall-performance snapshot (see overall_performance())
        so the caller can render the new state immediately without a
        second call.
        """
        if section_name not in self._sections:
            self._submit_order.append(section_name)
        self._sections[section_name] = entries
        return self.overall_performance()

    def is_attempted(self, section_name: str) -> bool:
        return section_name in self._sections

    def section_performance(self, section_name: str) -> dict:
        """
        Returns section_summary() for one section, plus an `attempted`
        flag. If the section hasn't been submitted yet, returns
        percentage=None / remark=None / attempted=False rather than 0%,
        so callers can render "Not attempted" instead of a misleading
        zero score or a "Weak" remark the student never earned.
        """
        if not self.is_attempted(section_name):
            return {
                "marks_awarded": 0.0, "max_marks": 0.0, "percentage": None,
                "remark": None, "attempted": False,
            }
        summary = section_summary(self._sections[section_name])
        summary["attempted"] = True
        return summary

    def overall_performance(self) -> dict:
        """
        Simple average of every ATTEMPTED section's percentage (see
        module docstring's OVERALL PERFORMANCE RULE), plus:
          - `overall_remark`: the plain-English remark for that averaged
            percentage.
          - `consistency`: {stdev, label} describing how much attempted
            sections' percentages vary from each other.
          - `strongest_section` / `weakest_section`: section names (or
            None if fewer than 2 sections attempted, where "strongest/
            weakest" isn't a meaningful distinction yet).

        Returns overall_percentage=0.0, sections={}, attempted_sections=[]
        if nothing has been submitted yet (start-of-attempt state);
        overall_remark/consistency/strongest_section/weakest_section are
        None in that case too.
        """
        attempted_names = self._submit_order
        section_results = {name: section_summary(self._sections[name]) for name in attempted_names}

        if not attempted_names:
            overall_percentage = 0.0
        else:
            overall_percentage = _round1(
                sum(s["percentage"] for s in section_results.values()) / len(attempted_names)
            )

        all_known_sections = set(self._known_sections) | set(attempted_names)
        not_attempted = [s for s in sorted(all_known_sections) if s not in self._sections]

        if not attempted_names:
            overall_remark = None
            consistency = None
            strongest_section = None
            weakest_section = None
        else:
            overall_remark = grade_for_percentage(overall_percentage).remark

            percentages = [s["percentage"] for s in section_results.values()]
            stdev = round(statistics.pstdev(percentages), 1) if len(percentages) > 1 else 0.0
            consistency = {"stdev": stdev, "label": _consistency_label(stdev)}

            if len(section_results) >= 2:
                strongest_section = max(section_results, key=lambda name: section_results[name]["percentage"])
                weakest_section = min(section_results, key=lambda name: section_results[name]["percentage"])
            else:
                strongest_section = None
                weakest_section = None

        return {
            "attempt_id": self.attempt_id,
            "overall_percentage": overall_percentage,
            "overall_remark": overall_remark,
            "consistency": consistency,
            "strongest_section": strongest_section,
            "weakest_section": weakest_section,
            "sections": section_results,
            "attempted_sections": list(attempted_names),
            "not_attempted": not_attempted,
        }

    def final_performance(self) -> dict:
        """Same calculation as overall_performance() - see class
        docstring for why this exists as a separate named entry point."""
        return self.overall_performance()

    def topic_breakdown(self, section_name: str = None, threshold: float = WEAK_TOPIC_THRESHOLD) -> dict:
        """
        Strong/weak topic rollup for this attempt, delegating the actual
        aggregation to topic_scorer.aggregate_topic_scores() (which also
        assigns a plain-English remark to every topic - see
        topic_scorer.py's module docstring for the fields that adds).

        Pass `section_name` to scope the breakdown to just that one
        section (e.g. immediately after that section is submitted, to
        show per-section topic feedback); omit it to break down topics
        across every section attempted so far in this attempt.

        Entries with no topic set are grouped under "general" (see
        build_scored_entries) - topic_scorer.aggregate_topic_scores()
        requires a `topic` key on every entry, which is why
        build_scored_entries always supplies one.
        """
        if section_name is not None:
            entries = self._sections.get(section_name, [])
        else:
            entries = [e for sec_entries in self._sections.values() for e in sec_entries]

        question_results = [
            {"topic": e["topic"], "marks_awarded": e["marks_awarded"], "max_marks": e["max_marks"]}
            for e in entries
        ]
        return aggregate_topic_scores(question_results, threshold=threshold)