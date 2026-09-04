-- Pivot: every quiz_attempts row is now scoped to exactly one
-- question_type from creation - there is no longer a distinct "initial"
-- attempt spanning all 4 types together. attempt_kind's two-value
-- distinction ('initial' vs 'revision') no longer describes anything
-- real, so it is dropped rather than left as permanently-unused dead
-- weight.

-- Drop the OLD consistency constraint FIRST, before backfilling -
-- otherwise the backfill below (which sets question_type to a non-null
-- value while attempt_kind is still 'initial' on every existing row)
-- would violate it immediately, before this migration ever gets to drop
-- it. Confirmed live: an earlier version of this migration that dropped
-- it last failed with exactly this violation on a real push attempt.
alter table quiz_attempts
    drop constraint if exists quiz_attempts_kind_type_consistency;

-- Backfill question_type for every existing row (all 118 of them, as of
-- this migration, pre-date this feature and currently have
-- question_type = NULL under the old attempt_kind='initial' shape).
-- Confirmed via a real data check before writing this:
--   - attempts with recorded evaluations get the question_type with the
--     highest total marks_awarded (ties broken alphabetically for
--     determinism) - exact for the attempts that only ever touched one
--     type, an approximation for the handful of legacy attempts that
--     genuinely spanned multiple types under the old all-4-together
--     model (there is no single correct type for those - this picks the
--     one the attempt is most associated with by scored volume).
--   - attempts with zero evaluations ever recorded (started, never
--     answered) fall back to 'mcq' via COALESCE, since there is no real
--     data to derive a type from and nothing meaningful is lost by the
--     placeholder.
update quiz_attempts
set question_type = coalesce(
    (
        select q.question_type
        from evaluations e
        join questions q on q.question_id = e.question_id
        where e.attempt_id = quiz_attempts.attempt_id
          and q.question_type in ('mcq', 'application', 'long', 'short')
        group by q.question_type
        order by sum(e.marks_awarded) desc, q.question_type asc
        limit 1
    ),
    'mcq'
)
where question_type is null;

alter table quiz_attempts
    alter column question_type set not null;

alter table quiz_attempts
    drop constraint if exists quiz_attempts_attempt_kind_check;

alter table quiz_attempts
    drop column if exists attempt_kind;
