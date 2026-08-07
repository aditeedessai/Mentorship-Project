from fastapi import FastAPI

from backend.quiz_generation.routes import router

app = FastAPI()

app.include_router(router)