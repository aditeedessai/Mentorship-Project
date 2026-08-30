-- Stores AI-generated flashcards for a study set. Standard front/back
-- format assumed here - CONFIRM this matches StudySetFlashcardsCard.jsx's
-- actual expected field names before relying on this schema (that file's
-- content wasn't available when this was written; Claude Code should
-- verify by reading the real component).
--
-- Multiple rows per study set (a set naturally has many cards), unlike
-- study_set_summaries. "Regenerate" should delete existing cards for
-- that study_set_id and insert fresh ones, not append - same
-- delete-then-insert pattern already used elsewhere in this project
-- (see quiz_repository.py's question_sources handling).

create table if not exists flashcards (
    id             uuid primary key default gen_random_uuid(),
    study_set_id   uuid not null references study_sets(study_set_id) on delete cascade,
    user_id        uuid not null references auth.users(id) on delete cascade,
    front          text not null,
    back           text not null,
    card_order     int not null default 0,
    created_at     timestamptz not null default now()
);

create index if not exists idx_flashcards_study_set_id on flashcards(study_set_id);
create index if not exists idx_flashcards_user_id on flashcards(user_id);

alter table flashcards enable row level security;

create policy "Users can view their own flashcards"
    on flashcards for select
    using (auth.uid() = user_id);

create policy "Users can insert their own flashcards"
    on flashcards for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own flashcards"
    on flashcards for update
    using (auth.uid() = user_id);

create policy "Users can delete their own flashcards"
    on flashcards for delete
    using (auth.uid() = user_id);