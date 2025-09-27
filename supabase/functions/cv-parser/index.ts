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
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    if (!openAIApiKey) {
      console.error('OpenAI API key not configured');
      return new Response(
        JSON.stringify({ error: 'Service de traitement non configuré. Veuillez contacter l\'administrateur.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Normalize Unicode content to NFC for consistency
    const normalizedContent = cvContent.normalize ? cvContent.normalize('NFC') : cvContent;

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
            content: `Parse this CV content and extract structured information. The content may contain international characters, symbols, and emojis - preserve all UTF-8 characters accurately:\n\n${normalizedContent}`
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, response.statusText, errorText);
      
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: 'Clé API OpenAI invalide. Veuillez vérifier la configuration.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' } }
        );
      } else if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de taux atteinte. Veuillez réessayer dans quelques instants.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' } }
        );
      } else {
        return new Response(
          JSON.stringify({ error: 'Service temporairement indisponible. Veuillez réessayer.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' } }
        );
      }
    }

    const data = await response.json();
    const parsedContent = data.choices[0]?.message?.content;

    if (!parsedContent) {
      console.error('Empty response from OpenAI');
      return new Response(
        JSON.stringify({ error: 'Réponse vide du service de traitement' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    console.log('Raw AI response:', parsedContent.substring(0, 200) + '...');

    // Enhanced JSON parsing with fallback
    let cvEntity: CVEntity;
    try {
      // Try direct parsing first
      cvEntity = JSON.parse(parsedContent);
    } catch (parseError) {
      console.error('Direct JSON parsing failed, trying to extract JSON block:', parseError);
      
      // Try to extract JSON using regex
      const jsonMatch = parsedContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          cvEntity = JSON.parse(jsonMatch[0]);
        } catch (regexError) {
          console.error('Regex JSON extraction also failed:', regexError);
          return new Response(
            JSON.stringify({ error: 'Format de réponse invalide du service de traitement' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' } }
          );
        }
      } else {
        return new Response(
          JSON.stringify({ error: 'Impossible d\'extraire les données structurées' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' } }
        );
      }
    }

    console.log('Successfully parsed CV:', Object.keys(cvEntity));

    return new Response(
      JSON.stringify({ cv_analysis: cvEntity }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' } }
    );

  } catch (error: any) {
    console.error('Error in cv-parser function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erreur interne du serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
});