export interface JobSchema {
  company_name: string;
  role_title: string;
  seniority?: 'intern' | 'junior' | 'mid' | 'senior' | 'lead' | 'staff';
  contract?: string;
  location?: string;
  salary?: string;
  must_have: string[];
  nice_to_have: string[];
  responsibilities: string[];
  soft_skills: string[];
  culture_signals: string[];
  sources: string[];
}

export interface InterviewPack {
  rh_questions: Array<{
    q: string;
    rubric: {
      criteria: Array<{
        name: string;
        desc: string;
        weight: number;
      }>;
      red_flags: string[];
    };
  }>;
  tech_questions: Array<{
    q: string;
    level: number;
    topics: string[];
    answers_hint?: string;
  }>;
  live_tasks: Array<{
    prompt: string;
    input_format: string;
    expected_dimensions?: string;
  }>;
  scoring_model: {
    weights: {
      rh: number;
      tech: number;
    };
  };
}

export interface Company {
  id: string;
  name: string;
  domain?: string;
  culture_values?: string[];
  about?: string;
  sources: string[];
  created_at: string;
  updated_at: string;
}

export interface JobPosting {
  id: string;
  company_id: string;
  url: string;
  title: string;
  description?: string;
  requirements: string[];
  skills_required: string[];
  skills_preferred: string[];
  location?: string;
  salary_range?: string;
  seniority_level?: string;
  contract_type?: string;
  sources: string[];
  created_at: string;
  updated_at: string;
}

export interface Skill {
  id: string;
  name: string;
  type: 'hard' | 'soft';
  category?: string;
  created_at: string;
}

export interface ResearchResult {
  job: JobSchema;
  company: Company;
  interviewPack: InterviewPack;
  sources: string[];
}