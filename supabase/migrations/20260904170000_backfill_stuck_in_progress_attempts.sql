-- One-time backfill for the revision-lockout fix in
-- evaluation_service.evaluate_and_save_attempt_answers(): before that
-- fix, an attempt's answers being submitted/evaluated never flipped
-- quiz_attempts.status to 'completed' (only the rarely/unreliably-called
-- finish_attempt route did). Any attempt submitted before the fix was
-- deployed is stuck 'in_progress' forever in the database despite
-- genuinely being answered - and start_attempt's "resume an in-progress
-- attempt" check matches on status alone, so these old attempts keep
-- getting silently resumed (old attempt_id, old questions) instead of
-- the revision due-date gate ever being consulted for them again.
--
-- Scoped narrowly: only touches attempts that ACTUALLY have evaluations
-- recorded matching their own locked question_type - i.e. were
-- genuinely submitted, not just started and abandoned. A truly
-- still-in-progress (never answered) attempt has no matching row here
-- and is left untouched, exactly as it should be.
update quiz_attempts
set status = 'completed', updated_at = now()
where status = 'in_progress'
  and exists (
      select 1
      from evaluations e
      join questions q on q.question_id = e.question_id
      where e.attempt_id = quiz_attempts.attempt_id
        and q.question_type = quiz_attempts.question_type
  );
