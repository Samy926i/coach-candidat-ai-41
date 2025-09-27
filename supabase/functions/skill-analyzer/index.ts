import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SkillMapping {
  skill: string;
  status: 'match' | 'partial' | 'missing';
  cv_evidence?: string[];
  importance: 'critical' | 'important' | 'nice-to-have';
}

interface GapAnalysis {
  strengths: SkillMapping[];
  gaps: SkillMapping[];
  partial_matches: SkillMapping[];
  overall_match_percentage: number;
  recommendations: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cvAnalysis, jdRequirements } = await req.json();

    if (!cvAnalysis || !jdRequirements) {
      return new Response(
        JSON.stringify({ error: 'CV analysis and JD requirements are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Analyzing skills gap...');

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
            content: `You are an expert career advisor performing skill gap analysis. Compare a candidate's CV against job requirements.

For each required/preferred skill in the job description, determine:
- status: "match" (candidate has it), "partial" (some experience), "missing" (not found)
- cv_evidence: Array of specific evidence from CV if match/partial
- importance: "critical" (must-have), "important" (very beneficial), "nice-to-have" (bonus)

Then provide:
- strengths: Skills where candidate matches well
- gaps: Critical/important missing skills
- partial_matches: Skills with some but incomplete experience
- overall_match_percentage: 0-100% match score
- recommendations: Specific advice for improving candidacy

Return ONLY valid JSON without markdown formatting.`
          },
          {
            role: 'user',
            content: `Analyze skills gap between:

CANDIDATE CV:
${JSON.stringify(cvAnalysis, null, 2)}

JOB REQUIREMENTS:
${JSON.stringify(jdRequirements, null, 2)}

Provide detailed gap analysis.`
          }
        ],
        temperature: 0.3,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status, response.statusText);
      return new Response(
        JSON.stringify({ error: 'Failed to analyze skills with AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const analysisContent = data.choices[0].message.content;

    console.log('Raw AI analysis:', analysisContent);

    // Parse the AI response
    let analysis: any;
    try {
      analysis = JSON.parse(analysisContent);
    } catch (parseError) {
      console.error('Failed to parse AI analysis as JSON:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid AI analysis format' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully analyzed skills gap:', analysis);

    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in skill-analyzer function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});