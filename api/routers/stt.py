from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from models.schemas import STTResponse
from services.openai_service import transcribe_audio
from services.auth import get_current_user

router = APIRouter(tags=["stt"])


@router.post("/stt", response_model=STTResponse)
async def speech_to_text(audio: UploadFile = File(...), current: dict = Depends(get_current_user)):
    if not audio.content_type or not audio.content_type.startswith("audio"):
        raise HTTPException(status_code=400, detail="Audio file required")
    audio_bytes = await audio.read()
    text = await transcribe_audio(audio_bytes, audio.filename or "audio.webm")
    return STTResponse(text=text)
