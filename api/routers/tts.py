from fastapi import APIRouter
from fastapi.responses import Response
from models.schemas import TTSRequest
from services.openai_service import synthesize_speech

router = APIRouter(tags=["tts"])

VALID_VOICES = {"alloy", "echo", "fable", "onyx", "nova", "shimmer"}


@router.post("/tts")
async def text_to_speech(body: TTSRequest):
    voice = body.voice if body.voice in VALID_VOICES else "alloy"
    audio_bytes = await synthesize_speech(body.text, voice)
    return Response(content=audio_bytes, media_type="audio/mpeg")
