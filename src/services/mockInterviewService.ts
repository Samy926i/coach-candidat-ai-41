import { createAgent, createSession, CreateAgentOptions } from "./beyondPresence";

export interface BuildPromptInput {
  jobTitle?: string;
  companyName?: string;
  jobDescription?: string;
  questions?: string[];
  language?: string; // e.g., "fr-FR" | "en-US"
  style?: "mvp" | "full";
  testLineAtStart?: string; // for quick validation of pre-prompt capture
  customPrompt?: string; // 🆕 Pour utiliser un prompt personnalisé généré par GPT-4o
}

/**
 * Construit le system_prompt pour l'agent Beyond Presence.
 * Structure: Contexte → Objectif → Règles → Données → Questions.
 */
export function buildInterviewSystemPrompt(input: BuildPromptInput): string {
  const {
    jobTitle,
    companyName,
    jobDescription,
    questions,
    style = "mvp",
    testLineAtStart,
    customPrompt, // 🆕 Prompt personnalisé généré par GPT-4o
  } = input;

  // 🆕 Si un prompt personnalisé est fourni, l'utiliser directement
  if (customPrompt) {
    const headerTest = testLineAtStart
      ? `Au tout début, dis exactement: "${testLineAtStart}"\n\n`
      : "";
    
    return `${headerTest}${customPrompt}`;
  }

  // Sinon, utiliser le template par défaut
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

export interface CreateMockAgentParams extends Omit<CreateAgentOptions, "system_prompt"> {
  jobTitle?: string;
  companyName?: string;
  jobDescription?: string;
  questions?: string[];
  promptStyle?: "mvp" | "full";
  testLineAtStart?: string;
  customPrompt?: string; // 🆕 Prompt personnalisé
}

/**
 * 🆕 Génère un preprompt personnalisé basé sur le CV utilisateur et l'offre d'emploi
 */
export async function generateCustomPreprompt(
  cvContent: string, 
  jobOffer: { title: string; company: string; description: string },
  userId?: string
): Promise<string> {
  try {
    // Appel à votre API GPT-4o (à implémenter)
    const response = await fetch('/api/generate-preprompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cv: cvContent,
        jobOffer,
        userId
      })
    });
    
    const data = await response.json();
    return data.preprompt;
  } catch (error) {
    console.error('Erreur génération preprompt:', error);
    // Fallback vers template par défaut
    return '';
  }
}

/**
 * Crée un agent Beyond Presence avec un system_prompt construit à partir de la JD et des questions.
 * 🆕 Supporte maintenant les preprompts personnalisés générés par IA
 */
export async function createMockInterviewAgent(params: CreateMockAgentParams) {
  const {
    jobTitle,
    companyName,
    jobDescription,
    questions,
    promptStyle,
    testLineAtStart,
    customPrompt, // 🆕 Preprompt personnalisé
    ...agentOpts
  } = params;

  const system_prompt = buildInterviewSystemPrompt({
    jobTitle,
    companyName,
    jobDescription,
    questions,
    style: promptStyle ?? "mvp",
    testLineAtStart,
    customPrompt, // 🆕 Passé à la fonction de build
  });

  const created = await createAgent({
    ...agentOpts,
    system_prompt,
  });

  return created; // { id, ... }
}

/**
 * Démarre une session d'entretien pour un agent donné.
 * Vous pouvez passer des metadatas (ex: userId, jobContextId) pour traçabilité.
 */
export async function startMockInterviewSession(agentId: string, metadata?: Record<string, any>) {
  return createSession(agentId, metadata);
}

/**
 * Convenience: crée l'agent et démarre directement la session.
 */
export async function createAndStartMockInterview(params: CreateMockAgentParams, metadata?: Record<string, any>) {
  const agent = await createMockInterviewAgent(params);
  const session = await startMockInterviewSession(agent.id, metadata);
  return { agent, session };
}

/**
 * 🆕 WORKFLOW COMPLET: Génère preprompt personnalisé + crée agent + démarre session
 * Utilisez cette fonction quand vous avez le CV de l'utilisateur
 */
export async function createPersonalizedInterview(
  cvContent: string,
  jobOffer: { title: string; company: string; description: string },
  userId?: string,
  agentOptions?: Partial<CreateMockAgentParams>
) {
  console.log('🧠 Génération du preprompt personnalisé avec GPT-4o...');
  
  // 1. Générer le preprompt personnalisé
  const customPrompt = await generateCustomPreprompt(cvContent, jobOffer, userId);
  
  // 2. Créer l'agent avec le preprompt personnalisé
  const agent = await createMockInterviewAgent({
    jobTitle: jobOffer.title,
    companyName: jobOffer.company,
    jobDescription: jobOffer.description,
    customPrompt, // 🆕 Le preprompt généré par IA
    promptStyle: "full",
    ...agentOptions
  });
  
  // 3. Démarrer la session
  const session = await startMockInterviewSession(agent.id, { 
    userId, 
    jobTitle: jobOffer.title,
    personalized: true 
  });
  
  console.log('✅ Entretien personnalisé créé:', agent.id);
  return { agent, session, customPrompt };
}

