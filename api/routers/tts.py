from fastapi import APIRouter, Depends
from fastapi.responses import Response
from models.schemas import TTSRequest
from services.openai_service import synthesize_speech
from services.auth import get_current_user

router = APIRouter(tags=["tts"])

VALID_VOICES = {"alloy", "echo", "fable", "onyx", "nova", "shimmer"}


@router.post("/tts")
async def text_to_speech(body: TTSRequest, current: dict = Depends(get_current_user)):
    voice = body.voice if body.voice in VALID_VOICES else "alloy"
    audio_bytes = await synthesize_speech(body.text, voice)
    return Response(content=audio_bytes, media_type="audio/mpeg")
