# GROW 코칭 시뮬레이션 웹앱 스펙

## 프로젝트 개요
RAG 기반 페르소나 시스템을 핵심 차별화 포인트로 하는 GROW 코칭 시뮬레이션 웹앱.
리더십 훈련 목적으로, 실제 직장 상황과 유사한 AI 페르소나와 GROW 코칭 대화를 실습.

## 기술 스택
- **프론트엔드**: Next.js 14+ (App Router, TypeScript)
- **스타일링**: Tailwind CSS + shadcn/ui
- **DB/인증**: Supabase (PostgreSQL + pgvector + Auth + RLS)
- **AI 백엔드**: FastAPI (uvicorn) — AI 전용 서버
- **LLM**: OpenAI GPT-4o + text-embedding-3-small
- **STT/TTS**: OpenAI Whisper + OpenAI TTS
- **배포**: Vercel (Next.js) + Railway (FastAPI)

## 모노레포 구조
```
/web   → Next.js 14+ App Router
/api   → FastAPI (AI backend)
/docs  → 문서
```

## Phase별 기능 명세

### Phase 1: 프로젝트 초기 설정
- Next.js 프로젝트 (App Router, TypeScript, Tailwind CSS)
- shadcn/ui 설치 및 테마 설정
- Supabase 클라이언트 연동 (@supabase/supabase-js, @supabase/ssr)
- FastAPI 서버 (uvicorn, python-dotenv)
- 환경변수 관리 (.env.local / .env)

### Phase 2: 인증 시스템 (Supabase Auth)
- 이메일/비밀번호 인증
- profiles 테이블: id, name, rank, department, points, is_admin, created_at
- DB Trigger: 회원가입 시 profiles 자동 생성
- 회원가입/로그인 페이지 (shadcn/ui Form + Zod validation)
- middleware.ts 라우터 가드
- RLS 정책 (사용자별 데이터 접근 제어)

### Phase 3: RAG 기반 페르소나 시스템 ← 핵심

#### 3-A. 페르소나 데이터 (7개 차원)
1. 기본 프로필: gender, age_group, rank, job_type, tenure_years, mbti
2. 말투/어조: politeness_level, common_expressions, emotion_patterns, speech_habits
3. 업무 상황: work_concerns, team_conflicts, performance_issues, career_concerns
4. 심리 상태: stress_level(1-10), motivation_level(1-10), coaching_attitude(cooperative/defensive/avoidant)
5. 대화 반응 패턴: grow_stage_reactions, emotion_change_scenarios, resistance_points
6. 배경 스토리: past_experiences, values, work_episodes
7. 메타: difficulty_level(easy/medium/hard), tags

#### 3-B. RAG 파이프라인
```sql
CREATE EXTENSION vector;
-- personas 테이블
CREATE TABLE personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_preset BOOLEAN DEFAULT true,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  profile JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- persona_documents 테이블 (임베딩)
CREATE TABLE persona_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id UUID REFERENCES personas(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- profile/speech/situation/psychology/reaction/story
  content TEXT NOT NULL,
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- match_persona_documents RPC (cosine similarity)
CREATE OR REPLACE FUNCTION match_persona_documents(
  query_embedding vector(1536),
  persona_id_filter UUID,
  match_count INT DEFAULT 5,
  match_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (id UUID, content TEXT, category TEXT, similarity FLOAT)
```

- FastAPI: POST /api/persona/embed
- 30개+ 프리셋 시드 데이터 + 일괄 임베딩 스크립트

#### 3-C. 동적 프롬프트 구성
- System Prompt = 기본 역할 + RAG 검색 결과 + GROW 단계 지시 + 대화 요약 + 신뢰도
- 대화 턴별 쿼리 자동 갱신

#### 3-D. 페르소나 설정 UI
- 프리셋 카드 브라우징 (30개+, 난이도 뱃지)
- 커스텀 페르소나 생성 폼
- 페르소나 요약 미리보기

### Phase 4: GROW 코칭 시뮬레이션
```sql
CREATE TABLE coaching_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  persona_id UUID REFERENCES personas(id),
  current_stage TEXT CHECK (current_stage IN ('goal', 'reality', 'options', 'will')),
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
- FastAPI: POST /api/chat (StreamingResponse + RAG 컨텍스트)
- GROW 단계 자동 전환 로직
- 신뢰도 점수 시스템 (GPT 평가)
- GROW 표본질문 가이드 팝업

### Phase 5: 음성 기능
- FastAPI: POST /api/stt (Whisper), POST /api/tts (TTS)
- Web Audio API 마이크 녹음 + 파형 시각화
- 페르소나별 음성 매핑 (alloy/echo/fable/onyx/nova/shimmer)

### Phase 6: 평가 및 결과
```sql
CREATE TABLE evaluation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES coaching_sessions(id),
  user_id UUID REFERENCES auth.users(id),
  goal_clarity FLOAT,      -- 목표 명확화 점수
  active_listening FLOAT,  -- 경청/공감 점수
  question_quality FLOAT,  -- 질문 수준 점수
  commitment FLOAT,        -- 실행 의지 이끌기 점수
  trust_score FLOAT,
  gpt_comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```
- recharts 레이더 차트 (4개 지표)
- 신뢰도 Bar 차트 (개인 vs 전체 평균)
- 랭킹 시스템

### Phase 7: 마이페이지
- 프로필 수정
- 시뮬레이션 내역 + 대화 다시보기
- CSV/PDF 다운로드
- 리더십 자기진단 설문 + 결과 차트
- 포인트 내역

### Phase 8: 피드백 시스템
```sql
CREATE TABLE feedback_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES auth.users(id),
  session_id UUID REFERENCES coaching_sessions(id),
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE feedback_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES feedback_requests(id),
  respondent_id UUID REFERENCES auth.users(id),
  scores JSONB,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```
- 익명 피드백 요청/응답
- 참여 시 포인트 자동 적립 DB Trigger

### Phase 9: 관리자 페이지
- is_admin 권한 체크 + 미들웨어 가드
- 회원 관리 DataTable
- 전체 세션 열람/검색
- recharts 통계 대시보드

### Phase 10: 공통 UI
- 랜딩/홈 페이지
- 공통 레이아웃 (헤더/사이드바/푸터)
- 반응형 디자인
- 다크모드
- 로딩/에러 상태 (Skeleton, Toast)

### Phase 11: 배포
- Vercel (Next.js) + Railway (FastAPI + Dockerfile)
- GitHub Actions CI/CD
- Supabase RLS 최종 점검

## 핵심 제약사항
- Phase 3 RAG 페르소나 먼저 구현 및 검증
- 각 Phase 완료 시 사용자 확인 후 다음 Phase 진행
- 설계 충돌/기능 누락 시 반드시 먼저 질문
- 모든 테이블에 Supabase RLS 필수 적용
- 스트리밍은 FastAPI StreamingResponse 기반
