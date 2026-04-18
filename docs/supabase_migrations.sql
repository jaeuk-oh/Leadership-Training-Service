-- ============================================================
-- GROW 코칭 시뮬레이션 — Supabase 마이그레이션
-- Supabase SQL Editor에서 순서대로 실행하세요.
-- ============================================================

-- 0. pgvector 확장 활성화
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- 1. profiles 테이블
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  rank TEXT,
  department TEXT,
  points INTEGER DEFAULT 0,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_admin_all" ON profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- 회원가입 시 profiles 자동 생성 트리거
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- 2. personas 테이블
-- ============================================================
CREATE TABLE IF NOT EXISTS personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_preset BOOLEAN DEFAULT true,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'medium',
  profile JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "personas_select_all" ON personas FOR SELECT USING (true);
CREATE POLICY "personas_insert_auth" ON personas FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "personas_update_own" ON personas FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "personas_admin_all" ON personas FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- ============================================================
-- 3. persona_documents 테이블 (RAG 임베딩)
-- ============================================================
CREATE TABLE IF NOT EXISTS persona_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id UUID REFERENCES personas(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('profile','speech','situation','psychology','reaction','story')),
  content TEXT NOT NULL,
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS persona_documents_embedding_idx
  ON persona_documents USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

ALTER TABLE persona_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "persona_docs_select_all" ON persona_documents FOR SELECT USING (true);
CREATE POLICY "persona_docs_insert_service" ON persona_documents FOR INSERT WITH CHECK (true);
CREATE POLICY "persona_docs_update_service" ON persona_documents FOR UPDATE USING (true);

-- 벡터 유사도 검색 RPC
CREATE OR REPLACE FUNCTION match_persona_documents(
  query_embedding vector(1536),
  persona_id_filter UUID,
  match_count INT DEFAULT 5,
  match_threshold FLOAT DEFAULT 0.65
)
RETURNS TABLE (id UUID, content TEXT, category TEXT, similarity FLOAT)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pd.id,
    pd.content,
    pd.category,
    1 - (pd.embedding <=> query_embedding) AS similarity
  FROM persona_documents pd
  WHERE pd.persona_id = persona_id_filter
    AND pd.embedding IS NOT NULL
    AND 1 - (pd.embedding <=> query_embedding) > match_threshold
  ORDER BY pd.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================================
-- 4. coaching_sessions 테이블
-- ============================================================
CREATE TABLE IF NOT EXISTS coaching_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  persona_id UUID REFERENCES personas(id),
  current_stage TEXT DEFAULT 'goal' CHECK (current_stage IN ('goal','reality','options','will')),
  trust_score FLOAT DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','completed','abandoned')),
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ
);

ALTER TABLE coaching_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions_select_own" ON coaching_sessions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "sessions_insert_own" ON coaching_sessions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "sessions_update_own" ON coaching_sessions FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "sessions_admin_all" ON coaching_sessions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- ============================================================
-- 5. messages 테이블
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES coaching_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  grow_stage TEXT CHECK (grow_stage IN ('goal','reality','options','will')),
  trust_delta FLOAT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_select_own" ON messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM coaching_sessions cs WHERE cs.id = session_id AND cs.user_id = auth.uid())
);
CREATE POLICY "messages_insert_own" ON messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM coaching_sessions cs WHERE cs.id = session_id AND cs.user_id = auth.uid())
);
CREATE POLICY "messages_admin_all" ON messages FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- ============================================================
-- 6. evaluation_results 테이블
-- ============================================================
CREATE TABLE IF NOT EXISTS evaluation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES coaching_sessions(id),
  user_id UUID REFERENCES auth.users(id),
  goal_clarity FLOAT,
  active_listening FLOAT,
  question_quality FLOAT,
  commitment FLOAT,
  trust_score FLOAT,
  gpt_comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE evaluation_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "eval_select_own" ON evaluation_results FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "eval_insert_service" ON evaluation_results FOR INSERT WITH CHECK (true);
CREATE POLICY "eval_admin_all" ON evaluation_results FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- ============================================================
-- 7. feedback_requests 테이블
-- ============================================================
CREATE TABLE IF NOT EXISTS feedback_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES auth.users(id),
  session_id UUID REFERENCES coaching_sessions(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','completed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE feedback_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feedback_req_select_own" ON feedback_requests FOR SELECT USING (requester_id = auth.uid());
CREATE POLICY "feedback_req_insert_own" ON feedback_requests FOR INSERT WITH CHECK (requester_id = auth.uid());
CREATE POLICY "feedback_req_select_all_auth" ON feedback_requests FOR SELECT USING (auth.uid() IS NOT NULL);

-- ============================================================
-- 8. feedback_responses 테이블
-- ============================================================
CREATE TABLE IF NOT EXISTS feedback_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES feedback_requests(id),
  respondent_id UUID REFERENCES auth.users(id),
  scores JSONB,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE feedback_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feedback_resp_select_own" ON feedback_responses FOR SELECT USING (respondent_id = auth.uid());
CREATE POLICY "feedback_resp_insert_auth" ON feedback_responses FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 피드백 응답 시 포인트 자동 적립 트리거
CREATE OR REPLACE FUNCTION award_feedback_points()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles SET points = points + 50 WHERE id = NEW.respondent_id;
  UPDATE feedback_requests SET status = 'completed' WHERE id = NEW.request_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_feedback_response ON feedback_responses;
CREATE TRIGGER on_feedback_response
  AFTER INSERT ON feedback_responses
  FOR EACH ROW EXECUTE FUNCTION award_feedback_points();

-- ============================================================
-- 완료
-- ============================================================
