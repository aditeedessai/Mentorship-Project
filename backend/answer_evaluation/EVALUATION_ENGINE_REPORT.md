# Answer Evaluation Engine — State of the System

*Covers `backend/answer_evaluation/`: `evaluator.py`, `similarity.py`, `normalization.py`, `sbert_model.py`, `llm_judge.py`, `grading.py`, `topic_scorer.py`, `performance_scorer.py`, `__init__.py`.*

---

## 1. Architecture Overview

A single `evaluate_answer(student_answer, reference_answer, max_marks)` call flows through two phases: a **statistical pipeline** that always runs, and an **optional LLM-judge escalation** that only fires for a minority of answers.

### Phase 1 — `_compute_statistical_result()` (evaluator.py)

Runs in this exact order:

1. **Empty-answer check** — blank/whitespace-only input short-circuits to a flat `final_score=0.0` immediately, nothing below runs.
2. **Normalization** (`normalization.py`) — expands contractions ("can't" → "cannot") and fixes typos via a SymSpell dictionary, protecting known technical terms (a static list plus terms dynamically pulled from the reference answer itself) from being "corrected" into an unrelated common word.
3. **Gibberish gate** — a cheap, free, local check of what fraction of the normalized answer's words are real dictionary words (or protected technical terms). Below a threshold, the pipeline stops immediately: `final_score=0.0`, `is_correct=False`, and the LLM judge is **never called** for this answer.
4. **Semantic scoring** — a cross-encoder judges whether the student answer means the same thing as the reference, regardless of wording (0–1 score).
5. **Concept coverage** — extracts key terms/phrases from the reference, checks which appear (exact match or embedding-similarity match) in the student answer.
6. **Keyword-stuffing detection** — flags unstructured word dumps / copy-paste fragments as distinct from genuine short answers.
7. **Negation-shift detection** — flags a negation/reversal word appearing in the student answer that isn't in the reference (a cheap hint of inverted meaning).
8. **Causal-language detection** — checks for explanatory connectors ("because", "therefore", "leads to"...).
9. **NLI contradiction check** — a dedicated local entailment/contradiction model scores the whole answer against the reference; for short answers (<15 words), this is also blended into the semantic score, since the cross-encoder is least reliable on short text.
10. **Clause-level NLI check** (conditional — only if step 8 found causal language) — checks whether the specific premise/conclusion clause pair is entailed or contradicted.
11. **Hallucination check** (conditional — only if concept or semantic score is already fairly high) — a dedicated hallucination-detection model checks whether the claim is actually grounded in the reference.
12. **Score integration** — combines semantic score + a concept-coverage bonus, then applies penalty multipliers (low concept+semantic, keyword stuffing, negation shift), then lets the local NLI model's own opinion raise or lower the score directly when it's confident (bypassing the need for an LLM call).
13. **Escalation decision** — a single function (`_should_escalate_to_llm_judge`) checks every signal computed above, in priority order, and decides whether this answer is ambiguous enough to warrant a (slow, paid, non-deterministic) LLM call, and *why*.

### Phase 2 — LLM judge (only if step 13 says yes)

`evaluate_answer()` dispatches to one of two functions depending on *why* escalation fired:

- **Completeness escalations** → `judge_completeness()` — one question: does this fully and correctly cover the reference, regardless of wording?
- **Everything else** → `judge_answer_polled()` — the same combined question asked **3 times** (self-consistency polling), batched into one network request.

### Phase 3 — `_finalize_result()`

Takes the statistical result plus whatever the judge (if called) returned, applies the appropriate score floor/cap/no-op rule for whichever path fired, clamps to [0,1], computes `marks_awarded = final_score × max_marks`, and returns the public result dict (`final_score`, `marks_awarded`, `is_correct`, `matched_concepts`, `missed_concepts`, `llm_judge_verdict`, etc.).

Above this, `topic_scorer.py` rolls many graded questions into a per-topic breakdown, and `performance_scorer.py` rolls many sections into an attempt-level overall performance summary — neither of these two touches any model or the LLM judge; they're pure arithmetic over `marks_awarded`/`max_marks` pairs, using `grading.py`'s remark bands (Excellent/Very Good/Good/Average/Needs Improvement/Weak, CBSE-derived cut-points) to turn a percentage into a plain-English label.

