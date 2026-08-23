export interface JobDescription {
  id: string;
  title: string;
  department?: string;
  description?: string; // Full raw text
  ai_role_profile?: string; // Gemini generated semantic summary
  created_at: string;
  resumeCount?: number;
}

export interface CandidateScore {
  candidate_id: string;
  total_score: number;
  tier: 'top' | 'good' | 'borderline' | 'rejected';
  required_skill_score: number;
  nice_to_have_score: number;
  experience_score: number;
  education_score: number;
  ai_bonus: number;
  matched_required: string[];
  missing_required: string[];
  matched_nice_to_have: string[];
  extra_skills: string[];
  high_points: string[];
  low_points: string[];
  placement_rationale: string;
  interview_questions: string[];
  detected_years: number | null;
  detected_education: string;
}

export interface Candidate {
  id: string;
  name: string;
  resume_text: string;
  jd_id: string;
  created_at: string;
  // Merged with score in the results view
  total_score?: number;
  tier?: 'top' | 'good' | 'borderline' | 'rejected';
}

export type Tier = 'top' | 'good' | 'borderline' | 'rejected';

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface ChatSession {
  sessionId: string;
  jdId: string;
  history: ChatMessage[];
}
