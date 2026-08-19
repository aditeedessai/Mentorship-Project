from datetime import datetime, timezone

from backend.api.schemas.question import QuestionListResponse, QuestionResponse, QuestionType
from backend.mock_data.documents import DOC_1_ID, DOC_2_ID, DOC_3_ID
from backend.mock_data.study_sets import STUDY_SET_1_ID, STUDY_SET_2_ID

MOCK_QUESTIONS: list[QuestionResponse] = [
    # MCQ
    QuestionResponse(
        question_id="question-001",
        study_set_id=STUDY_SET_1_ID,
        document_id=DOC_1_ID,
        question_type=QuestionType.MCQ,
        topic="process_scheduling",
        question="Which CPU scheduling algorithm minimizes the average waiting time for a given set of processes?",
        options={
            "A": "First-Come, First-Served (FCFS)",
            "B": "Shortest Job First (SJF)",
            "C": "Round Robin (RR) with time quantum = 10ms",
            "D": "Priority Scheduling (non-preemptive)",
        },
        marks=2.0,
        created_at=datetime(2026, 8, 15, 10, 30, 0, tzinfo=timezone.utc),
    ),
    QuestionResponse(
        question_id="question-002",
        study_set_id=STUDY_SET_2_ID,
        document_id=DOC_3_ID,
        question_type=QuestionType.MCQ,
        topic="transport_layer",
        question="Which TCP header field is primarily responsible for ensuring reliable, in-order packet delivery?",
        options={
            "A": "Sequence Number",
            "B": "Window Size",
            "C": "Checksum",
            "D": "Urgent Pointer",
        },
        marks=2.0,
        created_at=datetime(2026, 8, 16, 11, 30, 0, tzinfo=timezone.utc),
    ),
    # APPLICATION
    QuestionResponse(
        question_id="question-003",
        study_set_id=STUDY_SET_1_ID,
        document_id=DOC_1_ID,
        question_type=QuestionType.APPLICATION,
        topic="deadlock_prevention",
        question="A multi-threaded web server encounters a deadlock scenario when two worker threads request mutexes A and B in reverse order. Propose a deadlock prevention strategy using resource ordering and demonstrate its effectiveness.",
        options=None,
        marks=10.0,
        created_at=datetime(2026, 8, 15, 10, 32, 0, tzinfo=timezone.utc),
    ),
    # LONG
    QuestionResponse(
        question_id="question-004",
        study_set_id=STUDY_SET_1_ID,
        document_id=DOC_2_ID,
        question_type=QuestionType.LONG,
        topic="virtual_memory",
        question="Explain the end-to-end mechanism of page fault handling in a virtual memory system. Trace the steps from CPU address translation fault to page swap-in from disk.",
        options=None,
        marks=10.0,
        created_at=datetime(2026, 8, 15, 10, 33, 0, tzinfo=timezone.utc),
    ),
    # SHORT
    QuestionResponse(
        question_id="question-005",
        study_set_id=STUDY_SET_1_ID,
        document_id=DOC_2_ID,
        question_type=QuestionType.SHORT,
        topic="concurrency",
        question="What is the key difference between a counting semaphore and a binary mutex?",
        options=None,
        marks=5.0,
        created_at=datetime(2026, 8, 15, 10, 34, 0, tzinfo=timezone.utc),
    ),
]

MOCK_QUESTION_LIST = QuestionListResponse(questions=MOCK_QUESTIONS)
