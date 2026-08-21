-- Links study_sets to Supabase Auth users.
-- user_id is nullable (Option A) - the 2 existing study sets from
-- testing stay in place, ownerless. Every new study set going forward
-- should always have a real user_id set at creation time.

alter table study_sets
    add column if not exists user_id uuid references auth.users(id) on delete cascade;

create index if not exists idx_study_sets_user_id on study_sets(user_id);

-- Row Level Security: even though the FastAPI backend currently connects
-- with elevated (service-role) access and bypasses RLS entirely, enabling
-- it now is the correct safety net - if the frontend ever calls Supabase
-- directly with a user's own session token instead of going through the
-- backend, this becomes the ONLY thing stopping User A from seeing User
-- B's study sets. Cheap to enable now, painful to retrofit later.

alter table study_sets enable row level security;

-- A user can only see their own study sets.
create policy "Users can view their own study sets"
    on study_sets for select
    using (auth.uid() = user_id);

-- A user can only create study sets owned by themselves.
create policy "Users can insert their own study sets"
    on study_sets for insert
    with check (auth.uid() = user_id);

-- A user can only update their own study sets.
create policy "Users can update their own study sets"
    on study_sets for update
    using (auth.uid() = user_id);

-- A user can only delete their own study sets.
create policy "Users can delete their own study sets"
    on study_sets for delete
    using (auth.uid() = user_id);

-- NOTE: the 2 legacy ownerless study sets (user_id IS NULL) will be
-- invisible under these policies to any real user - auth.uid() = NULL
-- never evaluates true. They still exist in the table and remain
-- reachable via the backend's service-role connection (which bypasses
-- RLS entirely), just not visible to any individual logged-in user.
-- This is expected given Option A, not a bug.