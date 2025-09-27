-- Coach Candidat IA Database Schema
-- Professional interview coaching platform with video simulation

-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  linkedin_url TEXT,
  experience_level TEXT CHECK (experience_level IN ('junior', 'mid', 'senior', 'lead')),
  target_roles TEXT[],
  skills TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create job_contexts table for job requirements and context
CREATE TABLE public.job_contexts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  company_name TEXT,
  job_description TEXT,
  requirements TEXT[],
  skills_required TEXT[],
  keywords TEXT[],
  company_signals TEXT[],
  source_urls TEXT[],
  pdf_content TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create interview_sessions table
CREATE TABLE public.interview_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  job_context_id UUID REFERENCES public.job_contexts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  session_type TEXT NOT NULL DEFAULT 'technical' CHECK (session_type IN ('technical', 'behavioral', 'case_study', 'mixed')),
  duration_minutes INTEGER DEFAULT 30,
  overall_score DECIMAL(5,2),
  communication_score DECIMAL(5,2),
  technical_score DECIMAL(5,2),
  confidence_score DECIMAL(5,2),
  beyond_presence_session_id TEXT,
  video_recording_url TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create questions table for interview questions
CREATE TABLE public.questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('behavioral', 'technical', 'situational', 'case_study')),
  difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  expected_duration_seconds INTEGER DEFAULT 120,
  order_index INTEGER NOT NULL,
  beyond_presence_question_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create answers table for user responses
CREATE TABLE public.answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
  video_url TEXT,
  transcript TEXT,
  audio_url TEXT,
  duration_seconds INTEGER,
  communication_score DECIMAL(5,2),
  technical_score DECIMAL(5,2),
  confidence_score DECIMAL(5,2),
  clarity_score DECIMAL(5,2),
  structure_score DECIMAL(5,2),
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create feedbacks table for AI-generated feedback
CREATE TABLE public.feedbacks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
  answer_id UUID REFERENCES public.answers(id) ON DELETE CASCADE,
  feedback_type TEXT NOT NULL DEFAULT 'question' CHECK (feedback_type IN ('question', 'overall', 'skill_specific')),
  skill_category TEXT CHECK (skill_category IN ('communication', 'technical', 'confidence', 'structure')),
  highlights TEXT[],
  improvements TEXT[],
  action_items TEXT[],
  detailed_feedback TEXT,
  evidence_points TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create cv_documents table for uploaded CVs
CREATE TABLE public.cv_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  parsed_content TEXT,
  extracted_skills TEXT[],
  extracted_experience TEXT[],
  extracted_education TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_contexts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cv_documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for job_contexts
CREATE POLICY "Users can manage their job contexts" ON public.job_contexts
  FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for interview_sessions
CREATE POLICY "Users can manage their interview sessions" ON public.interview_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for questions
CREATE POLICY "Users can view questions for their sessions" ON public.questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.interview_sessions 
      WHERE id = questions.session_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage questions" ON public.questions
  FOR ALL USING (true);

-- Create RLS policies for answers
CREATE POLICY "Users can manage answers for their sessions" ON public.answers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.interview_sessions 
      WHERE id = answers.session_id AND user_id = auth.uid()
    )
  );

-- Create RLS policies for feedbacks
CREATE POLICY "Users can view feedback for their sessions" ON public.feedbacks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.interview_sessions 
      WHERE id = feedbacks.session_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage feedbacks" ON public.feedbacks
  FOR ALL USING (true);

-- Create RLS policies for cv_documents
CREATE POLICY "Users can manage their CV documents" ON public.cv_documents
  FOR ALL USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_job_contexts_user_id ON public.job_contexts(user_id);
CREATE INDEX idx_interview_sessions_user_id ON public.interview_sessions(user_id);
CREATE INDEX idx_interview_sessions_status ON public.interview_sessions(status);
CREATE INDEX idx_questions_session_id ON public.questions(session_id);
CREATE INDEX idx_answers_session_id ON public.answers(session_id);
CREATE INDEX idx_answers_question_id ON public.answers(question_id);
CREATE INDEX idx_feedbacks_session_id ON public.feedbacks(session_id);
CREATE INDEX idx_cv_documents_user_id ON public.cv_documents(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_job_contexts_updated_at
  BEFORE UPDATE ON public.job_contexts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_interview_sessions_updated_at
  BEFORE UPDATE ON public.interview_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cv_documents_updated_at
  BEFORE UPDATE ON public.cv_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();