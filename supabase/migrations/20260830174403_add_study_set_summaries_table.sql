-- Stores the AI-generated summary for a study set, matching
-- StudySetSummaryCard.jsx's exact expected shape: title,
-- overview_paragraphs (array of short paragraph strings), and
-- key_takeaways (array of short strings).
--
-- One row per study set (unique constraint below) - "Regenerate Summary"
-- overwrites the existing row rather than keeping history, matching the
-- card's existing regenerate-in-place UX.

create table if not exists study_set_summaries (
    id                    uuid primary key default gen_random_uuid(),
    study_set_id          uuid not null references study_sets(study_set_id) on delete cascade,
    user_id               uuid not null references auth.users(id) on delete cascade,
    title                 text,
    overview_paragraphs   jsonb not null default '[]'::jsonb,
    key_takeaways         jsonb not null default '[]'::jsonb,
    created_at            timestamptz not null default now(),
    updated_at            timestamptz not null default now(),
    unique (study_set_id)
);

create index if not exists idx_study_set_summaries_study_set_id on study_set_summaries(study_set_id);
create index if not exists idx_study_set_summaries_user_id on study_set_summaries(user_id);

alter table study_set_summaries enable row level security;

create policy "Users can view their own summaries"
    on study_set_summaries for select
    using (auth.uid() = user_id);

create policy "Users can insert their own summaries"
    on study_set_summaries for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own summaries"
    on study_set_summaries for update
    using (auth.uid() = user_id);

create policy "Users can delete their own summaries"
    on study_set_summaries for delete
    using (auth.uid() = user_id);