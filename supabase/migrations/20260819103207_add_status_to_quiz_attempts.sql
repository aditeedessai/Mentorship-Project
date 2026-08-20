alter table quiz_attempts
    add column if not exists status text not null default 'in_progress';

alter table quiz_attempts
    add constraint quiz_attempts_status_check
    check (status in ('in_progress', 'completed'));