-- Allow the planner UI's task types (practice, revision, mock_test).
-- Previously the frontend offered these but the constraint only accepted
-- study/review/quiz/assignment/other, so those tasks were rejected and lost.
alter table tasks drop constraint if exists tasks_task_type_check;
alter table tasks add constraint tasks_task_type_check
    check (task_type in (
        'study', 'practice', 'revision', 'mock_test', 'assignment',
        'review', 'quiz', 'other'
    ));
