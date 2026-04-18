from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum


class GrowStage(str, Enum):
    goal = "goal"
    reality = "reality"
    options = "options"
    will = "will"


class CoachingAttitude(str, Enum):
    cooperative = "cooperative"
    defensive = "defensive"
    avoidant = "avoidant"


class Difficulty(str, Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"


class PersonaProfile(BaseModel):
    gender: Optional[str] = None
    age_group: Optional[str] = None
    rank: Optional[str] = None
    job_type: Optional[str] = None
    tenure_years: Optional[int] = None
    mbti: Optional[str] = None
    politeness_level: Optional[int] = Field(None, ge=1, le=5)
    common_expressions: Optional[List[str]] = []
    emotion_patterns: Optional[str] = None
    speech_habits: Optional[List[str]] = []
    work_concerns: Optional[str] = None
    team_conflicts: Optional[str] = None
    performance_issues: Optional[str] = None
    career_concerns: Optional[str] = None
    stress_level: Optional[int] = Field(None, ge=1, le=10)
    motivation_level: Optional[int] = Field(None, ge=1, le=10)
    coaching_attitude: Optional[CoachingAttitude] = None
    grow_stage_reactions: Optional[dict] = {}
    emotion_change_scenarios: Optional[str] = None
    resistance_points: Optional[List[str]] = []
    past_experiences: Optional[str] = None
    values: Optional[str] = None
    work_episodes: Optional[str] = None
    voice: Optional[str] = "alloy"


class PersonaCreate(BaseModel):
    name: str
    description: Optional[str] = None
    difficulty: Difficulty = Difficulty.medium
    profile: PersonaProfile
    is_preset: bool = False


class EmbedRequest(BaseModel):
    persona_id: str


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    session_id: str
    persona_id: str
    message: str
    grow_stage: GrowStage
    history: List[ChatMessage] = []
    trust_score: float = 0.0


class SessionStartRequest(BaseModel):
    persona_id: str
    user_id: str


class EvaluationRequest(BaseModel):
    session_id: str
    messages: List[ChatMessage]
    persona_id: str


class STTResponse(BaseModel):
    text: str


class TTSRequest(BaseModel):
    text: str
    voice: str = "alloy"
