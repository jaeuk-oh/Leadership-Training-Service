import json
import os
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from openai import AsyncOpenAI
from models.schemas import ChatRequest, GrowStage, SessionStartRequest
from services.supabase_client import get_supabase
from services.rag import build_persona_context
from services.grow_engine import build_system_prompt, TRUST_EVALUATION_PROMPT

router = APIRouter(tags=["chat"])
openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))


async def _evaluate_trust_delta(coach_message: str, stage: GrowStage) -> float:
    try:
        response = await openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": TRUST_EVALUATION_PROMPT},
                {"role": "user", "content": f"GROW 단계: {stage.value}\n코치 메시지: {coach_message}"},
            ],
            max_tokens=10,
            temperature=0,
        )
        return float(response.choices[0].message.content.strip())
    except Exception:
        return 0.0


@router.post("/chat")
async def chat(body: ChatRequest):
    sb = get_supabase()

    # 세션 및 페르소나 확인
    session_result = sb.table("coaching_sessions")\
        .select("*, personas(name, profile)")\
        .eq("id", body.session_id)\
        .single()\
        .execute()
    if not session_result.data:
        raise HTTPException(status_code=404, detail="Session not found")

    session = session_result.data
    persona_name = session["personas"]["name"]
    current_trust = session.get("trust_score", 0.0)

    # RAG 컨텍스트 검색
    rag_context = await build_persona_context(body.message, body.persona_id)

    # 시스템 프롬프트 구성
    system_prompt = build_system_prompt(
        persona_name=persona_name,
        rag_context=rag_context,
        grow_stage=body.grow_stage,
        trust_score=current_trust,
    )

    # 메시지 히스토리 구성
    messages = [{"role": "system", "content": system_prompt}]
    for msg in body.history[-10:]:  # 최근 10턴
        messages.append({"role": msg.role, "content": msg.content})

    # 세션 시작 인사 트리거: 피코치자가 먼저 대화를 시작
    if body.message == "__GREETING__":
        messages.append({
            "role": "user",
            "content": "코칭 세션을 시작해주세요. 피코치자로서 자연스럽게 자기소개와 함께 현재 고민이나 상황을 먼저 꺼내주세요.",
        })
    else:
        messages.append({"role": "user", "content": body.message})

    # 신뢰도 평가 (비동기 병렬, 인사 트리거는 평가 제외)
    import asyncio
    if body.message == "__GREETING__":
        async def _zero(): return 0.0
        trust_delta_task = asyncio.create_task(_zero())
    else:
        trust_delta_task = asyncio.create_task(
            _evaluate_trust_delta(body.message, body.grow_stage)
        )

    # 사용자 메시지 저장 (인사 트리거는 저장 제외)
    if body.message != "__GREETING__":
        sb.table("messages").insert({
            "session_id": body.session_id,
            "role": "user",
            "content": body.message,
            "grow_stage": body.grow_stage.value,
        }).execute()

    async def generate():
        full_response = ""
        stream = await openai_client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            temperature=0.8,
            max_tokens=512,
            stream=True,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta.content if chunk.choices else None
            if delta:
                full_response += delta
                yield f"data: {json.dumps({'content': delta})}\n\n"

        # 응답 저장 및 신뢰도 업데이트
        trust_delta = await trust_delta_task
        new_trust = max(0.0, min(10.0, current_trust + trust_delta))

        sb.table("messages").insert({
            "session_id": body.session_id,
            "role": "assistant",
            "content": full_response,
            "grow_stage": body.grow_stage.value,
            "trust_delta": trust_delta,
        }).execute()

        sb.table("coaching_sessions").update({
            "trust_score": new_trust,
            "current_stage": body.grow_stage.value,
        }).eq("id", body.session_id).execute()

        yield f"data: {json.dumps({'trust_score': new_trust, 'trust_delta': trust_delta, 'done': True})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@router.post("/session/start")
async def start_session(body: SessionStartRequest):
    persona_id, user_id = body.persona_id, body.user_id
    sb = get_supabase()
    result = sb.table("coaching_sessions").insert({
        "user_id": user_id,
        "persona_id": persona_id,
        "current_stage": "goal",
        "trust_score": 0.0,
        "status": "active",
    }).execute()
    return result.data[0]


@router.post("/session/{session_id}/end")
async def end_session(session_id: str):
    sb = get_supabase()
    from datetime import datetime, timezone
    result = sb.table("coaching_sessions").update({
        "status": "completed",
        "ended_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", session_id).execute()
    return result.data[0]
