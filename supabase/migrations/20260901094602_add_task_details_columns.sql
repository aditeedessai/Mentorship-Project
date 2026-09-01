-- Extends the tasks table to match the new "Add New Study Task" form:
-- links a task to a study set, adds a task type, and splits time out
-- from due_date as its own optional field.
--
-- study_set_id is nullable at the DB level even though the form marks it
-- required (red asterisk) - the form/frontend enforces that requirement,
-- not the database. Keeping it nullable here means existing task rows
-- (created before this migration) don't need backfilling, and it stays
-- consistent with exams.study_set_id's same nullable + on delete set null
-- pattern used elsewhere in this schema.

alter table tasks add column if not exists study_set_id uuid
    references study_sets(study_set_id) on delete set null;

alter table tasks add column if not exists task_type text not null default 'study'
    check (task_type in ('study', 'review', 'quiz', 'assignment', 'other'));
    -- Adjust this list to match whatever options the Task Type dropdown
    -- actually offers in the UI - only "Study" was visible in the
    -- screenshot, so this is a reasonable starting set, not confirmed
    -- exhaustive.

alter table tasks add column if not exists due_time time;
    -- Nullable/optional, matching the form's "Time (optional)" field.
    -- due_date (already existing) stays a separate date column - not
    -- merged into a single timestamp, to avoid touching existing code
    -- that already queries/filters by due_date alone.

create index if not exists idx_tasks_study_set_id on tasks(study_set_id);