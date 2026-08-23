export interface JobDescription {
  id: string;
  title: string;
  department?: string;
  requiredSkills: string[];
  niceToHaveSkills: string[];
  minExperience: number;
  maxExperience: number;
  requiredEducation: 'any' | 'bachelor' | 'master' | 'phd';
  fullText?: string;
  weights: {
    required: number;
    niceToHave: number;
    experience: number;
    education: number;
  };
  createdAt: string;
  resumeCount: number;
}

export interface CandidateScore {
  jdId: string;
  totalScore: number;
  requiredSkillScore: number;
  niceToHaveScore: number;
  experienceScore: number;
  educationScore: number;
  matchedRequired: string[];
  missingRequired: string[];
  matchedNiceToHave: string[];
  missingNiceToHave: string[];
  extraSkills: string[];
  extractedYears: number | null;
  detectedEducation: string;
  tier: 'top' | 'good' | 'borderline' | 'rejected';
}

export interface Candidate {
  id: string;
  fileName: string;
  rawText: string;
  parsedAt: string;
  scores: Record<string, CandidateScore>;
}

export type Tier = 'top' | 'good' | 'borderline' | 'rejected';

export interface ScreeningSession {
  id: string;
  jdId: string;
  date: string;
  candidateIds: string[];
}
