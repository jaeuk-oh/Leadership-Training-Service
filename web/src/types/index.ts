export type GrowStage = 'goal' | 'reality' | 'options' | 'will'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type CoachingAttitude = 'cooperative' | 'defensive' | 'avoidant'
export type SessionStatus = 'active' | 'completed' | 'abandoned'
export type MessageRole = 'user' | 'assistant'

export interface Profile {
  id: string
  name: string | null
  rank: string | null
  department: string | null
  points: number
  is_admin: boolean
  created_at: string
}

export interface PersonaProfile {
  gender?: string
  age_group?: string
  rank?: string
  job_type?: string
  tenure_years?: number
  mbti?: string
  politeness_level?: number
  common_expressions?: string[]
  emotion_patterns?: string
  speech_habits?: string[]
  work_concerns?: string
  team_conflicts?: string
  performance_issues?: string
  career_concerns?: string
  stress_level?: number
  motivation_level?: number
  coaching_attitude?: CoachingAttitude
  grow_stage_reactions?: Record<string, string>
  emotion_change_scenarios?: string
  resistance_points?: string[]
  past_experiences?: string
  values?: string
  work_episodes?: string
  voice?: string
}

export interface Persona {
  id: string
  name: string
  description: string | null
  is_preset: boolean
  difficulty: Difficulty
  profile: PersonaProfile
  created_by: string | null
  created_at: string
}

export interface CoachingSession {
  id: string
  user_id: string
  persona_id: string
  current_stage: GrowStage
  trust_score: number
  status: SessionStatus
  started_at: string
  ended_at: string | null
  personas?: Persona
}

export interface Message {
  id: string
  session_id: string
  role: MessageRole
  content: string
  grow_stage: GrowStage | null
  trust_delta: number | null
  created_at: string
}

export interface EvaluationResult {
  id: string
  session_id: string
  user_id: string
  goal_clarity: number
  active_listening: number
  question_quality: number
  commitment: number
  trust_score: number
  gpt_comment: string | null
  created_at: string
}

export interface FeedbackRequest {
  id: string
  requester_id: string
  session_id: string
  status: 'pending' | 'completed'
  created_at: string
}

export type DifficultyLabel = { [K in Difficulty]: string }
export const DIFFICULTY_LABELS: DifficultyLabel = {
  easy: '초급',
  medium: '중급',
  hard: '고급',
}

export const GROW_STAGE_LABELS: Record<GrowStage, string> = {
  goal: 'Goal (목표)',
  reality: 'Reality (현실)',
  options: 'Options (대안)',
  will: 'Will (실행)',
}

export const GROW_STAGE_COLORS: Record<GrowStage, string> = {
  goal: 'bg-blue-500',
  reality: 'bg-purple-500',
  options: 'bg-orange-500',
  will: 'bg-green-500',
}
