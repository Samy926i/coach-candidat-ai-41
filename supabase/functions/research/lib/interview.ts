/**
 * Interview pack generation using AI
 */

interface JobData {
  company_name: string;
  role_title: string;
  seniority?: string;
  must_have: string[];
  nice_to_have: string[];
  responsibilities: string[];
  soft_skills: string[];
  culture_signals: string[];
}

interface CompanyData {
  name: string;
  culture_values?: string[];
  about?: string;
}

interface InterviewPack {
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

export async function generateInterviewPack(jobData: JobData, companyData: CompanyData): Promise<InterviewPack> {
  console.log('[interview] Generating interview pack');
  
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }
  
  // Determine scoring weights based on role type
  const weights = calculateScoringWeights(jobData.role_title, jobData.must_have);
  
  // Generate RH questions
  const rhQuestions = await generateRHQuestions(jobData, companyData, openAIApiKey);
  
  // Generate technical questions
  const techQuestions = await generateTechQuestions(jobData, openAIApiKey);
  
  // Generate live tasks
  const liveTasks = await generateLiveTasks(jobData, openAIApiKey);
  
  return {
    rh_questions: rhQuestions,
    tech_questions: techQuestions,
    live_tasks: liveTasks,
    scoring_model: {
      weights
    }
  };
}

function calculateScoringWeights(roleTitle: string, techSkills: string[]): { rh: number; tech: number } {
  const role = roleTitle.toLowerCase();
  
  // More technical roles get higher tech weight
  if (role.includes('senior') || role.includes('lead') || role.includes('architect')) {
    return { rh: 0.3, tech: 0.7 };
  }
  
  if (role.includes('manager') || role.includes('director')) {
    return { rh: 0.7, tech: 0.3 };
  }
  
  // Very technical roles
  if (role.includes('engineer') || role.includes('developer') || role.includes('devops')) {
    return { rh: 0.4, tech: 0.6 };
  }
  
  // Default balanced approach
  return { rh: 0.5, tech: 0.5 };
}

async function generateRHQuestions(jobData: JobData, companyData: CompanyData, apiKey: string) {
  console.log('[interview] Generating RH questions with STAR method');
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert HR interviewer. Generate behavioral interview questions using the STAR method (Situation, Task, Action, Result).

For each question, provide:
- q: The question text (STAR-focused)
- rubric.criteria: Array of evaluation criteria with weight (must sum to 1.0)
- rubric.red_flags: Array of concerning responses to watch for

Focus on:
- Company culture alignment
- Soft skills validation
- Leadership and collaboration
- Problem-solving approach
- Growth mindset

Generate 4-5 strategic questions. Return ONLY valid JSON array.`
        },
        {
          role: 'user',
          content: `Generate RH/behavioral questions for:

ROLE: ${jobData.role_title} at ${jobData.company_name}
SENIORITY: ${jobData.seniority || 'mid'}
SOFT SKILLS: ${jobData.soft_skills.join(', ')}
CULTURE SIGNALS: ${jobData.culture_signals.join(', ')}
COMPANY VALUES: ${companyData.culture_values?.join(', ') || 'Not specified'}

Create STAR-method questions with detailed evaluation rubrics.`
        }
      ],
      temperature: 0.4,
      max_tokens: 2500,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`RH question generation failed: ${response.status}`);
  }
  
  const data = await response.json();
  const content = data.choices[0].message.content;
  
  try {
    return JSON.parse(content);
  } catch {
    throw new Error('Invalid RH questions format from AI');
  }
}

async function generateTechQuestions(jobData: JobData, apiKey: string) {
  console.log('[interview] Generating technical questions');
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a technical interviewer. Generate technical questions across 3 difficulty levels:

Level 1 (Easy): Fundamental concepts, basic syntax, simple problems
Level 2 (Medium): Applied knowledge, system design, best practices  
Level 3 (Hard): Complex scenarios, optimization, architecture

For each question provide:
- q: The question text
- level: 1, 2, or 3
- topics: Array of technical topics covered
- answers_hint: Brief guidance on expected answer quality (optional)

Generate 6-8 questions total, balanced across levels. Return ONLY valid JSON array.`
        },
        {
          role: 'user',
          content: `Generate technical questions for:

ROLE: ${jobData.role_title}
REQUIRED SKILLS: ${jobData.must_have.join(', ')}
PREFERRED SKILLS: ${jobData.nice_to_have.join(', ')}
RESPONSIBILITIES: ${jobData.responsibilities.join(', ')}

Focus on practical, role-relevant technical scenarios.`
        }
      ],
      temperature: 0.4,
      max_tokens: 3000,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Tech question generation failed: ${response.status}`);
  }
  
  const data = await response.json();
  const content = data.choices[0].message.content;
  
  try {
    return JSON.parse(content);
  } catch {
    throw new Error('Invalid tech questions format from AI');
  }
}

async function generateLiveTasks(jobData: JobData, apiKey: string) {
  console.log('[interview] Generating live coding tasks');
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a technical interviewer creating hands-on coding exercises. Generate 2-3 practical tasks:

For each task provide:
- prompt: Clear task description (what to build/solve)
- input_format: Expected input format or setup
- expected_dimensions: Time estimate and scope (e.g., "15-20 minutes, focus on logic over optimization")

Create realistic, role-appropriate tasks that can be completed in an interview setting.
Return ONLY valid JSON array.`
        },
        {
          role: 'user',
          content: `Generate live coding tasks for:

ROLE: ${jobData.role_title}
TECH STACK: ${jobData.must_have.slice(0, 5).join(', ')}
RESPONSIBILITIES: ${jobData.responsibilities.slice(0, 3).join(', ')}

Focus on practical problems they would solve in this role.`
        }
      ],
      temperature: 0.5,
      max_tokens: 1500,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Live task generation failed: ${response.status}`);
  }
  
  const data = await response.json();
  const content = data.choices[0].message.content;
  
  try {
    return JSON.parse(content);
  } catch {
    throw new Error('Invalid live tasks format from AI');
  }
}