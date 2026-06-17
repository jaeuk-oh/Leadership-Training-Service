# GROW 코칭 시뮬레이터 — 설정 가이드

## 1. Supabase 설정

1. [supabase.com](https://supabase.com)에서 새 프로젝트 생성
2. SQL Editor에서 `docs/supabase_migrations.sql` 전체 실행
3. Authentication > Settings > Email Confirmation 설정
4. Project Settings > API에서 키 확인

## 2. 환경변수 설정

### web/.env.local
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### api/.env
```
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ALLOWED_ORIGINS=http://localhost:3000
```

## 3. 로컬 개발 실행

### Next.js
```bash
cd web
npm install
npm run dev
```

### FastAPI
```bash
cd api
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

## 4. 페르소나 시드 데이터 업로드

```bash
cd api
source venv/bin/activate
python -m scripts.seed_personas
```

## 5. 배포

### Next.js → Vercel
1. GitHub에 푸시
2. vercel.com에서 프로젝트 연결
3. 환경변수 설정 후 Deploy

### FastAPI → Render
1. GitHub에 푸시
2. render.com에서 New → Web Service 생성
3. GitHub 연결 → Root Directory를 `api`로 지정 (Dockerfile 자동 인식)
4. Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. 환경변수 설정 후 Deploy

## 6. 관리자 설정

내 계정을 관리자로 지정하면 사용 제한이 모두 해제됩니다. Supabase SQL Editor에서 이메일로 지정:
```sql
UPDATE profiles SET is_admin = true
WHERE id = (SELECT id FROM auth.users WHERE email = '내-이메일@example.com');
```
(user id를 이미 안다면) `UPDATE profiles SET is_admin = true WHERE id = 'your-user-id';`

## 7. 사용 제한 정책 (일반 회원)

백엔드에서 강제하며, 관리자(`is_admin = true`)는 무제한. 수치는 [api/services/limits.py](../api/services/limits.py)에서 조정.

| 항목 | 제한 |
|------|------|
| 사용 가능 페르소나 | 서로 다른 3종까지 |
| 페르소나당 세션 | 2회 |
| 세션당 대화 턴 | 10회 (코치 발화 기준) |

또한 모든 API는 로그인(Supabase JWT) 필요, 페르소나 생성/임베딩은 관리자 전용.
