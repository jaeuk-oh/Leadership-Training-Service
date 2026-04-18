from fastapi import APIRouter, HTTPException
from models.schemas import PersonaCreate, EmbedRequest
from services.supabase_client import get_supabase
from services.rag import embed_persona_documents
from services.openai_service import get_embedding

router = APIRouter(tags=["persona"])

CATEGORY_KEYS = {
    "profile": ["gender", "age_group", "rank", "job_type", "tenure_years", "mbti"],
    "speech": ["politeness_level", "common_expressions", "emotion_patterns", "speech_habits"],
    "situation": ["work_concerns", "team_conflicts", "performance_issues", "career_concerns"],
    "psychology": ["stress_level", "motivation_level", "coaching_attitude"],
    "reaction": ["grow_stage_reactions", "emotion_change_scenarios", "resistance_points"],
    "story": ["past_experiences", "values", "work_episodes"],
}


def _build_category_content(profile: dict, category: str, keys: list[str]) -> str:
    lines = [f"[{category.upper()}]"]
    for key in keys:
        val = profile.get(key)
        if val is not None and val != "" and val != [] and val != {}:
            lines.append(f"{key}: {val}")
    return "\n".join(lines)


@router.get("/personas")
async def list_personas():
    sb = get_supabase()
    result = sb.table("personas").select("*").eq("is_preset", True).execute()
    return result.data


@router.post("/personas")
async def create_persona(body: PersonaCreate):
    sb = get_supabase()
    profile_dict = body.profile.model_dump()

    persona_result = sb.table("personas").insert({
        "name": body.name,
        "description": body.description,
        "difficulty": body.difficulty.value,
        "profile": profile_dict,
        "is_preset": body.is_preset,
    }).execute()

    persona = persona_result.data[0]
    persona_id = persona["id"]

    # 카테고리별 문서 생성
    docs = []
    for category, keys in CATEGORY_KEYS.items():
        content = _build_category_content(profile_dict, category, keys)
        if content.count("\n") > 0:  # 헤더 외 내용이 있을 때만
            docs.append({
                "persona_id": persona_id,
                "category": category,
                "content": content,
            })

    if docs:
        sb.table("persona_documents").insert(docs).execute()
        await embed_persona_documents(persona_id)

    return persona


@router.post("/persona/embed")
async def embed_persona(body: EmbedRequest):
    count = await embed_persona_documents(body.persona_id)
    return {"embedded": count}


@router.get("/personas/{persona_id}")
async def get_persona(persona_id: str):
    sb = get_supabase()
    result = sb.table("personas").select("*").eq("id", persona_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Persona not found")
    return result.data
