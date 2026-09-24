-- Prevents an authenticated user from creating two study sets with the
-- same name.  The constraint is a UNIQUE index scoped to (user_id, name)
-- with a WHERE user_id IS NOT NULL filter so that:
--   1. Legacy/ownerless study sets (user_id IS NULL) are left untouched —
--      NULLs are always distinct in a unique index, so rows with
--      user_id = NULL never conflict with anything.
--   2. Different users can each have a study set named "Physics" without
--      conflicting — the user_id column distinguishes them.
--   3. The same user cannot have two study sets named "Physics".
--
-- IF existing duplicate (user_id, name) rows already exist in the table
-- this migration will fail safely with a unique-violation error rather
-- than silently deleting or renaming data.  Resolve any pre-existing
-- duplicates manually before re-running if that happens.

CREATE UNIQUE INDEX IF NOT EXISTS idx_study_sets_user_id_name
    ON study_sets (user_id, name)
    WHERE user_id IS NOT NULL;
