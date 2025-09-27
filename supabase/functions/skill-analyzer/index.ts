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

    if (!openAIApiKey) {
      console.error('OpenAI API key not configured');
      return new Response(
        JSON.stringify({ error: 'Service de traitement non configuré. Veuillez contacter l\'administrateur.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
            content: `Analyze skills gap between (preserve all UTF-8 characters including international text, symbols, and emojis):

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
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, response.statusText, errorText);
      
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: 'Clé API OpenAI invalide. Veuillez vérifier la configuration.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de taux atteinte. Veuillez réessayer dans quelques instants.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        return new Response(
          JSON.stringify({ error: 'Service d\'analyse temporairement indisponible' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const data = await response.json();
    const analysisContent = data.choices[0]?.message?.content;

    if (!analysisContent) {
      return new Response(
        JSON.stringify({ error: 'Réponse vide du service d\'analyse' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Raw AI analysis:', analysisContent.substring(0, 200) + '...');

    // Enhanced JSON parsing with fallback
    let analysis: any;
    try {
      analysis = JSON.parse(analysisContent);
    } catch (parseError) {
      console.error('Direct JSON parsing failed, trying to extract JSON block:', parseError);
      
      // Try to extract JSON using regex
      const jsonMatch = analysisContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          analysis = JSON.parse(jsonMatch[0]);
        } catch (regexError) {
          console.error('Regex JSON extraction also failed:', regexError);
          return new Response(
            JSON.stringify({ error: 'Format de réponse invalide du service d\'analyse' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        return new Response(
          JSON.stringify({ error: 'Impossible d\'extraire l\'analyse des compétences' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('Successfully analyzed skills gap:', Object.keys(analysis));

    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' } }
    );

  } catch (error: any) {
    console.error('Error in skill-analyzer function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erreur interne du serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});