---

## 2. Models in Use

All four are loaded in `sbert_model.py` as lazy-loaded module-level singletons (loaded once, reused for the life of the process — or eagerly via `preload_models()` at FastAPI startup, see §4).

| Model | Checkpoint | Role | Runs on... |
|---|---|---|---|
| **Bi-encoder** | `BAAI/bge-large-en-v1.5` (`SentenceTransformer`) | Embeds text for concept-level similarity matching — deciding whether a reference concept "shows up" in the student answer even when not an exact substring match. | **Every** evaluation (concept coverage always runs). |
| **Cross-encoder** | `cross-encoder/stsb-roberta-base` | The primary semantic-correctness scorer — judges whether the student answer means the same thing as the reference, 0–1. | **Every** evaluation. |
| **NLI model** | `MoritzLaurer/DeBERTa-v3-base-mnli-fever-anli` (`CrossEncoder`) | Dedicated local entailment/contradiction classifier. Far more reliable than lexical negation-word spotting at catching "sounds similar but says the opposite." | **Every** evaluation, whole-answer (cheap free first-pass signal). Also run again at **clause level**, but only when the answer contains causal language ("because", "therefore"...). |
| **Hallucination model (HHEM)** | `vectara/hallucination_evaluation_model` — loaded via `transformers.AutoModelForSequenceClassification(trust_remote_code=True)`, *not* a plain `CrossEncoder` (it ships a custom modeling class) | Checks whether a claim is actually grounded in the reference vs. plausible-sounding invention. | **Conditional only** — only when concept coverage OR semantic score is already ≥ 0.70 (otherwise the answer is already clearly off-topic and HHEM would add nothing). |

**A fifth model is involved in scoring but is *not* loaded in `sbert_model.py`**: the **LLM judge** (`gemini-3.6-flash` by default, or a local Ollama model as an alternative backend) lives entirely in `llm_judge.py` — it's a remote API call (or local Ollama server call), not a model loaded into process memory. It only runs when the statistical pipeline's escalation decision says the answer is ambiguous enough to be worth it (see §3).

---

## 3. What Cases This Pipeline Handles

| Check | Catches | Concrete triggering example |
|---|---|---|
| **Semantic similarity** (cross-encoder) | An answer that reads as unrelated or contradictory in meaning, even if it shares vocabulary. | Student writes about a completely different mechanism than the reference describes. |
| **Concept coverage** | An answer missing the specific facts/terms the reference requires. | Reference lists 4 required elements; student mentions only 1. |
| **Keyword-stuffing detection** | A dense, unstructured dump of reference vocabulary with no real sentence structure — an attempt to game concept-coverage scoring rather than actually answer. | `"scaling load balancing servers infrastructure automatic deploy"` — high keyword density, no verb, no connectors. |
| **Negation-shift detection** | The student introduces a negation/reversal ("not", "prevents", "fails to") that isn't in the reference — a cheap, universal hint of inverted meaning. | Reference: "UDP does not guarantee delivery." Student: "UDP guarantees delivery." |
| **NLI contradiction check** | Meaning-level contradiction the surface wording might not reveal, and (via the short-answer blend) low-word-count answers where the cross-encoder alone is unreliable. | A confidently-worded answer that entails the *opposite* of the reference's claim. |
| **Hallucination consistency check (HHEM)** | "Right words, wrong claim" — fluent, on-topic, plausible-sounding text that doesn't actually follow from the reference, once vocabulary overlap alone would otherwise score it deceptively high. | A student answer using correct technical jargon to describe an invented mechanism the reference never states. |
| **Gibberish / real-word gate** | Text that isn't real, on-topic language at all — most words fail even a fuzzy dictionary/technical-term check. | `"bgnghnghng"` — scores 0.0, never reaches the LLM judge at all. |
| **Completeness rescue gate** | A genuinely correct answer, phrased very differently or more tersely than the reference, that the statistical score confidently under-scores (concept coverage ≥ 0.80, score in a specific band above the ordinary ambiguous range but below near-perfect). | A reference says "name any two of: A, B, C, D"; student correctly names exactly two — concept coverage penalizes the two correctly-omitted options as "missed." |
| **LLM judge escalation — standard path** (`judge_answer_polled`) | Genuinely ambiguous statistical cases: borderline score band, concept/semantic divergence ("right words, wrong claim" shape), a near-perfect-concept-but-not-quite-semantic gap, ambiguous negation, an NLI contradiction signal not already confidently resolved locally, a contradicted causal clause, or a flagged hallucination signal. Asks the SAME combined question 3 times (self-consistency polling) plus a 4th **coherence** question ("is this a real, connected claim at all, however short or informal — not scrambled/garbled fragments?"). | See below — this is the mechanism the day's investigation centered on. |
| **LLM judge escalation — completeness path** (`judge_completeness`) | The specific "confidently-scored but genuinely under-rewarded paraphrase" shape described above — a *different* question from the standard path, asked via its own dedicated prompt. | Same example as the completeness gate row above. |

