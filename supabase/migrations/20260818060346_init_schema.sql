-- ============================================================
-- Supabase / Postgres schema for the study-quiz app
-- Translated from backend/database/database.py (SQLite)
-- + replaces ChromaDB ("course_material" collection) with a
--   pgvector-backed document_chunks table.
-- Run this in the Supabase SQL editor (or via `supabase db push`).
-- ============================================================

-- Extensions ---------------------------------------------------
create extension if not exists vector;    -- pgvector
create extension if not exists pgcrypto;  -- for gen_random_uuid()

-- ============================================================
-- study_sets  (was: study_sets)
-- ============================================================
create table if not exists study_sets (
    study_set_id  uuid primary key default gen_random_uuid(),
    name          text not null,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);

-- ============================================================
-- documents  (was: documents)
-- ============================================================
create table if not exists documents (
    document_id   uuid primary key default gen_random_uuid(),
    study_set_id  uuid not null references study_sets(study_set_id) on delete cascade,
    file_path     text not null,
    file_name     text not null,
    created_at    timestamptz not null default now()
);

create index if not exists idx_documents_study_set_id on documents(study_set_id);

-- ============================================================
-- document_chunks  (NEW — replaces the ChromaDB "course_material"
-- collection entirely. embedding dim MUST match whatever
-- generate_embeddings() actually produces — currently
-- all-MiniLM-L6-v2 = 384. Confirm with the team before running.)
-- ============================================================
create table if not exists document_chunks (
    chunk_id      uuid primary key default gen_random_uuid(),
    document_id   uuid not null references documents(document_id) on delete cascade,
    study_set_id  uuid references study_sets(study_set_id) on delete cascade,
    chunk_number  int not null,
    content       text not null,
    embedding     vector(384),   -- <-- confirm dimension before running
    created_at    timestamptz not null default now()
);

create index if not exists idx_chunks_document_id on document_chunks(document_id);
create index if not exists idx_chunks_study_set_id on document_chunks(study_set_id);

-- ANN index for similarity search (cosine, matching sentence-transformers
-- default). ivfflat needs data in the table before it's useful, so this
-- can be created empty and rebuilt once real data is loaded, or swapped
-- for `hnsw` if your Postgres/pgvector version supports it.
create index if not exists idx_chunks_embedding
    on document_chunks using ivfflat (embedding vector_cosine_ops)
    with (lists = 100);

-- ============================================================
-- questions  (was: questions)
-- NOTE: question_id is now UNIQUE — required so evaluations/
-- question_sources can properly foreign-key to it. SQLite never
-- enforced this even though the app already treats it as unique
-- (uuid4 generated per question).
-- ============================================================
create table if not exists questions (
    id                   bigint generated always as identity primary key,
    question_id          text not null unique,
    document_id          uuid references documents(document_id) on delete set null,
    study_set_id         uuid references study_sets(study_set_id) on delete cascade,
    question_type        text not null check (question_type in ('mcq','application','long','short')),
    topic                text default 'general',
    question             text not null,
    reference_answer     text not null,
    options              jsonb,
    correct_option       text,
    source_document_ids  jsonb,
    source_chunk_ids     jsonb,
    marks                numeric not null default 10.0,
    created_at           timestamptz not null default now()
);

create index if not exists idx_questions_document_id on questions(document_id);
create index if not exists idx_questions_study_set_id on questions(study_set_id);

-- ============================================================
-- question_sources  (was: question_sources)
-- ============================================================
create table if not exists question_sources (
    id           bigint generated always as identity primary key,
    question_id  text not null references questions(question_id) on delete cascade,
    document_id  uuid not null references documents(document_id) on delete cascade,
    chunk_id     uuid references document_chunks(chunk_id) on delete set null
);

create index if not exists idx_qsources_question_id on question_sources(question_id);
create index if not exists idx_qsources_document_id on question_sources(document_id);
create index if not exists idx_qsources_chunk_id on question_sources(chunk_id);

-- ============================================================
-- quiz_attempts  (was: quiz_attempts)
-- ============================================================
create table if not exists quiz_attempts (
    attempt_id     text primary key,   -- app-generated uuid4 hex, kept as-is
    document_id    uuid references documents(document_id) on delete set null,
    study_set_id   uuid references study_sets(study_set_id) on delete set null,
    total_marks    numeric not null default 0,
    marks_awarded  numeric not null default 0,
    created_at     timestamptz not null default now(),
    updated_at     timestamptz not null default now()
);

create index if not exists idx_attempts_study_set_id on quiz_attempts(study_set_id);

-- ============================================================
-- evaluations  (was: evaluations)
-- ============================================================
create table if not exists evaluations (
    id                bigint generated always as identity primary key,
    attempt_id        text references quiz_attempts(attempt_id) on delete cascade,
    question_id       text not null references questions(question_id) on delete cascade,
    student_answer    text not null,
    semantic_score    numeric,
    concept_score     numeric,
    final_score       numeric not null,
    marks_awarded     numeric not null,
    matched_concepts  jsonb,
    missed_concepts   jsonb,
    created_at        timestamptz not null default now()
);

create index if not exists idx_evaluations_attempt_id on evaluations(attempt_id);
create index if not exists idx_evaluations_question_id on evaluations(question_id);