import os
from openai import AsyncOpenAI

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))


async def get_embedding(text: str) -> list[float]:
    response = await client.embeddings.create(
        model="text-embedding-3-small",
        input=text,
    )
    return response.data[0].embedding


async def transcribe_audio(audio_bytes: bytes, filename: str = "audio.webm") -> str:
    import io
    audio_file = io.BytesIO(audio_bytes)
    audio_file.name = filename
    transcript = await client.audio.transcriptions.create(
        model="whisper-1",
        file=audio_file,
        language="ko",
    )
    return transcript.text


async def synthesize_speech(text: str, voice: str = "alloy") -> bytes:
    response = await client.audio.speech.create(
        model="tts-1",
        voice=voice,
        input=text,
    )
    return response.content
