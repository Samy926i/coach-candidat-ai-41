import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CVEntity {
  skills: string[];
  experiences: Array<{
    title: string;
    company: string;
    duration: string;
    responsibilities: string[];
    technologies?: string[];
  }>;
  education: Array<{
    degree: string;
    institution: string;
    year: string;
    field?: string;
  }>;
  certifications?: string[];
  languages?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cvContent } = await req.json();

    if (!cvContent) {
      return new Response(
        JSON.stringify({ error: 'CV content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Parsing CV content with OpenAI...');

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
            content: `You are an expert CV parser. Extract structured information from CV content and return it as JSON.

Extract the following information:
- skills: Array of technical and soft skills
- experiences: Array of work experiences with title, company, duration, responsibilities, technologies
- education: Array of educational background
- certifications: Array of certifications if any
- languages: Array of languages if mentioned

Focus on being comprehensive and accurate. For technologies/skills, be specific (e.g., "React.js" instead of just "React").

Return ONLY valid JSON without any markdown formatting or explanations.`
          },
          {
            role: 'user',
            content: `Parse this CV content and extract structured information:\n\n${cvContent}`
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status, response.statusText);
      return new Response(
        JSON.stringify({ error: 'Failed to parse CV with AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const parsedContent = data.choices[0].message.content;

    console.log('Raw AI response:', parsedContent);

    // Try to parse the JSON response
    let cvEntity: CVEntity;
    try {
      cvEntity = JSON.parse(parsedContent);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid AI response format' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully parsed CV:', cvEntity);

    return new Response(
      JSON.stringify({ cv_analysis: cvEntity }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in cv-parser function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});