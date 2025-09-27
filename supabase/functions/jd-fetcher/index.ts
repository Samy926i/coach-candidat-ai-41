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

    if (!openAIApiKey) {
      console.error('OpenAI API key not configured');
      return new Response(
        JSON.stringify({ error: 'Service de traitement non configuré. Veuillez contacter l\'administrateur.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching job description from:', jobUrl);

    // Fetch the job page content with better error handling
    let response;
    try {
      response = await fetch(jobUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
    } catch (fetchError) {
      console.error('Network error fetching job page:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Impossible d\'accéder à l\'URL fournie. Vérifiez l\'URL et votre connexion.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!response.ok) {
      console.error('Failed to fetch job page:', response.status, response.statusText);
      if (response.status === 404) {
        return new Response(
          JSON.stringify({ error: 'Page d\'offre d\'emploi non trouvée. Vérifiez l\'URL.' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else if (response.status === 403) {
        return new Response(
          JSON.stringify({ error: 'Accès refusé à cette page. Essayez une autre URL d\'offre.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        return new Response(
          JSON.stringify({ error: 'Erreur lors de la récupération de la page d\'offre d\'emploi' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const htmlContent = await response.text();
    console.log('Fetched HTML content, length:', htmlContent.length);

    if (htmlContent.length < 100) {
      return new Response(
        JSON.stringify({ error: 'Contenu de page insuffisant. L\'URL fournie ne contient pas d\'offre d\'emploi valide.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
      const errorText = await aiResponse.text();
      console.error('OpenAI API error:', aiResponse.status, aiResponse.statusText, errorText);
      
      if (aiResponse.status === 401) {
        return new Response(
          JSON.stringify({ error: 'Clé API OpenAI invalide. Veuillez vérifier la configuration.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de taux atteinte. Veuillez réessayer dans quelques instants.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        return new Response(
          JSON.stringify({ error: 'Service de traitement temporairement indisponible' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const aiData = await aiResponse.json();
    const parsedContent = aiData.choices[0]?.message?.content;

    if (!parsedContent) {
      return new Response(
        JSON.stringify({ error: 'Réponse vide du service de traitement' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Raw AI response:', parsedContent.substring(0, 200) + '...');

    // Enhanced JSON parsing with fallback
    let jdRequirements: JDRequirements;
    try {
      jdRequirements = JSON.parse(parsedContent);
    } catch (parseError) {
      console.error('Direct JSON parsing failed, trying to extract JSON block:', parseError);
      
      // Try to extract JSON using regex
      const jsonMatch = parsedContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          jdRequirements = JSON.parse(jsonMatch[0]);
        } catch (regexError) {
          console.error('Regex JSON extraction also failed:', regexError);
          return new Response(
            JSON.stringify({ error: 'Format de réponse invalide du service de traitement' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        return new Response(
          JSON.stringify({ error: 'Impossible d\'extraire les exigences du poste' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('Successfully parsed job description:', Object.keys(jdRequirements));

    return new Response(
      JSON.stringify({ jd_requirements: jdRequirements }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' } }
    );

  } catch (error: any) {
    console.error('Error in jd-fetcher function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erreur interne du serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});