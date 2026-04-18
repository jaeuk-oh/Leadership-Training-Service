from fastapi import APIRouter, UploadFile, File, HTTPException
from models.schemas import STTResponse
from services.openai_service import transcribe_audio

router = APIRouter(tags=["stt"])


@router.post("/stt", response_model=STTResponse)
async def speech_to_text(audio: UploadFile = File(...)):
    if not audio.content_type or not audio.content_type.startswith("audio"):
        raise HTTPException(status_code=400, detail="Audio file required")
    audio_bytes = await audio.read()
    text = await transcribe_audio(audio_bytes, audio.filename or "audio.webm")
    return STTResponse(text=text)
