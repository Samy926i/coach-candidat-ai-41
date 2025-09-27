export interface CVEntity {
  skills: string[];
  experiences: Array<{
    title: string;
    company: string;
    duration: string;
    responsibilities: string[];
    technologies?: string[];
  }>;
  education: Array<{
    degree: string;
    institution: string;
    year: string;
    field?: string;
  }>;
  certifications?: string[];
  languages?: string[];
}

export interface JDRequirements {
  title: string;
  company: string;
  skills_required: string[];
  skills_preferred: string[];
  responsibilities: string[];
  qualifications: string[];
  experience_level: string;
  location?: string;
  salary_range?: string;
  benefits?: string[];
}

export interface SkillMapping {
  skill: string;
  status: 'match' | 'partial' | 'missing';
  cv_evidence?: string[];
  importance: 'critical' | 'important' | 'nice-to-have';
}

export interface GapAnalysis {
  strengths: SkillMapping[];
  gaps: SkillMapping[];
  partial_matches: SkillMapping[];
  overall_match_percentage: number;
  recommendations: string[];
}

export interface InterviewQuestion {
  id: string;
  question: string;
  type: 'behavioral' | 'technical' | 'scenario';
  skill_focus: string;
  difficulty: 'easy' | 'medium' | 'hard';
  expected_answer_points: string[];
  follow_up_questions?: string[];
}

export interface AnalysisResult {
  cv_analysis: CVEntity;
  jd_requirements: JDRequirements;
  skill_mapping: SkillMapping[];
  gap_analysis: GapAnalysis;
  interview_questions: InterviewQuestion[];
  generated_at: string;
  confidence_score: number;
}