from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

from routers import chat, persona, stt, tts, evaluation

app = FastAPI(title="GROW Coaching API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router, prefix="/api")
app.include_router(persona.router, prefix="/api")
app.include_router(stt.router, prefix="/api")
app.include_router(tts.router, prefix="/api")
app.include_router(evaluation.router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok"}
