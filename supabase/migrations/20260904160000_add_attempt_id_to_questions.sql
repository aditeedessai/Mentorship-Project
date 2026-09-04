-- Revision bug fix: each generation of questions for a (study_set,
-- question_type) pair must be scoped to the attempt it was generated
-- for, so a NEW revision attempt (which gets a fresh attempt_id - see
-- api/routes/attempts.py's start_attempt, which only reuses an existing
-- attempt_id while status='in_progress') gets served ONLY its own
-- freshly-generated question set, instead of every question ever
-- generated for that study set + type across every past attempt.
--
-- Nullable and ON DELETE SET NULL (not CASCADE): a question row must
-- never be silently destroyed by attempt bookkeeping - evaluations
-- already references questions(question_id) ON DELETE CASCADE, so
-- deleting a question row would destroy the historical evaluation
-- record of whichever attempt it was scored under. Existing rows
-- (pre-dating this column) get attempt_id = NULL, treated by the app
-- as "ungrouped legacy question" - never matched by an attempt-scoped
-- filter, but never deleted either.
alter table questions
    add column if not exists attempt_id text references quiz_attempts(attempt_id) on delete set null;

create index if not exists idx_questions_attempt_id on questions(attempt_id);
