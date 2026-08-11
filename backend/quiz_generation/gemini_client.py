import os
from pathlib import Path
from dotenv import load_dotenv
from google import genai

BACKEND_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_DIR / ".env")

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError(
        "GEMINI_API_KEY not found. Create backend/.env from backend/.env.example."
    )

client = genai.Client(api_key=api_key)
