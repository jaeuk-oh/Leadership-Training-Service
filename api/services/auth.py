"""인증/권한 의존성.

프론트가 보내는 Supabase JWT(Authorization: Bearer <token>)를 검증해
사용자 식별과 관리자 여부를 반환한다. 엔드포인트는 이 의존성을 통해서만
사용자를 신뢰한다(요청 본문의 user_id는 더 이상 신뢰하지 않음).
"""

from fastapi import Depends, Header, HTTPException

from services.supabase_client import get_supabase


async def get_current_user(authorization: str | None = Header(default=None)) -> dict:
    """로그인한 사용자만 통과. {"user_id", "is_admin"} 반환."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="인증 토큰이 필요합니다.")

    token = authorization.split(" ", 1)[1].strip()
    sb = get_supabase()
    try:
        resp = sb.auth.get_user(token)
        user = resp.user
    except Exception:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")
    if not user:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")

    profile = (
        sb.table("profiles").select("is_admin").eq("id", user.id).single().execute()
    )
    is_admin = bool(profile.data and profile.data.get("is_admin"))
    return {"user_id": user.id, "is_admin": is_admin}


async def require_admin(current: dict = Depends(get_current_user)) -> dict:
    """관리자 전용 엔드포인트 보호."""
    if not current["is_admin"]:
        raise HTTPException(status_code=403, detail="관리자만 사용할 수 있습니다.")
    return current
