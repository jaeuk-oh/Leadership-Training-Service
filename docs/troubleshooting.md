# Troubleshooting

---

## [2026-04-15] Supabase signup 500 `unexpected_failure`

### 오류
```
POST /auth/v1/signup → 500
x_sb_error_code: unexpected_failure
msg: "Database error saving new user"
relation "profiles" does not exist (SQLSTATE 42P01)
```

### 원인
`handle_new_user()` 트리거 함수가 `SECURITY DEFINER`로 실행될 때 `search_path`가 `public`을 포함하지 않아 `profiles` 테이블을 찾지 못함.

추가로, 마이그레이션 SQL을 두 번 실행하면서 `CREATE POLICY` 중복 에러로 실행이 중단되어 트리거 자체가 생성되지 않은 상태였음.

### 해결
트리거 함수에서 테이블명을 `public.profiles`로 명시하고 `SET search_path = public` 추가.

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### 이유
`SECURITY DEFINER` 함수는 호출자가 아닌 함수 소유자 권한으로 실행되며, 이때 `search_path`가 달라질 수 있음. 스키마를 명시하지 않으면 `profiles`를 찾지 못하므로 `public.`을 붙이거나 `SET search_path`로 고정해야 함.

---

## [2026-04-19] 페르소나 페이지 빈 화면 (`infinite recursion detected in policy for relation "profiles"`)

### 오류
```
code: '42P17'
message: 'infinite recursion detected in policy for relation "profiles"'
```
페르소나 시드는 성공했고 DB에 데이터도 있는데, 페르소나 페이지에서 목록이 표시되지 않음.

### 원인
`personas` 테이블의 `personas_admin_all` 정책이 `profiles` 테이블을 조회해 관리자 여부를 확인하는데, `profiles` 테이블도 RLS가 활성화되어 있어 서로를 순환 참조하는 무한 루프 발생.

```
personas 조회 → personas_admin_all 정책 → profiles 조회 → profiles RLS 정책 → profiles 조회 → ...
```

### 해결
관리자 확인 로직을 `SECURITY DEFINER` 함수로 분리. 이 함수는 실행 시 RLS를 우회하므로 재귀가 발생하지 않음.

```sql
DROP POLICY IF EXISTS "personas_admin_all" ON personas;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE POLICY "personas_admin_all" ON personas FOR ALL USING (is_admin());
```

### 이유
`SECURITY DEFINER` 함수는 함수 소유자 권한으로 실행되어 RLS 검사를 건너뜀. 관리자 확인처럼 내부 테이블을 직접 조회해야 하는 경우에 사용하면 RLS 재귀 문제를 피할 수 있음. 같은 패턴이 다른 테이블에도 있다면 동일하게 적용 필요.

---

## [2026-04-19] 코칭 시작 422 Unprocessable Entity

### 오류
```
POST http://localhost:8000/api/session/start 422 (Unprocessable Entity)
```

### 원인
FastAPI 엔드포인트가 쿼리 파라미터로 선언되어 있었는데, 프론트는 JSON 바디로 데이터를 보냄.

```python
# 기존 — 쿼리 파라미터로 선언 (?persona_id=...&user_id=... 형태를 기대)
async def start_session(persona_id: str, user_id: str):
```

```typescript
// 프론트 — JSON 바디로 전송
apiPost('/api/session/start', { persona_id, user_id })
```

### 해결
FastAPI에서 Pydantic 모델(`BaseModel`)을 파라미터로 받으면 자동으로 JSON 바디로 인식함. `SessionStartRequest` 스키마가 이미 존재했으므로 엔드포인트만 수정.

```python
@router.post("/session/start")
async def start_session(body: SessionStartRequest):
    persona_id, user_id = body.persona_id, body.user_id
```

### 이유
FastAPI는 파라미터 타입에 따라 데이터 위치를 자동 판단함. 기본 타입(`str`, `int`)은 쿼리 파라미터, Pydantic `BaseModel`은 JSON 바디로 처리함. POST 요청에서 데이터를 전달할 때는 Pydantic 모델을 사용하는 게 맞음.

---

## [2026-04-19] 채팅 스트리밍 ERR_INCOMPLETE_CHUNKED_ENCODING

### 오류
```
Failed to load resource: net::ERR_INCOMPLETE_CHUNKED_ENCODING
AttributeError: 'ChunkEvent' object has no attribute 'choices'
```

### 원인
`openai_client.beta.chat.completions.stream`은 고수준 이벤트 객체(`ChunkEvent`)를 반환하는데, 코드는 일반 스트리밍의 `ChatCompletionChunk` 객체처럼 `.choices[0].delta.content`로 접근하려 해서 `AttributeError` 발생. 스트리밍 도중 서버가 크래시하니 브라우저에서 `ERR_INCOMPLETE_CHUNKED_ENCODING`으로 나타남.

### 해결
`beta.chat.completions.stream` 대신 표준 스트리밍 API 사용.

```python
# 기존
async with openai_client.beta.chat.completions.stream(...) as stream:
    async for chunk in stream:
        delta = chunk.choices[0].delta.content  # AttributeError

# 수정
stream = await openai_client.chat.completions.create(..., stream=True)
async for chunk in stream:
    delta = chunk.choices[0].delta.content if chunk.choices else None
```

### 이유
`beta.chat.completions.stream`은 OpenAI SDK의 고수준 헬퍼로 이벤트 타입이 다름. 일반적인 SSE 스트리밍에는 `chat.completions.create(stream=True)`를 사용해야 함.
