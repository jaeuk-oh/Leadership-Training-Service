# GROW 코칭 시뮬레이션 — 구현 계획

## 실행 원칙
- Phase 3 (RAG 페르소나)를 가장 먼저 구현하고 검증
- 각 Phase 완료 후 사용자 확인
- 모든 테이블에 RLS 적용 필수

## Phase 1: 프로젝트 초기 설정

### 1-1. 모노레포 디렉토리 생성
```
/web  — Next.js 14
/api  — FastAPI
/docs — 문서
```

### 1-2. Next.js 설정
- `npx create-next-app@latest web --typescript --tailwind --app --src-dir --import-alias "@/*"`
- shadcn/ui 초기화: `npx shadcn@latest init`
- 필수 컴포넌트: button, form, input, card, dialog, badge, toast, skeleton, label, select, slider, tabs, avatar, dropdown-menu, table, sheet

### 1-3. Supabase 클라이언트
- `@supabase/supabase-js`, `@supabase/ssr` 설치
- `web/src/lib/supabase/client.ts` — 브라우저 클라이언트
- `web/src/lib/supabase/server.ts` — 서버 컴포넌트용

### 1-4. FastAPI 설정
```
api/
  main.py
  routers/
    chat.py
    persona.py
    stt.py
    tts.py
    evaluation.py
  services/
    rag.py
    openai_service.py
    grow_engine.py
  models/
    schemas.py
  requirements.txt
  Dockerfile
  .env
```

### 1-5. 환경변수
- `web/.env.local`: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_API_URL
- `api/.env`: OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

## Phase 2: 인증 시스템

### DB (Supabase SQL Editor에서 실행)
```sql
-- profiles 테이블
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  rank TEXT,
  department TEXT,
  points INTEGER DEFAULT 0,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 자동 생성 Trigger
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
```

### 페이지
- `web/src/app/(auth)/login/page.tsx`
- `web/src/app/(auth)/signup/page.tsx`
- `web/src/middleware.ts`

## Phase 3: RAG 페르소나 시스템

### DB SQL
```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_preset BOOLEAN DEFAULT true,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  profile JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE persona_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id UUID REFERENCES personas(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION match_persona_documents(
  query_embedding vector(1536),
  persona_id_filter UUID,
  match_count INT DEFAULT 5,
  match_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (id UUID, content TEXT, category TEXT, similarity FLOAT)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT pd.id, pd.content, pd.category,
    1 - (pd.embedding <=> query_embedding) AS similarity
  FROM persona_documents pd
  WHERE pd.persona_id = persona_id_filter
    AND 1 - (pd.embedding <=> query_embedding) > match_threshold
  ORDER BY pd.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

### FastAPI 엔드포인트
- `POST /api/persona/embed` — 페르소나 문서 임베딩 생성
- `GET /api/personas` — 프리셋 목록
- `POST /api/personas` — 커스텀 페르소나 생성

### 시드 데이터 (30개 페르소나)
- `api/scripts/seed_personas.py`

## Phase 4: GROW 시뮬레이션

### DB SQL
```sql
CREATE TABLE coaching_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  persona_id UUID REFERENCES personas(id),
  current_stage TEXT DEFAULT 'goal',
  trust_score FLOAT DEFAULT 0,
  status TEXT DEFAULT 'active',
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES coaching_sessions(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  grow_stage TEXT,
  trust_delta FLOAT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### FastAPI
- `POST /api/chat` — StreamingResponse (RAG + GPT-4o)
- `POST /api/session/start` — 세션 시작
- `POST /api/session/end` — 세션 종료

## Phase 5-11: 이후 단계
(Phase 3-4 검증 완료 후 순차적으로 진행)
