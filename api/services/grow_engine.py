from models.schemas import GrowStage

GROW_STAGE_PROMPTS = {
    GrowStage.goal: """
## GROW 단계: Goal (목표 설정)
현재 코칭 세션은 목표 설정 단계입니다.
코치(사용자)가 당신의 목표를 구체화하도록 도와주는 질문에 답하세요.
- 모호한 목표를 가지고 있으며, 코치의 질문을 통해 점차 구체화됩니다.
- 처음에는 목표가 불분명하거나 여러 개가 섞여 있을 수 있습니다.
- SMART 목표로 발전하는 과정을 자연스럽게 보여주세요.
""",
    GrowStage.reality: """
## GROW 단계: Reality (현실 파악)
현재 코칭 세션은 현실 파악 단계입니다.
코치가 현재 상황을 객관적으로 파악하도록 도와주세요.
- 현재 상황의 구체적인 사실들을 이야기하세요.
- 어려움과 장애물을 솔직하게 표현하세요.
- 감정적인 부분도 포함하되, 사실에 기반하세요.
""",
    GrowStage.options: """
## GROW 단계: Options (대안 탐색)
현재 코칭 세션은 대안 탐색 단계입니다.
코치와 함께 다양한 해결책을 모색하세요.
- 코치가 제시하는 아이디어에 반응하고 자신만의 아이디어도 제시하세요.
- 각 방안의 장단점을 논의하세요.
- 가능성 있는 옵션들에 대해 열린 태도를 보여주세요.
""",
    GrowStage.will: """
## GROW 단계: Will (실행 의지)
현재 코칭 세션은 실행 의지 단계입니다.
코치가 구체적인 실행 계획을 세우도록 도와주세요.
- 실행 의지를 표현하되, 자신의 성향에 맞게 반응하세요.
- 구체적인 첫 번째 행동 단계에 동의하세요.
- 코칭 세션에 대한 소감을 자연스럽게 표현하세요.
""",
}

TRUST_EVALUATION_PROMPT = """
다음 코칭 대화에서 코치의 마지막 메시지를 평가하세요.

평가 기준:
1. 공감적 경청 (상대방의 감정/상황 인정)
2. 열린 질문 사용 (Yes/No가 아닌 탐색적 질문)
3. GROW 단계 적합성 (현재 단계에 맞는 질문/접근)
4. 판단/조언 자제 (직접적 해답 제시 자제)

신뢰도 변화를 -2.0 ~ +2.0 사이의 숫자로만 응답하세요.
(좋은 코칭 질문: +1~2, 보통: 0~1, 나쁜 접근: -1~-2)
숫자만 응답하세요.
"""


def build_system_prompt(
    persona_name: str,
    rag_context: str,
    grow_stage: GrowStage,
    trust_score: float,
    conversation_summary: str = "",
) -> str:
    trust_description = _trust_to_description(trust_score)

    prompt = f"""당신은 코칭 시뮬레이션의 피코치자 역할을 합니다.
이름: {persona_name}
현재 신뢰도: {trust_score:.1f}/10 ({trust_description})

{rag_context}

{GROW_STAGE_PROMPTS[grow_stage]}

## 대화 지침
- 페르소나의 말투, 성격, 심리 상태를 일관되게 유지하세요.
- 신뢰도가 낮을수록 방어적/폐쇄적으로, 높을수록 개방적으로 반응하세요.
- 한국어로 자연스럽게 대화하세요.
- 코치의 질문에만 답하고, 코치의 역할을 대신하지 마세요.
- 응답은 3-5문장으로 간결하게 유지하세요.
"""

    if conversation_summary:
        prompt += f"\n## 이전 대화 요약\n{conversation_summary}\n"

    return prompt


def _trust_to_description(trust: float) -> str:
    if trust >= 8:
        return "매우 협조적, 개방적"
    elif trust >= 6:
        return "협조적"
    elif trust >= 4:
        return "보통"
    elif trust >= 2:
        return "다소 방어적"
    else:
        return "방어적, 폐쇄적"
