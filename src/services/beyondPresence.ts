export interface CreateAgentOptions {
  name?: string;
  avatar_id?: string;
  language?: string;
  greeting?: string;
  system_prompt: string; // requis: le pré-prompt vit ici
  max_session_length_minutes?: number;
  llm?: Record<string, any>;
}

// Crée un agent à partir d’un avatar, avec un system_prompt personnalisé
export async function createAgent(options: CreateAgentOptions) {
  const apiKey = import.meta.env.VITE_BEYOND_PRESENCE_API_KEY as string | undefined;
  if (!apiKey) throw new Error("VITE_BEYOND_PRESENCE_API_KEY manquant");

  const response = await fetch("https://api.beyondpresence.ai/v1/agents", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      name: options.name ?? "Interview Coach",
      avatar_id: options.avatar_id ?? (import.meta.env.VITE_BP_AVATAR_ID as string),
      system_prompt: options.system_prompt,
      language: options.language ?? (import.meta.env.VITE_BP_LANGUAGE as string) ?? "fr-FR",
      greeting: options.greeting ?? "Bonjour, prêt pour l'entretien ?",
      max_session_length_minutes: options.max_session_length_minutes ?? 30,
      llm: options.llm ?? { type: "openai" },
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Erreur création agent (${response.status}): ${text}`);
  }
  return response.json(); // { id: string, ... }
}

// Crée une session à partir d’un agent (pas d’un avatar !)
export async function createSession(agentId: string, metadata?: Record<string, any>) {
  const apiKey = import.meta.env.VITE_BEYOND_PRESENCE_API_KEY as string | undefined;
  if (!apiKey) throw new Error("VITE_BEYOND_PRESENCE_API_KEY manquant");

  const response = await fetch("https://api.beyondpresence.ai/v1/sessions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      agent_id: agentId, // ✅ bien l'id de l'agent créé
      ...(metadata ? { metadata } : {}),
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Erreur création session (${response.status}): ${text}`);
  }
  return response.json();
}

export async function startInterview(agentId: string, metadata?: Record<string, any>) {
  return createSession(agentId, metadata);
}

export async function askNext() {
  // selon l’API tu peux lier à une logique "prochaine question"
  return { success: true };
}

export async function endInterview(sessionId: string) {
  const apiKey = import.meta.env.VITE_BEYOND_PRESENCE_API_KEY as string | undefined;
  if (!apiKey) throw new Error("VITE_BEYOND_PRESENCE_API_KEY manquant");

  const response = await fetch(`https://api.beyondpresence.ai/v1/sessions/${sessionId}`, {
    method: "DELETE",
    headers: {
      "x-api-key": apiKey,
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Erreur fin de session (${response.status}): ${text}`);
  }
  return response.json();
}

export async function getSessionResults(sessionId: string) {
  const apiKey = import.meta.env.VITE_BEYOND_PRESENCE_API_KEY as string | undefined;
  if (!apiKey) throw new Error("VITE_BEYOND_PRESENCE_API_KEY manquant");

  const response = await fetch(`https://api.beyondpresence.ai/v1/sessions/${sessionId}/results`, {
    headers: {
      "x-api-key": apiKey,
    },
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Impossible de récupérer les résultats (${response.status}): ${text}`);
  }
  return response.json();
}
