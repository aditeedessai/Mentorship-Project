-- quiz_attempts has an index on study_set_id (see init_schema.sql) but
-- never got one on user_id, despite attempt_repository.py filtering on
-- it directly in list_attempts(), get_active_attempt_by_study_set() (hit
-- on every quiz start), and delete_attempts_for_user() - all of which
-- currently do a sequential scan of the whole table.

create index if not exists idx_quiz_attempts_user_id on quiz_attempts(user_id);
