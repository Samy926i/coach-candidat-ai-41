import { z } from 'zod';

export const JobSchema = z.object({
  company_name: z.string().min(1, "Company name is required"),
  role_title: z.string().min(1, "Role title is required"),
  seniority: z.enum(['intern', 'junior', 'mid', 'senior', 'lead', 'staff']).optional(),
  contract: z.string().optional(),
  location: z.string().optional(),
  salary: z.string().optional(),
  must_have: z.array(z.string()).default([]),
  nice_to_have: z.array(z.string()).default([]),
  responsibilities: z.array(z.string()).default([]),
  soft_skills: z.array(z.string()).default([]),
  culture_signals: z.array(z.string()).default([]),
  sources: z.array(z.string()).default([])
});

export const InterviewPackSchema = z.object({
  rh_questions: z.array(z.object({
    q: z.string(),
    rubric: z.object({
      criteria: z.array(z.object({
        name: z.string(),
        desc: z.string(),
        weight: z.number().min(0).max(1)
      })),
      red_flags: z.array(z.string())
    })
  })),
  tech_questions: z.array(z.object({
    q: z.string(),
    level: z.number().min(1).max(3),
    topics: z.array(z.string()),
    answers_hint: z.string().optional()
  })),
  live_tasks: z.array(z.object({
    prompt: z.string(),
    input_format: z.string(),
    expected_dimensions: z.string().optional()
  })),
  scoring_model: z.object({
    weights: z.object({
      rh: z.number().min(0).max(1),
      tech: z.number().min(0).max(1)
    })
  })
});

export const ResearchRequestSchema = z.object({
  url: z.string().url("Invalid URL format")
});

export const ResearchResponseSchema = z.object({
  job: JobSchema,
  company: z.object({
    id: z.string(),
    name: z.string(),
    domain: z.string().optional(),
    culture_values: z.array(z.string()).optional(),
    about: z.string().optional(),
    sources: z.array(z.string()),
    created_at: z.string(),
    updated_at: z.string()
  }),
  interviewPack: InterviewPackSchema,
  sources: z.array(z.string())
});

export type JobData = z.infer<typeof JobSchema>;
export type InterviewPack = z.infer<typeof InterviewPackSchema>;
export type ResearchRequest = z.infer<typeof ResearchRequestSchema>;
export type ResearchResponse = z.infer<typeof ResearchResponseSchema>;