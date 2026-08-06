import os
from dotenv import load_dotenv

# Load variables from .env
load_dotenv()

# Project Information
PROJECT_NAME = os.getenv("PROJECT_NAME", "Mentorship Project API")
PROJECT_VERSION = os.getenv("PROJECT_VERSION", "1.0.0")

# Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Uploads
UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "uploads")

# ChromaDB
CHROMA_DB_PATH = os.getenv("CHROMA_DB_PATH", "chroma_db")