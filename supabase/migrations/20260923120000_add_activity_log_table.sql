-- Independent, append-only record of "the user studied on this date",
-- deliberately with no foreign key to study_sets/questions/evaluations.
-- The activity calendar previously derived "studied days" by joining
-- evaluations -> questions -> study_sets; deleting a study set cascade-
-- deleted its questions, which cascade-deleted their evaluations, which
-- silently erased those days from the calendar even though the student
-- genuinely studied then. This table is written once per user per day
-- (see backend/database/activity_log_repository.py) and is never
-- affected by a study set, question, or evaluation being deleted later.
create table if not exists public.activity_log (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null,
    activity_date date not null,
    created_at timestamptz not null default now(),
    unique (user_id, activity_date)
);

create index if not exists activity_log_user_id_idx
    on public.activity_log(user_id);

create index if not exists activity_log_user_date_idx
    on public.activity_log(user_id, activity_date);

alter table public.activity_log enable row level security;

-- One-time backfill: carry over every day of activity that's still
-- currently visible through the old evaluations->questions->study_sets
-- join, so existing users don't see their calendar go blank the moment
-- this table starts being used. Days already lost to a prior study-set
-- deletion can't be recovered - this only captures what's still here.
insert into public.activity_log (user_id, activity_date)
select distinct qa.user_id, date(e.created_at) as activity_date
from evaluations e
join quiz_attempts qa on qa.attempt_id = e.attempt_id
where qa.user_id is not null
on conflict (user_id, activity_date) do nothing;