### The self-consistency polling + coherence question, in detail

The standard LLM-judge path's original design asked exactly three questions (contradiction? hallucination? invalid logic?) — questions built to catch a *well-formed* answer being subtly *wrong*. They structurally cannot catch an answer that isn't a coherent claim in the first place, since "does this contradict the reference" has no good answer when there's no real assertion to compare. A scrambled, keyword-salad answer (real dictionary words and reference keywords, scrambled together with no sentence structure — the gibberish gate can't catch it, since most words genuinely are real or spell-correctable) can trivially answer "no" to all three questions and get rescued to `LLM_CONFIRM_SCORE_FLOOR` (0.75).

Confirmed via real production data (eval id 817, student answer `"btirhs delasiph ustm onclued population abandone coercive control exceute mountbatten plan cabinet mission"`) and repeated live testing: the same statistical inputs, judged by a single LLM call, returned a clean verdict roughly **1 in 6–7 calls** even though the same inputs were caught as wrong the rest of the time — genuine hosted-LLM non-determinism (temperature=0 does not guarantee identical output across separate API calls), not a deterministic bug.

The fix: a 4th coherence question, plus asking it **3 times** in one batched request with two separate, deliberately asymmetric thresholds:

- **Rescue** (raise to `LLM_CONFIRM_SCORE_FLOOR`) requires **all 3 votes clean** — any single dissenting vote withholds it.
- **Penalty** (`override_to_incorrect`, cap the score low) requires **at least 2 of 3 votes** flagging a problem — a single flaky vote alone cannot trigger the harsh penalty.
- Exactly 1-of-3 flagged is genuine ambiguity — the score falls back to whatever the statistical pipeline already computed, no artificial boost or cap.

Re-tested against the exact real production case: **10 of 10 fresh, uncached runs correctly withheld the rescue** (unanimous 3-of-3 penalty every time). Notably, across all 30 individual votes in that test, every single one still said "no contradiction, no hallucination, valid logic" (the original three questions) — it was the coherence question specifically catching it every time.

**Important scope note**: this fix — the coherence question and self-consistency polling — only applies to `evaluate_answer()`'s single-item path (`judge_answer_polled`). The production quiz-grading route goes through `evaluate_answers_batch()` → `judge_batch()`, which still uses the *original* three-question prompt with no coherence check and no polling (deliberately reverted to its exact original form partway through today's work, after an earlier draft accidentally shared a prompt string between the two paths — see §5).

---

## 4. Timing and Optimization Work Done

### Model preloading at startup

`sbert_model.py` exposed a `preload_models()` function that existed but was never called anywhere — meaning the *first* real evaluation request after any server restart silently paid the full model-loading cost. Fixed by adding a FastAPI `lifespan` startup hook in `backend/api/main.py` that calls `preload_models()` once, with clear before/after log lines including elapsed time, so all four models load before the server starts accepting requests instead of on whichever request happens to be first.

