create table if not exists revision_schedules (
    id                uuid primary key default gen_random_uuid(),
    user_id           uuid not null references auth.users(id) on delete cascade,
    study_set_id      uuid not null references study_sets(study_set_id) on delete cascade,
    question_type     text not null check (question_type in ('mcq', 'application', 'long', 'short')),
    attempts_taken    int not null default 0 check (attempts_taken >= 0 and attempts_taken <= 4),
    last_attempt_id   text references quiz_attempts(attempt_id) on delete set null,
    last_accuracy     numeric,
    last_attempt_at   timestamptz,
    needs_attention   boolean not null default false,
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now(),
    unique (study_set_id, question_type)
);

create index if not exists idx_revision_schedules_user_id on revision_schedules(user_id);
create index if not exists idx_revision_schedules_study_set_id on revision_schedules(study_set_id);

alter table revision_schedules enable row level security;

create policy "Users can view their own revision schedules"
    on revision_schedules for select using (auth.uid() = user_id);
create policy "Users can insert their own revision schedules"
    on revision_schedules for insert with check (auth.uid() = user_id);
create policy "Users can update their own revision schedules"
    on revision_schedules for update using (auth.uid() = user_id);
create policy "Users can delete their own revision schedules"
    on revision_schedules for delete using (auth.uid() = user_id);