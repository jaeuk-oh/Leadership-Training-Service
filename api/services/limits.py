"""일반 회원 사용 제한 (관리자는 무제한).

- MAX_PERSONAS: 사용 가능한 서로 다른 페르소나 종류 수
- MAX_SESSIONS_PER_PERSONA: 페르소나 1종당 시작 가능한 세션 수
- MAX_TURNS_PER_SESSION: 세션 1개당 코치(사용자) 발화 횟수
"""

MAX_PERSONAS = 3
MAX_SESSIONS_PER_PERSONA = 2
MAX_TURNS_PER_SESSION = 10
