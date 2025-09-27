/**
 * PostgreSQL with pgvector integration for embeddings storage
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface JobData {
  company_name: string;
  role_title: string;
  seniority?: string;
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

interface CompanyData {
  name: string;
  culture_values?: string[];
  about?: string;
  sources?: string[];
}

export async function ensurePgvectorSetup(supabase: SupabaseClient) {
  console.log('[pgvector] Ensuring database setup');
  
  // Check if tables exist, create if needed
  const { data: tablesData, error: tablesError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .in('table_name', ['research_companies', 'research_job_postings', 'research_skills']);
  
  if (tablesError) {
    console.log('[pgvector] Could not check existing tables, assuming they exist');
    return;
  }
  
  const existingTables = tablesData?.map(t => t.table_name) || [];
  
  if (!existingTables.includes('research_companies')) {
    await createCompaniesTable(supabase);
  }
  
  if (!existingTables.includes('research_job_postings')) {
    await createJobPostingsTable(supabase);
  }
  
  if (!existingTables.includes('research_skills')) {
    await createSkillsTable(supabase);
  }
}

async function createCompaniesTable(supabase: SupabaseClient) {
  console.log('[pgvector] Creating research_companies table');
  
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS research_companies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        domain TEXT,
        culture_values TEXT[],
        about TEXT,
        sources TEXT[],
        embedding VECTOR(1536),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(name)
      );
      
      CREATE INDEX IF NOT EXISTS research_companies_embedding_idx 
      ON research_companies USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100);
      
      CREATE OR REPLACE FUNCTION update_research_companies_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      
      DROP TRIGGER IF EXISTS update_research_companies_updated_at ON research_companies;
      CREATE TRIGGER update_research_companies_updated_at
        BEFORE UPDATE ON research_companies
        FOR EACH ROW
        EXECUTE FUNCTION update_research_companies_updated_at();
    `
  });
  
  if (error) {
    console.error('[pgvector] Error creating companies table:', error);
  }
}

async function createJobPostingsTable(supabase: SupabaseClient) {
  console.log('[pgvector] Creating research_job_postings table');
  
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS research_job_postings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES research_companies(id),
        url TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        description TEXT,
        requirements TEXT[],
        skills_required TEXT[],
        skills_preferred TEXT[],
        location TEXT,
        salary_range TEXT,
        seniority_level TEXT,
        contract_type TEXT,
        sources TEXT[],
        embedding VECTOR(1536),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS research_job_postings_embedding_idx 
      ON research_job_postings USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100);
      
      CREATE INDEX IF NOT EXISTS research_job_postings_company_idx 
      ON research_job_postings (company_id);
      
      CREATE OR REPLACE FUNCTION update_research_job_postings_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      
      DROP TRIGGER IF EXISTS update_research_job_postings_updated_at ON research_job_postings;
      CREATE TRIGGER update_research_job_postings_updated_at
        BEFORE UPDATE ON research_job_postings
        FOR EACH ROW
        EXECUTE FUNCTION update_research_job_postings_updated_at();
    `
  });
  
  if (error) {
    console.error('[pgvector] Error creating job postings table:', error);
  }
}

async function createSkillsTable(supabase: SupabaseClient) {
  console.log('[pgvector] Creating research_skills table');
  
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS research_skills (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL CHECK (type IN ('hard', 'soft')),
        category TEXT,
        embedding VECTOR(1536),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS research_skills_embedding_idx 
      ON research_skills USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100);
      
      CREATE INDEX IF NOT EXISTS research_skills_type_idx 
      ON research_skills (type);
    `
  });
  
  if (error) {
    console.error('[pgvector] Error creating skills table:', error);
  }
}

export async function upsertJobAndCompany(
  supabase: SupabaseClient, 
  jobData: JobData, 
  companyData: CompanyData, 
  sources: string[]
) {
  console.log('[pgvector] Upserting job and company data');
  
  // Generate embeddings
  const companyEmbedding = await generateEmbedding(
    `${companyData.name} ${companyData.about || ''} ${companyData.culture_values?.join(' ') || ''}`
  );
  
  const jobEmbedding = await generateEmbedding(
    `${jobData.role_title} ${jobData.company_name} ${jobData.responsibilities.join(' ')} ${jobData.must_have.join(' ')}`
  );
  
  // Upsert company
  const { data: company, error: companyError } = await supabase
    .from('research_companies')
    .upsert({
      name: companyData.name,
      culture_values: companyData.culture_values || [],
      about: companyData.about || '',
      sources: companyData.sources || sources,
      embedding: `[${companyEmbedding.join(',')}]`
    }, { 
      onConflict: 'name',
      ignoreDuplicates: false 
    })
    .select()
    .single();
  
  if (companyError) {
    console.error('[pgvector] Company upsert error:', companyError);
    throw new Error(`Failed to upsert company: ${companyError.message}`);
  }
  
  // Upsert job posting
  const { data: jobPosting, error: jobError } = await supabase
    .from('research_job_postings')
    .upsert({
      company_id: company.id,
      url: jobData.sources[0],
      title: jobData.role_title,
      description: jobData.responsibilities.join('. '),
      requirements: [...jobData.must_have, ...jobData.nice_to_have],
      skills_required: jobData.must_have,
      skills_preferred: jobData.nice_to_have,
      location: jobData.location,
      salary_range: jobData.salary,
      seniority_level: jobData.seniority,
      contract_type: jobData.contract,
      sources: jobData.sources,
      embedding: `[${jobEmbedding.join(',')}]`
    }, { 
      onConflict: 'url',
      ignoreDuplicates: false 
    })
    .select()
    .single();
  
  if (jobError) {
    console.error('[pgvector] Job posting upsert error:', jobError);
    throw new Error(`Failed to upsert job posting: ${jobError.message}`);
  }
  
  // Upsert skills
  await upsertSkills(supabase, jobData);
  
  console.log('[pgvector] Successfully upserted job and company with embeddings');
  
  return { company, jobPosting };
}

async function upsertSkills(supabase: SupabaseClient, jobData: JobData) {
  const allSkills = [
    ...jobData.must_have.map(skill => ({ name: skill, type: 'hard' })),
    ...jobData.nice_to_have.map(skill => ({ name: skill, type: 'hard' })),
    ...jobData.soft_skills.map(skill => ({ name: skill, type: 'soft' }))
  ];
  
  for (const skill of allSkills) {
    try {
      const embedding = await generateEmbedding(skill.name);
      
      await supabase
        .from('research_skills')
        .upsert({
          name: skill.name,
          type: skill.type,
          embedding: `[${embedding.join(',')}]`
        }, { 
          onConflict: 'name',
          ignoreDuplicates: true 
        });
    } catch (error) {
      console.log(`[pgvector] Failed to upsert skill ${skill.name}:`, error);
      // Continue with other skills
    }
  }
}

async function generateEmbedding(text: string): Promise<number[]> {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured for embeddings');
  }
  
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-ada-002',
      input: text.slice(0, 8000) // Limit input length
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Embedding generation failed: ${response.status}`);
  }
  
  const data = await response.json();
  return data.data[0].embedding;
}