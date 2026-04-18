import json
import os
from fastapi import APIRouter, HTTPException
from openai import AsyncOpenAI
from models.schemas import EvaluationRequest
from services.supabase_client import get_supabase

router = APIRouter(tags=["evaluation"])
openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

EVALUATION_PROMPT = """당신은 GROW 코칭 전문가입니다. 아래 코칭 대화를 분석하여 4개 지표를 평가하세요.

평가 지표 (각 0-10점):
1. goal_clarity: 목표 명확화 능력 (SMART 목표로 이끄는 질문)
2. active_listening: 경청 및 공감 능력 (감정 반영, 요약, 공감 표현)
3. question_quality: 질문 수준 (열린 질문, 탐색적 질문, 강력한 질문)
4. commitment: 실행 의지 이끌기 (구체적 행동 계획, 책임감 부여)

JSON 형식으로만 응답하세요:
{"goal_clarity": 숫자, "active_listening": 숫자, "question_quality": 숫자, "commitment": 숫자, "comment": "개선 코멘트 2-3문장"}"""


@router.post("/evaluation")
async def evaluate_session(body: EvaluationRequest):
    sb = get_supabase()

    conversation_text = "\n".join([
        f"{'코치' if m.role == 'user' else '피코치자'}: {m.content}"
        for m in body.messages
    ])

    response = await openai_client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": EVALUATION_PROMPT},
            {"role": "user", "content": f"코칭 대화:\n{conversation_text}"},
        ],
        response_format={"type": "json_object"},
        temperature=0,
    )

    try:
        scores = json.loads(response.choices[0].message.content)
    except Exception:
        raise HTTPException(status_code=500, detail="Evaluation parsing failed")

    # 세션의 최종 신뢰도 조회
    session_result = sb.table("coaching_sessions")\
        .select("trust_score, user_id")\
        .eq("id", body.session_id)\
        .single()\
        .execute()
    trust_score = session_result.data.get("trust_score", 0) if session_result.data else 0
    user_id = session_result.data.get("user_id") if session_result.data else None

    eval_result = sb.table("evaluation_results").insert({
        "session_id": body.session_id,
        "user_id": user_id,
        "goal_clarity": scores.get("goal_clarity", 0),
        "active_listening": scores.get("active_listening", 0),
        "question_quality": scores.get("question_quality", 0),
        "commitment": scores.get("commitment", 0),
        "trust_score": trust_score,
        "gpt_comment": scores.get("comment", ""),
    }).execute()

    return eval_result.data[0]


@router.get("/evaluation/{session_id}")
async def get_evaluation(session_id: str):
    sb = get_supabase()
    result = sb.table("evaluation_results")\
        .select("*")\
        .eq("session_id", session_id)\
        .single()\
        .execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    return result.data


@router.get("/ranking")
async def get_ranking(limit: int = 10):
    sb = get_supabase()
    result = sb.table("evaluation_results")\
        .select("*, profiles(name, rank, department)")\
        .order("trust_score", desc=True)\
        .limit(limit)\
        .execute()
    return result.data
