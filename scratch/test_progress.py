import sys
import os

# Add workspace to path
sys.path.insert(0, r"c:\Users\adi\Documents\PROJECTS\Mentorship-Project")

from backend.services.progress_service import get_study_set_attempt_history, CANONICAL_QUESTION_TYPES

print("Canonical question types:", CANONICAL_QUESTION_TYPES)

# Test with non-existent study set
res = get_study_set_attempt_history("user-test", "non-existent-id")
print("Non existent study set result:", res)

print("Progress service imported and tested successfully!")
