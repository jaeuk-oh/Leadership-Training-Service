from .openai_service import get_embedding
from .supabase_client import get_supabase


async def search_persona_context(
    query: str,
    persona_id: str,
    match_count: int = 5,
    match_threshold: float = 0.65,
) -> list[dict]:
    """벡터 유사도 검색으로 페르소나 관련 문서 반환"""
    embedding = await get_embedding(query)
    sb = get_supabase()
    result = sb.rpc(
        "match_persona_documents",
        {
            "query_embedding": embedding,
            "persona_id_filter": persona_id,
            "match_count": match_count,
            "match_threshold": match_threshold,
        },
    ).execute()
    return result.data or []


async def build_persona_context(
    query: str,
    persona_id: str,
) -> str:
    """RAG 검색 결과를 시스템 프롬프트용 텍스트로 조합"""
    docs = await search_persona_context(query, persona_id)
    if not docs:
        return ""

    sections: dict[str, list[str]] = {}
    for doc in docs:
        cat = doc.get("category", "general")
        sections.setdefault(cat, []).append(doc["content"])

    parts = []
    category_labels = {
        "profile": "## 기본 프로필",
        "speech": "## 말투/어조",
        "situation": "## 업무 상황",
        "psychology": "## 심리 상태",
        "reaction": "## 대화 반응 패턴",
        "story": "## 배경 스토리",
    }
    for cat, label in category_labels.items():
        if cat in sections:
            parts.append(label)
            parts.extend(sections[cat])

    return "\n".join(parts)


async def embed_persona_documents(persona_id: str) -> int:
    """페르소나 문서 임베딩 생성 및 저장"""
    sb = get_supabase()
    docs_result = sb.table("persona_documents")\
        .select("id, content")\
        .eq("persona_id", persona_id)\
        .is_("embedding", "null")\
        .execute()

    docs = docs_result.data or []
    count = 0
    for doc in docs:
        embedding = await get_embedding(doc["content"])
        sb.table("persona_documents")\
            .update({"embedding": embedding})\
            .eq("id", doc["id"])\
            .execute()
        count += 1
    return count
