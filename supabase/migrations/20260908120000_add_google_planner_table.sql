-- Stores each user's linked Google account for planner sync (e.g. Google
-- Calendar). One row per user (user_id is UNIQUE below) - this is a
-- connection record, not a log of multiple linkings.

create table if not exists google_planner_table (
    id                          uuid primary key default gen_random_uuid(),
    user_id                     uuid not null unique references auth.users(id) on delete cascade,
    google_email                text not null,
    encrypted_refresh_token     text not null,
    access_token                text,
    token_expiry                timestamptz,
    is_active                   boolean not null default true,
    created_at                  timestamptz not null default now(),
    updated_at                  timestamptz not null default now()
);

create index if not exists idx_google_planner_table_user_id on google_planner_table(user_id);

alter table google_planner_table enable row level security;

create policy "Users can view their own google planner connection"
    on google_planner_table for select
    using (auth.uid() = user_id);

create policy "Users can insert their own google planner connection"
    on google_planner_table for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own google planner connection"
    on google_planner_table for update
    using (auth.uid() = user_id);

create policy "Users can delete their own google planner connection"
    on google_planner_table for delete
    using (auth.uid() = user_id);
