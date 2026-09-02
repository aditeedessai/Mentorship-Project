-- Stores the student's education profile, collected once via a form
-- shown after signup. One row per user (user_id is UNIQUE below) -
-- this is a profile, not a log of multiple entries.

create table if not exists student_profiles (
    id                  uuid primary key default gen_random_uuid(),
    user_id             uuid not null unique references auth.users(id) on delete cascade,

    -- 1. Current level of study
    education_level     text not null
        check (education_level in (
            'primary', 'middle_school', 'high_school',
            'graduate', 'post_graduate', 'other'
        )),

    -- 2. Current Grade/Year of Study
    -- Kept as free text rather than an integer/enum - "Grade 8", "2nd Year",
    -- "Final Year" etc. all mean different things depending on
    -- education_level, so a fixed set of values would be awkward here.
    grade_or_year        text not null,

    -- 3. Field/Stream/Major
    -- Nullable - not everyone has one yet (e.g. a Primary/Middle School
    -- student typically wouldn't).
    field_stream          text,

    -- 4. Type of Curriculum (CBSE, ICSE, State Board, etc.)
    -- Free text, not a check-constrained enum - the real list of boards
    -- varies a lot and grows over time; validate the dropdown's actual
    -- option list at the frontend/form level instead of locking it into
    -- the schema.
    curriculum_type       text,

    -- 5. Preparing for any competitive exams
    -- A list, not a single value - a student can be preparing for more
    -- than one (e.g. JEE + NEET). Empty array means "not preparing for
    -- any" - no separate boolean needed. jsonb array of exam names,
    -- matching the same jsonb-array convention already used elsewhere
    -- in this schema (e.g. study_set_summaries.key_takeaways).
    competitive_exams     jsonb not null default '[]'::jsonb,

    created_at            timestamptz not null default now(),
    updated_at            timestamptz not null default now()
);

create index if not exists idx_student_profiles_user_id on student_profiles(user_id);

alter table student_profiles enable row level security;

create policy "Users can view their own profile"
    on student_profiles for select
    using (auth.uid() = user_id);

create policy "Users can insert their own profile"
    on student_profiles for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own profile"
    on student_profiles for update
    using (auth.uid() = user_id);

create policy "Users can delete their own profile"
    on student_profiles for delete
    using (auth.uid() = user_id);