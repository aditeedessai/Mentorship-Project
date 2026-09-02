create or replace view attempt_section_scores as
select
    qa.attempt_id,
    qa.user_id,
    qa.study_set_id,
    q.question_type,
    sum(e.marks_awarded) as marks_awarded,
    sum(coalesce(q.marks, case when q.question_type = 'mcq' then 2.0 else 10.0 end)) as total_marks,
    round(
        sum(e.marks_awarded)
        / nullif(sum(coalesce(q.marks, case when q.question_type = 'mcq' then 2.0 else 10.0 end)), 0)
        * 100.0,
        2
    ) as accuracy_percentage,
    max(e.created_at) as last_evaluated_at
from evaluations e
join questions q on q.question_id = e.question_id
join quiz_attempts qa on qa.attempt_id = e.attempt_id
group by qa.attempt_id, qa.user_id, qa.study_set_id, q.question_type;