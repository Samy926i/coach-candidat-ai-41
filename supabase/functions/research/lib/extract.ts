/**
 * Job data extraction from scraped content using AI and heuristics
 */

interface ScrapedData {
  text: string;
  title?: string;
  canonical?: string;
  metaTags: Record<string, string>;
  jsonLD: any[];
  url: string;
}

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

export async function extractJobData(scrapedData: ScrapedData, originalUrl: string): Promise<JobData> {
  console.log('[extract] Starting job data extraction');
  
  // First, try to extract from JSON-LD structured data
  const jsonLDData = extractFromJsonLD(scrapedData.jsonLD);
  
  // Then use AI to extract and enrich from text content
  const aiData = await extractWithAI(scrapedData);
  
  // Merge and normalize the data
  const jobData = mergeAndNormalize(jsonLDData, aiData, scrapedData, originalUrl);
  
  console.log(`[extract] Extracted job data for: ${jobData.role_title} at ${jobData.company_name}`);
  return jobData;
}

function extractFromJsonLD(jsonLD: any[]): Partial<JobData> {
  const jobPosting = jsonLD.find(item => 
    item['@type'] === 'JobPosting' || 
    (Array.isArray(item['@type']) && item['@type'].includes('JobPosting'))
  );
  
  if (!jobPosting) {
    console.log('[extract] No JobPosting JSON-LD found');
    return {};
  }
  
  console.log('[extract] Found JobPosting JSON-LD data');
  
  const result: Partial<JobData> = {};
  
  if (jobPosting.title) result.role_title = jobPosting.title;
  if (jobPosting.hiringOrganization?.name) result.company_name = jobPosting.hiringOrganization.name;
  if (jobPosting.jobLocation?.address) {
    const addr = jobPosting.jobLocation.address;
    result.location = typeof addr === 'string' ? addr : 
      `${addr.addressLocality || ''}, ${addr.addressRegion || ''}`.trim().replace(/^,|,$/, '');
  }
  if (jobPosting.baseSalary) {
    const salary = jobPosting.baseSalary;
    if (salary.value) {
      result.salary = `${salary.value.minValue || ''}-${salary.value.maxValue || ''} ${salary.currency || ''}`.trim();
    }
  }
  
  // Extract skills and requirements from description
  if (jobPosting.description) {
    const skills = extractSkillsFromText(jobPosting.description);
    result.must_have = skills.technical;
    result.soft_skills = skills.soft;
  }
  
  return result;
}

async function extractWithAI(scrapedData: ScrapedData): Promise<Partial<JobData>> {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }
  
  console.log('[extract] Using AI to extract job data');
  
  // Prepare content for AI analysis
  const content = `
TITLE: ${scrapedData.title || ''}
META DESCRIPTION: ${scrapedData.metaTags['description'] || ''}
CANONICAL URL: ${scrapedData.canonical || ''}

CONTENT:
${scrapedData.text.slice(0, 8000)} // Limit to avoid token limits
  `.trim();
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert job posting analyzer. Extract structured information from job postings and return ONLY valid JSON.

Extract the following:
- company_name: Company name
- role_title: Job title/position
- seniority: "intern", "junior", "mid", "senior", "lead", or "staff" (infer from title/requirements)
- contract: Contract type if mentioned (CDI, CDD, freelance, etc.)
- location: Work location
- salary: Salary range if mentioned
- must_have: Array of REQUIRED technical skills and qualifications
- nice_to_have: Array of PREFERRED/BONUS skills
- responsibilities: Array of main job responsibilities
- soft_skills: Array of soft skills mentioned (communication, leadership, etc.)
- culture_signals: Array of company culture indicators (values, work style, etc.)

IMPORTANT: 
- Distinguish clearly between must_have (required) vs nice_to_have (preferred)
- Normalize technical skills (e.g. "React.js", "Python 3.x", "Kubernetes")
- Focus on concrete, specific information
- Return ONLY the JSON object, no explanations`
        },
        {
          role: 'user',
          content: `Extract structured job data from this posting (preserve UTF-8 characters):\n\n${content}`
        }
      ],
      temperature: 0.3,
      max_tokens: 2000,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`AI extraction failed: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  const extractedContent = data.choices[0].message.content;
  
  try {
    const aiData = JSON.parse(extractedContent);
    console.log('[extract] AI extraction successful');
    return aiData;
  } catch (error) {
    console.error('[extract] Failed to parse AI response:', error);
    throw new Error('Invalid AI response format');
  }
}

