import os
from pathlib import Path
from dotenv import dotenv_values, load_dotenv
from google import genai

BACKEND_DIR = Path(__file__).resolve().parents[1]
_ENV_PATH = BACKEND_DIR / ".env"
load_dotenv(_ENV_PATH)

# backend/.env WINS over a same-named variable already sitting in the shell /
# system environment. load_dotenv() alone never overrides an existing
# variable, so a stale GEMINI_API_KEY exported earlier would silently
# beat the new key you just pasted into .env.
_file_env = dotenv_values(_ENV_PATH) if _ENV_PATH.exists() else {}

api_key = _file_env.get("GEMINI_API_KEY") or os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError(
        "GEMINI_API_KEY not found. Create backend/.env from backend/.env.example."
    )

# Single source of truth for the model used by quiz / summary / flashcard /
# mnemonic generation. Change it in backend/.env (GEMINI_MODEL=...) instead
# of editing four Python files. (The answer-evaluation LLM judge has its own
# JUDGE_MODEL_NAME setting - see answer_evaluation/llm_judge.py.)
GEMINI_MODEL = (
    _file_env.get("GEMINI_MODEL")
    or os.getenv("GEMINI_MODEL")
    or "gemini-3.5-flash"
)

# Printed once at startup so you can always see which key/model this
# process actually loaded (the key is masked). Editing .env does NOT reach
# an already-running server - restart it after any .env change.
print(f"gemini_client: model={GEMINI_MODEL}, key=...{api_key[-4:]}")

client = genai.Client(api_key=api_key)
