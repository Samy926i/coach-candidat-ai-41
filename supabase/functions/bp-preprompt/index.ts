// deno-lint-ignore-file no-explicit-any
// Supabase Edge Function: Create a Beyond Presence agent with a pre-prompt and return a hosted link
// POST /bp-preprompt
// Body: {
//   name?, language?, greeting?, avatar_id?,
//   jobTitle?, companyName?, jobDescription?, questions?: string[],
//   promptStyle?: "mvp" | "full", testLineAtStart?: string,
//   createSession?: boolean, metadata?: Record<string, any>
// }

const BP_API_BASE = Deno.env.get("BP_API_BASE") ?? "https://api.bey.dev";
const BP_API_KEY = Deno.env.get("BP_API_KEY");
const BP_DEFAULT_AVATAR = Deno.env.get("BP_AVATAR_ID");
const BP_DEFAULT_LANG = Deno.env.get("BP_LANGUAGE") ?? "fr-FR";

function corsHeaders(origin?: string): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  };
}

interface BuildPromptInput {
  jobTitle?: string;
  companyName?: string;
  jobDescription?: string;
  questions?: string[];
  style?: "mvp" | "full";
  testLineAtStart?: string;
}

function buildInterviewSystemPrompt(input: BuildPromptInput): string {
  const {
    jobTitle,
    companyName,
    jobDescription,
    questions,
    style = "mvp",
    testLineAtStart,
  } = input;

  const defaultQuestions: string[] = [
    "Présentez-vous en 60 secondes.",
    "Parlez d'un échec et de ce que vous avez appris.",
    "Décrivez un projet difficile et votre rôle.",
    "Pourquoi ce poste et pourquoi notre entreprise ?",
  ];

  const items = (questions && questions.length > 0 ? questions : defaultQuestions)
    .map((q, i) => `${i + 1}) ${q}`)
    .join("\n");

  const headerTest = testLineAtStart
    ? `Au tout début, dis exactement: "${testLineAtStart}"\n\n`
    : "";

  const shortRules = `
### Règles
- Une seule question à la fois
- Relance courte si réponse vague
- Ton bienveillant, concis, orienté action
- Ignore une question déjà couverte implicitement
- Après chaque réponse: feedback ≤15 mots + note /5
`;

  const extraGuidance = style === "full"
    ? `
### Évaluation
- Communication (clarté, concision, structure)
- Technique (pertinence, profondeur, exemples)
- Confiance (ton, assurance, gestion du stress)

### Clôture
- Résume 3 forces et 3 axes d'amélioration, avec 3 actions concrètes.
`
    : "";

  const jobContext = (jobTitle || companyName || jobDescription)
    ? `
## Contexte poste
- Intitulé: ${jobTitle ?? "(Non spécifié)"}
- Entreprise: ${companyName ?? "(Non spécifiée)"}
- JD (extrait): ${jobDescription ? jobDescription.slice(0, 700) : "(Non fourni)"}
`
    : "";

  return `# Contexte\nTu es un avatar d'entraînement à l'entretien, jouant le rôle d'intervieweur bienveillant.\n\n${headerTest}## Objectif\nConduire un entretien structuré en posant les questions listées, une par une.\nAprès CHAQUE réponse: donner un mini-feedback (≤15 mots) et une note /5.\nTerminer par un bilan final (forces/axes d'amélioration).\n${shortRules}${extraGuidance}${jobContext}\n#### Questions\n${items}\n`;
}

async function createAgent(payload: any) {
  if (!BP_API_KEY) throw new Error("Missing BP_API_KEY secret");
  const res = await fetch(`${BP_API_BASE}/v1/agents`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": BP_API_KEY,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Agent create failed ${res.status}: ${txt}`);
  }
  return await res.json();
}

async function createSession(agentId: string, metadata?: Record<string, any>) {
  if (!BP_API_KEY) throw new Error("Missing BP_API_KEY secret");
  const res = await fetch(`${BP_API_BASE}/v1/sessions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": BP_API_KEY,
    },
    body: JSON.stringify({ agent_id: agentId, ...(metadata ? { metadata } : {}) }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Session create failed ${res.status}: ${txt}`);
  }
  return await res.json();
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? undefined;
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const {
      name,
      language,
      greeting,
      avatar_id,
      jobTitle,
      companyName,
      jobDescription,
      questions,
      promptStyle,
      testLineAtStart,
      createSession: shouldCreateSession,
      metadata,
    } = body ?? {};

    const system_prompt = buildInterviewSystemPrompt({
      jobTitle,
      companyName,
      jobDescription,
      questions,
      style: promptStyle ?? "mvp",
      testLineAtStart,
    });

    const agentPayload = {
      name: name ?? "Coach Entretien",
      avatar_id: avatar_id ?? BP_DEFAULT_AVATAR,
      system_prompt,
      language: language ?? BP_DEFAULT_LANG,
      greeting: greeting ?? "Bonjour, je suis votre coach d'entretien. Prêt ?",
      max_session_length_minutes: 30,
      llm: { type: "openai" },
    };

    const agent = await createAgent(agentPayload);

    let session: any | null = null;
    if (shouldCreateSession) {
      session = await createSession(agent.id, metadata);
    }

    const agentLink = agent?.hosted_url || agent?.share_url || agent?.link || (agent?.id ? `https://bey.chat/${agent.id}` : null);

    return new Response(
      JSON.stringify({ agent, agentLink, session }),
      { headers: { "content-type": "application/json", ...corsHeaders(origin) } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message ?? String(err) }),
      { status: 500, headers: { "content-type": "application/json", ...corsHeaders(origin) } }
    );
  }
});
