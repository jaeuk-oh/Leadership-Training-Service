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

### FastAPI → Railway
1. GitHub에 푸시
2. railway.app에서 새 프로젝트 생성
3. GitHub 연결 → api 폴더 선택
4. 환경변수 설정 후 Deploy

## 6. 관리자 설정

Supabase SQL Editor에서:
```sql
UPDATE profiles SET is_admin = true WHERE id = 'your-user-id';
```
