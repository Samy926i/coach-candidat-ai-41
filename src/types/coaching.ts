// Core types for Coach Candidat IA

export interface User {
  id: string;
  user_id: string;
  full_name?: string;
  email?: string;
  avatar_url?: string;
  linkedin_url?: string;
  experience_level?: 'junior' | 'mid' | 'senior' | 'lead';
  target_roles?: string[];
  skills?: string[];
  created_at: string;
  updated_at: string;
}

export interface JobContext {
  id: string;
  user_id: string;
  title: string;
  company_name?: string;
  job_description?: string;
  requirements?: string[];
  skills_required?: string[];
  keywords?: string[];
  company_signals?: string[];
  source_urls?: string[];
  pdf_content?: string;
  created_at: string;
  updated_at: string;
}

export interface InterviewSession {
  id: string;
  user_id: string;
  job_context_id?: string;
  job_context?: JobContext;
  title: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  session_type: 'technical' | 'behavioral' | 'case_study' | 'mixed';
  duration_minutes: number;
  overall_score?: number;
  communication_score?: number;
  technical_score?: number;
  confidence_score?: number;
  beyond_presence_session_id?: string;
  video_recording_url?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  questions?: Question[];
  answers?: Answer[];
  feedbacks?: Feedback[];
}

export interface Question {
  id: string;
  session_id: string;
  question_text: string;
  question_type: 'behavioral' | 'technical' | 'situational' | 'case_study';
  difficulty: 'easy' | 'medium' | 'hard';
  expected_duration_seconds: number;
  order_index: number;
  beyond_presence_question_id?: string;
  created_at: string;
}

export interface Answer {
  id: string;
  question_id: string;
  session_id: string;
  video_url?: string;
  transcript?: string;
  audio_url?: string;
  duration_seconds?: number;
  communication_score?: number;
  technical_score?: number;
  confidence_score?: number;
  clarity_score?: number;
  structure_score?: number;
  submitted_at: string;
  created_at: string;
  question?: Question;
}

export interface Feedback {
  id: string;
  session_id: string;
  answer_id?: string;
  feedback_type: 'question' | 'overall' | 'skill_specific';
  skill_category?: 'communication' | 'technical' | 'confidence' | 'structure';
  highlights?: string[];
  improvements?: string[];
  action_items?: string[];
  detailed_feedback?: string;
  evidence_points?: string[];
  created_at: string;
}

export interface CVDocument {
  id: string;
  user_id: string;
  filename: string;
  file_url: string;
  file_size?: number;
  mime_type?: string;
  parsed_content?: string;
  extracted_skills?: string[];
  extracted_experience?: string[];
  extracted_education?: string[];
  created_at: string;
  updated_at: string;
}

// API Response types
export interface ScoreBadgeProps {
  score: number;
  label: string;
  size?: 'sm' | 'md' | 'lg';
}

export interface KPIData {
  lastScore: number;
  trend: number;
  totalSessions: number;
  avgImprovement: number;
}

export interface ChartData {
  date: string;
  overall: number;
  communication: number;
  technical: number;
  confidence: number;
}