function mergeAndNormalize(jsonLDData: Partial<JobData>, aiData: Partial<JobData>, scrapedData: ScrapedData, originalUrl: string): JobData {
  // Merge data with AI taking precedence for most fields, JSON-LD for structured data
  const merged: JobData = {
    company_name: aiData.company_name || jsonLDData.company_name || 'Unknown Company',
    role_title: aiData.role_title || jsonLDData.role_title || 'Unknown Position',
    seniority: aiData.seniority || jsonLDData.seniority,
    contract: aiData.contract || jsonLDData.contract,
    location: aiData.location || jsonLDData.location,
    salary: aiData.salary || jsonLDData.salary,
    must_have: normalizeSkills(aiData.must_have || jsonLDData.must_have || []),
    nice_to_have: normalizeSkills(aiData.nice_to_have || jsonLDData.nice_to_have || []),
    responsibilities: aiData.responsibilities || jsonLDData.responsibilities || [],
    soft_skills: normalizeSkills(aiData.soft_skills || jsonLDData.soft_skills || []),
    culture_signals: aiData.culture_signals || jsonLDData.culture_signals || [],
    sources: [originalUrl]
  };
  
  // Additional heuristics for missing data
  if (!merged.seniority && merged.role_title) {
    merged.seniority = inferSeniorityFromTitle(merged.role_title);
  }
  
  return merged;
}

function normalizeSkills(skills: string[]): string[] {
  return skills
    .filter(skill => skill && skill.trim().length > 0)
    .map(skill => skill.trim())
    .map(skill => {
      // Normalize common technical terms
      const normalized = skill.toLowerCase();
      
      if (normalized.includes('react')) return 'React.js';
      if (normalized.includes('angular')) return 'Angular';
      if (normalized.includes('vue')) return 'Vue.js';
      if (normalized.includes('typescript')) return 'TypeScript';
      if (normalized.includes('javascript')) return 'JavaScript';
      if (normalized.includes('python')) return 'Python';
      if (normalized.includes('kubernetes')) return 'Kubernetes';
      if (normalized.includes('docker')) return 'Docker';
      if (normalized.includes('aws')) return 'AWS';
      if (normalized.includes('node')) return 'Node.js';
      
      // Return original if no normalization rule applies
      return skill;
    });
}

function inferSeniorityFromTitle(title: string): string | undefined {
  const lowerTitle = title.toLowerCase();
  
  if (lowerTitle.includes('intern') || lowerTitle.includes('stage')) return 'intern';
  if (lowerTitle.includes('junior')) return 'junior';
  if (lowerTitle.includes('senior') || lowerTitle.includes('sr.')) return 'senior';
  if (lowerTitle.includes('lead') || lowerTitle.includes('principal')) return 'lead';
  if (lowerTitle.includes('staff') || lowerTitle.includes('architect')) return 'staff';
  
  return 'mid'; // Default assumption
}

function extractSkillsFromText(text: string): { technical: string[], soft: string[] } {
  // This is a simplified implementation
  // In a real-world scenario, you'd use more sophisticated NLP
  
  const technical: string[] = [];
  const soft: string[] = [];
  
  const techKeywords = [
    'react', 'angular', 'vue', 'typescript', 'javascript', 'python', 'java',
    'kubernetes', 'docker', 'aws', 'gcp', 'azure', 'sql', 'nosql', 'git',
    'ci/cd', 'devops', 'microservices', 'api', 'rest', 'graphql'
  ];
  
  const softKeywords = [
    'communication', 'leadership', 'teamwork', 'problem solving', 'analytical',
    'creative', 'adaptable', 'organized', 'collaborative', 'initiative'
  ];
  
  const lowerText = text.toLowerCase();
  
  techKeywords.forEach(keyword => {
    if (lowerText.includes(keyword)) {
      technical.push(keyword.charAt(0).toUpperCase() + keyword.slice(1));
    }
  });
  
  softKeywords.forEach(keyword => {
    if (lowerText.includes(keyword)) {
      soft.push(keyword.charAt(0).toUpperCase() + keyword.slice(1));
    }
  });
  
  return { technical, soft };
}