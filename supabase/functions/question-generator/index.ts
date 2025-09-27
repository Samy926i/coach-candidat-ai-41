import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InterviewQuestion {
  id: string;
  question: string;
  type: 'behavioral' | 'technical' | 'scenario';
  skill_focus: string;
  difficulty: 'easy' | 'medium' | 'hard';
  expected_answer_points: string[];
  follow_up_questions?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cvAnalysis, jdRequirements, gapAnalysis } = await req.json();

    if (!cvAnalysis || !jdRequirements || !gapAnalysis) {
      return new Response(
        JSON.stringify({ error: 'CV analysis, JD requirements, and gap analysis are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating interview questions...');

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
            content: `You are an expert interview designer. Generate 8-10 targeted interview questions based on CV analysis, job requirements, and skill gaps.

Question distribution:
- 40% on CONFIRMED SKILLS (validate experience depth)
- 35% on SKILL GAPS (test adaptability/learning potential)
- 25% on ROLE-SPECIFIC SCENARIOS (job context)

For each question, provide:
- id: unique identifier
- question: the actual question text
- type: "behavioral", "technical", or "scenario"
- skill_focus: specific skill being tested
- difficulty: "easy", "medium", or "hard"
- expected_answer_points: key points a good answer should cover
- follow_up_questions: optional deeper probes

Focus on:
- Realistic scenarios from the actual job description
- STAR method for behavioral questions
- Practical application rather than theoretical knowledge
- Growth mindset and learning ability for gaps

Return JSON array of interview questions without markdown formatting.`
          },
          {
            role: 'user',
            content: `Generate targeted interview questions based on (preserve all UTF-8 characters including international text, symbols, and emojis):

CANDIDATE STRENGTHS:
${JSON.stringify(gapAnalysis.strengths, null, 2)}

SKILL GAPS:
${JSON.stringify(gapAnalysis.gaps, null, 2)}

JOB CONTEXT:
${JSON.stringify(jdRequirements, null, 2)}

CANDIDATE BACKGROUND:
${JSON.stringify(cvAnalysis, null, 2)}

Generate 8-10 strategic questions that test both strengths and adaptability.`
          }
        ],
        temperature: 0.4,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status, response.statusText);
      return new Response(
        JSON.stringify({ error: 'Failed to generate questions with AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const questionsContent = data.choices[0].message.content;

    console.log('Raw AI questions:', questionsContent);

    // Parse the AI response
    let questions: InterviewQuestion[];
    try {
      questions = JSON.parse(questionsContent);
    } catch (parseError) {
      console.error('Failed to parse AI questions as JSON:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid AI questions format' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ensure each question has an id
    questions = questions.map((q, index) => ({
      ...q,
      id: q.id || `q_${index + 1}_${Date.now()}`
    }));

    console.log('Successfully generated questions:', questions.length);

    return new Response(
      JSON.stringify({ interview_questions: questions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' } }
    );

  } catch (error: any) {
    console.error('Error in question-generator function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});