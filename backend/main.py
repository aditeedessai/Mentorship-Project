from fastapi import FastAPI

from routes.upload_routes import router as upload_router
from routes.quiz_routes import router as quiz_router
from routes.evaluate_routes import router as evaluate_router
from config import PROJECT_NAME, PROJECT_VERSION

app = FastAPI(
    title=PROJECT_NAME,
    version=PROJECT_VERSION
)

app.include_router(upload_router)
app.include_router(quiz_router)
app.include_router(evaluate_router)

@app.get("/")
def root():
    return {
        "message": "Mentorship Project Backend is Running"
    }