### Concurrent model construction — tried, and rejected for correctness

The original ask was to load all four models concurrently via `ThreadPoolExecutor` (they're independent, and loading is mostly I/O). Confirmed via live testing that this **is not safe**: two `sentence_transformers.CrossEncoder` constructions (or, in a later test, three-way combinations including the bi-encoder and hallucination model) running truly concurrently intermittently raised `Cannot copy out of meta tensor; no data!` — a real thread-safety gap in the `transformers`/`accelerate` library's meta-device weight-materialization path, not something fixable from application code. A narrower fix (locking only the two `CrossEncoder` loads against each other) was tried and still failed on a different combination.

**Resolution**: model construction is now fully serialized via a lock, while still using the `ThreadPoolExecutor`/futures structure — so per-loader exception isolation (one failed model doesn't block the others) still works, and removing the lock is a one-line change if a future library release fixes the underlying issue. Net effect: **not currently a wall-clock speed win** (~18–22s for all four models in local testing, close to sequential) — but reliable, which the literal concurrent version measurably was not.

### LLM-judge batching — the main real speed win, with measured numbers

`evaluate_and_save_attempt_answers()` (the actual route the frontend calls to submit answers) originally called `evaluate_answer()` — one `evaluate_answer()` call, and therefore one individually-throttled LLM-judge network round-trip, **per answer**, in a sequential loop. Changed to: collect every non-MCQ answer in the submission first, then call `evaluate_answers_batch()` **once**, which groups every escalated item into `judge_batch()` requests of up to `JUDGE_BATCH_SIZE` (25) pairs per network call instead of one call per item. (MCQ answers are still graded individually via `evaluate_mcq()` — fast, local, never touches the judge, so batching it would add nothing.)

**Measured, real, on the actual code** (a 2-question section, both answers independently confirmed to escalate):

| | Before (per-item loop) | After (batched) |
|---|---|---|
| Judge network round-trips | 2 (sequential: 76.0s + 97.2s) | 1 (combined) |
| Total section grading time | **179.13s** | **54.97s** |
| Speedup this run | — | ~3.3× |

An earlier identical test measured ~4.7× (106.01s → 22.70s) — the multiplier varies because Gemini's own per-call latency is highly variable session-to-session (observed anywhere from ~4s to ~100s for the same call type across this project's testing). The number that's actually deterministic: **N escalating answers in a section now cost `ceil(N / 25)` judge requests instead of N.**

### Per-stage timing instrumentation

`evaluate_answer()` now logs one combined `TIMING` line per call (normalization / semantic / concept / stuffing / negation / nli / clause_nli / hallucination / llm_judge, each in ms), confirming directly that the LLM judge dominates whenever it fires — one measured example: 58.6s total, of which 56.1s (96%) was the judge call alone, vs. ~1.35s total for a non-escalated answer. This instrumentation is `evaluate_answer()`-only; `evaluate_answers_batch()` (the actual production path) does not currently get the same per-item breakdown — a known, previously-flagged gap, not yet closed.

### Batch response truncation — found and fixed

Batching 25 pairs into one request originally used a fixed 220-tokens-per-item output budget, which reliably (though intermittently) truncated Gemini's JSON response mid-object under real testing. Root cause, confirmed via logging the actual raw response text on failure: uncontrolled "thinking" tokens (a separate discovery — the code's own attempt to suppress thinking via `thinking_level="low"` was silently failing due to a pydantic validation error in the installed SDK version, so thinking was never actually being limited) competing with a verbose reasoning field for the same fixed budget. Fixed by raising the per-item budget to 350, shortening the requested reasoning length, and correctly minimizing thinking via `thinking_budget=1` (not `0` — confirmed via a live call that this model rejects `0` outright, despite the SDK's own docs claiming it should work). Re-verified with repeated real trials showing complete, non-truncated responses.

---

## 5. Known Open Issues

### 1. `is_stuffing` false positive on short, verbatim-correct answers

**Example**: student answer `"The cabinet mission of 1946 and the Mountbattan plan"` (one typo: Mountbattan vs. Mountbatten) against reference `"The Cabinet Mission of 1946 and the Mountbatten Plan."` — `semantic_score=0.994`, `concept_score=1.0` (both near-perfect), yet `detect_keyword_stuffing()` in `similarity.py` flags `is_stuffing=True`.

**Why**: the answer is a terse, connector-free, verb-less noun-phrase restatement that closely mirrors the reference's own wording. This trips the stuffing detector's "sentence fragment" and "no explanatory connector" signals (Group B), combined with a near-verbatim overlap with the reference text.

**Why it matters**: `_should_escalate_to_llm_judge()` is only ever called `if not is_stuffing` in `_compute_statistical_result()` — meaning **no fix that adds a new escalation trigger can ever reach this case**, since escalation is structurally skipped before any trigger logic runs. The answer is capped near `STUFFING_PENALTY_MULTIPLIER` territory regardless of how correct it actually is. This needs its own dedicated pass at `detect_keyword_stuffing()`'s thresholds (likely distinguishing "near-verbatim because it's a correct, terse restatement" from "near-verbatim because it's a copy-paste cheat"), not a change to the escalation-trigger layer.

### 2. Over-generous `LLM_CONFIRM_SCORE_FLOOR` rescue on incomplete answers

**Example**: student answer `"file sharing"` against reference `"Online classes, assignments, quizzes, and content sharing."` — captures roughly 1 of 4 required concepts (and not even an exact match to "content sharing"), `concept_score=0.4`, pre-judge statistical `final_score≈0.19`. Escalates via `concept_semantic_divergence`, and every observed run of the (now poll-based) judge returns a unanimous clean verdict — the answer isn't a *contradiction* of anything, it's just badly incomplete — so it gets floored to `LLM_CONFIRM_SCORE_FLOOR` (0.75) anyway.

**Why**: none of the standard judge's questions (contradiction / hallucination / invalid logic / coherence) evaluate *completeness*. "file sharing" genuinely is coherent, non-contradictory, non-hallucinated text — so it clears every bar the standard path checks, while still being substantively wrong by omission.

**Why it matters**: this is the mirror-image gap from the completeness *rescue* gate (§3) — that gate exists to *raise* an under-scored-but-complete answer; this bug is the standard rescue floor incorrectly applying to an *incomplete* answer via a *different* trigger. Confirmed today NOT to be silently fixed as a side effect of either the completeness gate or the polling fix — both were deliberately scoped away from touching this. A fix would likely mean either tightening `LLM_CONFIRM_SCORE_FLOOR`'s eligibility (e.g. requiring a minimum concept-coverage floor before a clean verdict is trusted as a full rescue) or adding completeness as a genuine 5th question on the standard path — a deliberate design decision, not yet made.

### 3. Self-consistency polling and the coherence question don't reach the production batch path — RESOLVED

~~Not one of the two issues you named, but directly adjacent and worth flagging clearly: `evaluate_answers_batch()` (what the real quiz-submission route actually calls) still routes escalated items through `judge_batch()`, which uses the *original*, unpolled, three-question prompt — no coherence check, no self-consistency polling.~~ Fixed in a later same-day session: `evaluate_answers_batch()` now routes standard-path escalations through `judge_batch_polled()` (the same 3-vote, coherence-checked poll `judge_answer_polled()` uses, generalized to N different pairs per request, chunked at `POLL_BATCH_CHUNK_SIZE=5`) and completeness-path escalations through `judge_completeness()`, split by `escalate_reason` — a second, previously-undiscovered routing bug found and fixed in the same pass. Re-verified against the real eval-id-817 case through `evaluate_answers_batch()` specifically (not just `evaluate_answer()`): 3/3 genuine judge-available runs correctly penalized before the day's Gemini quota was exhausted.

### 4. Gibberish gate laundering real-but-wrong words via SymSpell normalization

**Example**: real production row, eval id 835 — student answer `"dreun het ti lrues platforms must appoint rievcge offrecs rpidly ovemr unlawful content, naimtain transparent seru olipcies"` (letter-level anagram scrambling *within* words — `dreun`→`under`, `rievcge`→`grievance`, etc. — not word-order scrambling like eval id 817) against reference `"Platforms are obligated to appoint grievance officers, rapidly remove unlawful or court-ordered illicit content, and maintain transparent user policies."` — scored `real_word_ratio=1.0` (gate never fires), `semantic_score=0.788`, `concept_score=0.476`, `final_score=0.803`, `marks_awarded=8.03`.

**Why**: `normalize_text()`'s SymSpell correction step "fixes" each scrambled token into *some* real dictionary word, just not the intended one — `dreun→run`, `rievcge→rivage`, `offrecs→offers`, `rpidly→rapidly`, `ovemr→over`, `naimtain→maintain`, `seru→peru`, `olipcies→policies`. The gibberish gate only checks "is every token a real word after correction," so it sees 100% real words and never fires — even though several of those "real words" are wrong ones, and the answer is genuinely scrambled nonsense in several places. Several other words in the same answer genuinely are correct and unscrambled ("platforms", "unlawful", "content", "transparent"), which is exactly why a simple real-word-ratio threshold can't distinguish this case from a legitimately worded answer with a few typos.

**Why it matters**: this is a *different* failure shape from eval id 817 (word-order scrambling of otherwise-intact words, caught by the coherence question once escalated) — here, letter-level scrambling gets silently absorbed by spell-correction before the gibberish gate ever sees it, so the statistical layer scores it as if it were genuine (if imperfect) prose. This case *did* escalate (via `hallucination_signal`, a different trigger than 817's `concept_semantic_divergence`) — the gate isn't the only line of defense — but whether the coherence question would reliably catch letter-scrambled-then-mis-corrected text the way it catches word-order scrambling is untested; the live verdict for this exact case wasn't obtained (quota-exhausted, see Issue 1/Problem B below). This needs its own dedicated investigation the same way eval id 817's polling fix did — likely either a stricter real-word check (e.g. weighting how much a token had to change to "become" a real word, not just whether it landed on one) or confirming the coherence question generalizes to this shape — not a rushed fix bundled with unrelated work.

---

## 6. Overall Assessment

**Strongest**: the free, local, statistical layer is genuinely sophisticated and well-defended — semantic + concept + NLI + (conditional) hallucination checking, with negation and causal-clause handling, and a real, tested gibberish gate at the front door. Nothing costs an API call unless a signal actually says the case is ambiguous, and today's work confirmed (with real, repeated live testing rather than assumption) that several of the trickiest failure modes — pure gibberish, batch-response truncation, model-loading races, LLM non-determinism — are now handled with verified fixes, not guesses. The instinct throughout today's sessions to confirm every claim against real data before changing anything, and to keep each fix narrowly scoped, has left the codebase in a state where I can point to a specific test result for almost every design decision in this report rather than a "should work."

**Weakest**: two things. First, the LLM-judge layer is the single largest source of both cost and remaining risk — it's the slowest part by nearly two orders of magnitude when it fires (a judge call can be 30–100× the cost of every statistical stage combined), it's the only genuinely non-deterministic part of the whole pipeline, and today's fix for that non-determinism covers only one of the two real call sites. Second, the stuffing detector and the LLM-confirm floor both have known, real false-positive/false-negative modes (Issues 1 and 2 above) that are structurally independent of each other and of today's fixes — meaning a student can currently be *wrongly penalized* for a terse-but-correct answer, or *wrongly rewarded* for a coherent-but-incomplete one, in the same session, for unrelated reasons.

**What I'd prioritize next**: in order — (1) decide and fix the `LLM_CONFIRM_SCORE_FLOOR` over-rescue issue, since it's the more consequential of the two known bugs (silently inflating scores is worse than a locally-recoverable escalation gap) and now has a clear, isolated real example to test against; (2) decide whether self-consistency polling should extend to `evaluate_answers_batch()`, since that's the actual student-facing path and the fix as it stands doesn't reach it; (3) the `is_stuffing` false positive, since it's a narrower, well-understood fix (tune the Group B signal combination to exempt near-verbatim-but-correct short restatements) once someone commits to a specific rule change.
