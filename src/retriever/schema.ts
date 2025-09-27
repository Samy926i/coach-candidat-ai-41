import { z } from 'zod';

export const LocationSchema = z.object({
  city: z.string().default(''),
  region: z.string().default(''),
  country: z.string().default(''),
  remote_policy: z.string().default('')
});

export const SalarySchema = z.object({
  min: z.number().nullable().default(null),
  max: z.number().nullable().default(null),
  currency: z.string().default(''),
  period: z.string().default('')
});

export const ExperienceSchema = z.object({
  min_years: z.number().nullable().default(null),
  max_years: z.number().nullable().default(null)
});

export const CompanyLocationSchema = z.object({
  city: z.string().default(''),
  region: z.string().default(''),
  country: z.string().default('')
});

export const EmployeeSizeSchema = z.object({
  min: z.number().nullable().default(null),
  max: z.number().nullable().default(null)
});

export const WorkCultureSchema = z.object({
  values: z.array(z.string()).default([]),
  benefits: z.array(z.string()).default([]),
  remote_policy: z.string().default('')
});

export const FundingSchema = z.object({
  status: z.string().default(''),
  latest_round: z.string().default(''),
  investors: z.array(z.string()).default([])
});

export const JobSchema = z.object({
  source_url: z.string().default(''),
  title: z.string().default(''),
  role_seniority: z.string().default(''),
  department_function: z.string().default(''),
  contract_type: z.string().default(''),
  work_model: z.string().default(''),
  location: LocationSchema.default({ city: '', region: '', country: '', remote_policy: '' }),
  salary: SalarySchema.default({ min: null, max: null, currency: '', period: '' }),
  required_experience: ExperienceSchema.default({ min_years: null, max_years: null }),
  required_education: z.string().default(''),
  languages: z.array(z.string()).default([]),
  hard_skills: z.array(z.string()).default([]),
  soft_skills: z.array(z.string()).default([]),
  tech_stack: z.array(z.string()).default([]),
  responsibilities: z.array(z.string()).default([]),
  nice_to_have: z.array(z.string()).default([]),
  visa_sponsorship: z.boolean().nullable().default(null),
  relocation: z.boolean().nullable().default(null),
  posting_date: z.string().default(''),
  application_deadline: z.string().default(''),
  description_text: z.string().default(''),
  raw_schema_org: z.record(z.any()).default({}),
  detected_duplicates: z.array(z.string()).default([])
});

export const CompanySchema = z.object({
  name: z.string().default(''),
  aka: z.array(z.string()).default([]),
  website: z.string().default(''),
  linkedin_url: z.string().default(''),
  wikipedia_url: z.string().default(''),
  industry: z.string().default(''),
  company_type: z.string().default(''),
  founded_year: z.number().nullable().default(null),
  size_employees: EmployeeSizeSchema.default({ min: null, max: null }),
  hq_location: CompanyLocationSchema.default({ city: '', region: '', country: '' }),
  locations: z.array(CompanyLocationSchema).default([]),
  work_culture: WorkCultureSchema.default({ values: [], benefits: [], remote_policy: '' }),
  funding: FundingSchema.default({ status: '', latest_round: '', investors: [] }),
  public_ticker: z.string().default(''),
  about_summary: z.string().default(''),
  data_sources: z.array(z.string()).default([])
});

export const MetadataSchema = z.object({
  scraped_at: z.string().default(() => new Date().toISOString()),
  agent: z.string().default('lightpanda+puppeteer'),
  notes: z.array(z.string()).default([])
});

export const JobDataSchema = z.object({
  job: JobSchema,
  company: CompanySchema,
  metadata: MetadataSchema
});

export type JobData = z.infer<typeof JobDataSchema>;
export type Job = z.infer<typeof JobSchema>;
export type Company = z.infer<typeof CompanySchema>;
export type Metadata = z.infer<typeof MetadataSchema>;
