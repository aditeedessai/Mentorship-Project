create table if not exists public.audit_logs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid,
    action text not null,
    created_at timestamptz not null default now()
);

create index if not exists audit_logs_user_id_idx
    on public.audit_logs(user_id);

create index if not exists audit_logs_created_at_idx
    on public.audit_logs(created_at);

alter table public.audit_logs enable row level security;