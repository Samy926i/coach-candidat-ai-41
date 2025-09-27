import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface JDRequirements {
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobUrl } = await req.json();

    if (!jobUrl) {
      return new Response(
        JSON.stringify({ error: 'Job URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching job description from:', jobUrl);

    // Fetch the job page content
    const response = await fetch(jobUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      console.error('Failed to fetch job page:', response.status, response.statusText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch job description page' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const htmlContent = await response.text();
    console.log('Fetched HTML content, length:', htmlContent.length);

    // Normalize Unicode content for consistency
    const normalizedHtml = htmlContent.normalize ? htmlContent.normalize('NFC') : htmlContent;

    // Extract text content and clean it using AI
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: `You are an expert job description parser. Extract structured information from HTML content of job postings.

Extract the following information:
- title: Job title
- company: Company name
- skills_required: Required technical and soft skills (be specific)
- skills_preferred: Nice-to-have skills
- responsibilities: Key job responsibilities
- qualifications: Required qualifications/experience
- experience_level: Entry/Mid/Senior level
- location: Work location if mentioned
- salary_range: Salary information if mentioned
- benefits: Benefits mentioned if any

Be thorough and accurate. For skills, be specific (e.g., "React.js", "Python 3.x").
Return ONLY valid JSON without any markdown formatting or explanations.`
          },
          {
            role: 'user',
            content: `Parse this job posting HTML and extract structured information. The content may contain international characters, symbols, and emojis - preserve all UTF-8 characters accurately:\n\n${normalizedHtml.slice(0, 8000)}`
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      console.error('OpenAI API error:', aiResponse.status, aiResponse.statusText);
      return new Response(
        JSON.stringify({ error: 'Failed to parse job description with AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const parsedContent = aiData.choices[0].message.content;

    console.log('Raw AI response:', parsedContent);

    // Try to parse the JSON response
    let jdRequirements: JDRequirements;
    try {
      jdRequirements = JSON.parse(parsedContent);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid AI response format' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully parsed job description:', jdRequirements);

    return new Response(
      JSON.stringify({ jd_requirements: jdRequirements }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' } }
    );

  } catch (error: any) {
    console.error('Error in jd-fetcher function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});