alter table quiz_attempts
    add column if not exists attempt_kind text not null default 'initial';
alter table quiz_attempts
    add constraint quiz_attempts_attempt_kind_check
    check (attempt_kind in ('initial', 'revision'));

alter table quiz_attempts
    add column if not exists question_type text;
alter table quiz_attempts
    add constraint quiz_attempts_question_type_check
    check (question_type in ('mcq', 'application', 'long', 'short'));

alter table quiz_attempts
    add constraint quiz_attempts_kind_type_consistency
    check (
        (attempt_kind = 'initial'  and question_type is null)
        or
        (attempt_kind = 'revision' and question_type is not null)
    );