from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import router
from api.database import engine, Base
import api.db_models

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Government Scheme Matchmaker API",
    description="RAG-based API that matches farmers to government schemes based on their profile.",
    version="1.0.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1")


@app.get("/")
def root():
    return {
        "message": "Government Scheme Matchmaker API is running.",
        "docs": "/docs",
    }
