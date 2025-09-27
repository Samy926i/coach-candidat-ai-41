// Mock data for Coach Candidat IA - Phase 1

import { InterviewSession, Question, Answer, Feedback, JobContext, ChartData, KPIData } from '@/types/coaching';

export const mockJobContexts: JobContext[] = [
  {
    id: '1',
    user_id: 'user-1',
    title: 'Senior Frontend Developer',
    company_name: 'TechCorp',
    job_description: 'Join our dynamic team as a Senior Frontend Developer...',
    requirements: [
      'Experience with React and TypeScript',
      'Knowledge of modern web development practices',
      'Experience with state management (Redux, Zustand)',
      'Familiarity with testing frameworks (Jest, Cypress)'
    ],
    skills_required: ['React', 'TypeScript', 'JavaScript', 'CSS', 'HTML', 'Redux', 'Testing'],
    keywords: ['frontend', 'react', 'typescript', 'senior', 'web development'],
    company_signals: ['Fast-growing startup', 'Remote-first culture', 'Focus on innovation'],
    source_urls: ['https://techcorp.com/careers/senior-frontend-dev'],
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z'
  },
  {
    id: '2',
    user_id: 'user-1',
    title: 'Product Manager',
    company_name: 'StartupX',
    job_description: 'Drive product strategy and execution...',
    requirements: [
      '3+ years of product management experience',
      'Strong analytical and communication skills',
      'Experience with agile methodologies',
      'Data-driven decision making'
    ],
    skills_required: ['Product Management', 'Analytics', 'Agile', 'Leadership', 'Communication'],
    keywords: ['product', 'manager', 'strategy', 'analytics'],
    company_signals: ['Series B startup', 'Product-focused culture', 'Data-driven'],
    source_urls: ['https://startupx.com/careers/product-manager'],
    created_at: '2024-01-10T14:30:00Z',
    updated_at: '2024-01-10T14:30:00Z'
  }
];

export const mockQuestions: Question[] = [
  {
    id: 'q1',
    session_id: 's1',
    question_text: 'Tell me about a time when you had to solve a complex technical problem with limited resources.',
    question_type: 'behavioral',
    difficulty: 'medium',
    expected_duration_seconds: 180,
    order_index: 1,
    created_at: '2024-01-20T10:00:00Z'
  },
  {
    id: 'q2',
    session_id: 's1',
    question_text: 'How would you approach building a scalable React application from scratch?',
    question_type: 'technical',
    difficulty: 'hard',
    expected_duration_seconds: 240,
    order_index: 2,
    created_at: '2024-01-20T10:00:00Z'
  },
  {
    id: 'q3',
    session_id: 's1',
    question_text: 'Describe a situation where you had to work with a difficult team member.',
    question_type: 'behavioral',
    difficulty: 'medium',
    expected_duration_seconds: 150,
    order_index: 3,
    created_at: '2024-01-20T10:00:00Z'
  }
];

export const mockAnswers: Answer[] = [
  {
    id: 'a1',
    question_id: 'q1',
    session_id: 's1',
    transcript: 'I remember working on a project where we had to optimize a slow-performing dashboard. We had limited time and budget constraints...',
    duration_seconds: 185,
    communication_score: 8.5,
    technical_score: 7.8,
    confidence_score: 8.2,
    clarity_score: 8.0,
    structure_score: 7.5,
    submitted_at: '2024-01-20T10:05:00Z',
    created_at: '2024-01-20T10:05:00Z'
  },
  {
    id: 'a2',
    question_id: 'q2',
    session_id: 's1',
    transcript: 'For building a scalable React application, I would start with a solid architecture foundation. First, I would set up a monorepo structure...',
    duration_seconds: 245,
    communication_score: 9.0,
    technical_score: 9.2,
    confidence_score: 8.8,
    clarity_score: 8.5,
    structure_score: 9.0,
    submitted_at: '2024-01-20T10:10:00Z',
    created_at: '2024-01-20T10:10:00Z'
  }
];

