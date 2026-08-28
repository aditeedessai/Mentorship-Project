create table if not exists exams (
    id             uuid primary key default gen_random_uuid(),
    user_id        uuid not null references auth.users(id) on delete cascade,
    study_set_id   uuid references study_sets(study_set_id) on delete set null,
    subject        text not null,
    exam_type      text not null,
    exam_date      date not null,
    created_at     timestamptz not null default now(),
    updated_at     timestamptz not null default now()
);

create index if not exists idx_exams_user_id on exams(user_id);
create index if not exists idx_exams_exam_date on exams(exam_date);

alter table exams enable row level security;

create policy "Users can view their own exams"
    on exams for select
    using (auth.uid() = user_id);

create policy "Users can insert their own exams"
    on exams for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own exams"
    on exams for update
    using (auth.uid() = user_id);

create policy "Users can delete their own exams"
    on exams for delete
    using (auth.uid() = user_id);