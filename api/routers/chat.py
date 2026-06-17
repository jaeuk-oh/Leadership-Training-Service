import json
import os
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from openai import AsyncOpenAI
from models.schemas import ChatRequest, GrowStage, SessionStartRequest
from services.supabase_client import get_supabase
from services.rag import build_persona_context
from services.grow_engine import build_system_prompt, TRUST_EVALUATION_PROMPT
from services.auth import get_current_user
from services.limits import (
    MAX_PERSONAS,
    MAX_SESSIONS_PER_PERSONA,
    MAX_TURNS_PER_SESSION,
)

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
async def chat(body: ChatRequest, current: dict = Depends(get_current_user)):
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

    # 본인 세션만 접근 가능 (관리자 예외)
    if not current["is_admin"] and session.get("user_id") != current["user_id"]:
        raise HTTPException(status_code=403, detail="본인의 세션만 접근할 수 있습니다.")

    # 대화 턴 제한 (인사 트리거는 저장되지 않으므로 카운트 제외)
    if not current["is_admin"] and body.message != "__GREETING__":
        turn_result = sb.table("messages")\
            .select("id", count="exact")\
            .eq("session_id", body.session_id)\
            .eq("role", "user")\
            .execute()
        if (turn_result.count or 0) >= MAX_TURNS_PER_SESSION:
            raise HTTPException(
                status_code=403,
                detail=f"이 세션의 대화 턴({MAX_TURNS_PER_SESSION}회)을 모두 사용했습니다.",
            )

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
async def start_session(body: SessionStartRequest, current: dict = Depends(get_current_user)):
    persona_id = body.persona_id
    user_id = current["user_id"]  # 본문 user_id는 신뢰하지 않고 토큰에서 추출
    sb = get_supabase()

    # 일반 회원 사용 제한 (관리자는 무제한)
    if not current["is_admin"]:
        existing = sb.table("coaching_sessions")\
            .select("persona_id")\
            .eq("user_id", user_id)\
            .execute()
        rows = existing.data or []

        # 페르소나당 세션 수 제한
        per_persona = sum(1 for r in rows if r["persona_id"] == persona_id)
        if per_persona >= MAX_SESSIONS_PER_PERSONA:
            raise HTTPException(
                status_code=403,
                detail=f"이 페르소나는 최대 {MAX_SESSIONS_PER_PERSONA}회까지 연습할 수 있습니다.",
            )

        # 사용 가능한 페르소나 종류 수 제한
        used_personas = {r["persona_id"] for r in rows}
        if persona_id not in used_personas and len(used_personas) >= MAX_PERSONAS:
            raise HTTPException(
                status_code=403,
                detail=f"최대 {MAX_PERSONAS}개 페르소나까지 사용할 수 있습니다.",
            )

    result = sb.table("coaching_sessions").insert({
        "user_id": user_id,
        "persona_id": persona_id,
        "current_stage": "goal",
        "trust_score": 0.0,
        "status": "active",
    }).execute()
    return result.data[0]


@router.post("/session/{session_id}/end")
async def end_session(session_id: str, current: dict = Depends(get_current_user)):
    sb = get_supabase()
    from datetime import datetime, timezone

    # 본인 세션만 종료 가능 (관리자 예외)
    if not current["is_admin"]:
        owner = sb.table("coaching_sessions")\
            .select("user_id")\
            .eq("id", session_id)\
            .single()\
            .execute()
        if not owner.data or owner.data.get("user_id") != current["user_id"]:
            raise HTTPException(status_code=403, detail="본인의 세션만 종료할 수 있습니다.")

    result = sb.table("coaching_sessions").update({
        "status": "completed",
        "ended_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", session_id).execute()
    return result.data[0]