export const mockFeedbacks: Feedback[] = [
  {
    id: 'f1',
    session_id: 's1',
    answer_id: 'a1',
    feedback_type: 'question',
    skill_category: 'technical',
    highlights: [
      'Demonstrated clear problem-solving methodology',
      'Showed awareness of resource constraints',
      'Provided specific examples from real experience'
    ],
    improvements: [
      'Could have mentioned specific metrics to show impact',
      'Would benefit from discussing alternative approaches considered'
    ],
    action_items: [
      'Practice quantifying results with specific numbers',
      'Prepare examples that show different problem-solving approaches'
    ],
    detailed_feedback: 'Your response showed solid technical problem-solving skills and awareness of business constraints. The structure was logical, following a problem-action-result format. To strengthen future responses, consider including specific metrics that demonstrate the impact of your solution.',
    evidence_points: [
      'Used STAR method effectively',
      'Mentioned budget and time constraints',
      'Described technical implementation details'
    ],
    created_at: '2024-01-20T10:15:00Z'
  },
  {
    id: 'f2',
    session_id: 's1',
    feedback_type: 'overall',
    highlights: [
      'Strong technical knowledge demonstrated throughout',
      'Good communication clarity and structure',
      'Confident delivery with appropriate pacing'
    ],
    improvements: [
      'Some responses could be more concise',
      'Include more quantitative results',
      'Practice behavioral question frameworks'
    ],
    action_items: [
      'Prepare 3-5 key stories using STAR method',
      'Practice 90-second elevator pitches for technical concepts',
      'Research company-specific technical challenges'
    ],
    detailed_feedback: 'Overall, this was a strong interview performance. Your technical expertise is evident, and you communicate complex concepts clearly. Focus on making your responses more impactful by including specific metrics and being more concise in your storytelling.',
    created_at: '2024-01-20T10:20:00Z'
  }
];

export const mockSessions: InterviewSession[] = [
  {
    id: 's1',
    user_id: 'user-1',
    job_context_id: '1',
    job_context: mockJobContexts[0],
    title: 'Frontend Developer Interview - TechCorp',
    status: 'completed',
    session_type: 'mixed',
    duration_minutes: 45,
    overall_score: 8.4,
    communication_score: 8.5,
    technical_score: 8.7,
    confidence_score: 8.0,
    started_at: '2024-01-20T10:00:00Z',
    completed_at: '2024-01-20T10:45:00Z',
    created_at: '2024-01-20T09:55:00Z',
    updated_at: '2024-01-20T10:45:00Z',
    questions: mockQuestions,
    answers: mockAnswers,
    feedbacks: mockFeedbacks
  },
  {
    id: 's2',
    user_id: 'user-1',
    job_context_id: '2',
    job_context: mockJobContexts[1],
    title: 'Product Manager Interview - StartupX',
    status: 'completed',
    session_type: 'behavioral',
    duration_minutes: 30,
    overall_score: 7.8,
    communication_score: 8.2,
    technical_score: 7.5,
    confidence_score: 7.6,
    started_at: '2024-01-18T14:00:00Z',
    completed_at: '2024-01-18T14:30:00Z',
    created_at: '2024-01-18T13:55:00Z',
    updated_at: '2024-01-18T14:30:00Z'
  },
  {
    id: 's3',
    user_id: 'user-1',
    title: 'Practice Session - Technical Focus',
    status: 'planned',
    session_type: 'technical',
    duration_minutes: 60,
    created_at: '2024-01-22T16:00:00Z',
    updated_at: '2024-01-22T16:00:00Z'
  }
];

export const mockKPIData: KPIData = {
  lastScore: 8.4,
  trend: 0.6, // +0.6 points from last session
  totalSessions: 8,
  avgImprovement: 1.2
};

export const mockChartData: ChartData[] = [
  { date: '2024-01-10', overall: 7.2, communication: 7.0, technical: 7.5, confidence: 7.0 },
  { date: '2024-01-12', overall: 7.8, communication: 7.8, technical: 7.6, confidence: 8.0 },
  { date: '2024-01-15', overall: 8.1, communication: 8.0, technical: 8.2, confidence: 8.1 },
  { date: '2024-01-18', overall: 7.8, communication: 8.2, technical: 7.5, confidence: 7.6 },
  { date: '2024-01-20', overall: 8.4, communication: 8.5, technical: 8.7, confidence: 8.0 },
];

// Mock service functions
export const mockBeyondPresenceService = {
  startInterview: async (params: { role: string }) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { sessionId: 'bp-' + Date.now(), status: 'started' };
  },
  
  askNext: async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const questions = mockQuestions;
    return questions[Math.floor(Math.random() * questions.length)];
  },
  
  ingestAnswer: async (params: { videoUrl?: string; transcript?: string }) => {
    await new Promise(resolve => setTimeout(resolve, 800));
    return { processed: true, scores: { clarity: 8.2, confidence: 7.8 } };
  },
  
  endInterview: async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { status: 'completed', recordingUrl: 'https://example.com/recording.mp4' };
  }
};

export const mockLightpandaService = {
  fetchJobContext: async (params: { urls: string[]; pdf?: File }) => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    return {
      requirements: ['React experience', 'TypeScript proficiency', 'Team collaboration'],
      skills: ['JavaScript', 'React', 'TypeScript', 'CSS', 'HTML'],
      keywords: ['frontend', 'web development', 'user interface'],
      companySignals: ['Growing startup', 'Tech-focused', 'Remote-friendly']
    };
  }
};