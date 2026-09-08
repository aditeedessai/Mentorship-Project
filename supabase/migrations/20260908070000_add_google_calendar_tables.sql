-- Google Calendar integration tables

-- Stores OAuth connection info per user
create table if not exists google_calendar_connections (
    id                       uuid primary key default gen_random_uuid(),
    user_id                  uuid not null unique references auth.users(id) on delete cascade,
    google_email             text,
    encrypted_refresh_token  text not null default '',
    access_token             text,
    token_expiry             timestamptz,
    is_active                boolean not null default true,
    created_at               timestamptz not null default now(),
    updated_at               timestamptz not null default now()
);

create index if not exists idx_gcal_connections_user_id on google_calendar_connections(user_id);

alter table google_calendar_connections enable row level security;

create policy "Users can view their own gcal connection"
    on google_calendar_connections for select using (auth.uid() = user_id);
create policy "Users can insert their own gcal connection"
    on google_calendar_connections for insert with check (auth.uid() = user_id);
create policy "Users can update their own gcal connection"
    on google_calendar_connections for update using (auth.uid() = user_id);
create policy "Users can delete their own gcal connection"
    on google_calendar_connections for delete using (auth.uid() = user_id);

-- Maps Jot entities (tasks/exams) to Google Calendar event IDs
create table if not exists google_calendar_events (
    id                uuid primary key default gen_random_uuid(),
    user_id           uuid not null references auth.users(id) on delete cascade,
    entity_type       text not null check (entity_type in ('task', 'exam')),
    entity_id         uuid not null,
    google_event_id   text not null,
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now(),
    unique (user_id, entity_type, entity_id)
);

create index if not exists idx_gcal_events_user_id on google_calendar_events(user_id);
create index if not exists idx_gcal_events_entity on google_calendar_events(entity_type, entity_id);

alter table google_calendar_events enable row level security;

create policy "Users can view their own gcal events"
    on google_calendar_events for select using (auth.uid() = user_id);
create policy "Users can insert their own gcal events"
    on google_calendar_events for insert with check (auth.uid() = user_id);
create policy "Users can update their own gcal events"
    on google_calendar_events for update using (auth.uid() = user_id);
create policy "Users can delete their own gcal events"
    on google_calendar_events for delete using (auth.uid() = user_id);
