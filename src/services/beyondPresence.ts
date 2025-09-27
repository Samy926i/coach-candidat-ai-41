// Crée un agent à partir d’un avatar
export async function createAgent() {
  const response = await fetch("https://api.beyondpresence.ai/v1/agents", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": import.meta.env.VITE_BEYOND_PRESENCE_API_KEY
    },
    body: JSON.stringify({
      name: "Interview Coach",
      avatar_id: "694c83e2-8895-4a98-bd16-56332ca3f449", // ✅ c'est bien l'avatar
      system_prompt: "You are an AI recruiter that conducts interviews.",
      language: "fr",
      greeting: "Bonjour, prêt pour l'entretien ?",
      max_session_length_minutes: 30,
      llm: { type: "openai" }
    })
  });

  if (!response.ok) throw new Error("Erreur création agent");
  return response.json(); // ⚡ Vérifie que tu as { id: "...", ... }
}

// Crée une session à partir d’un agent (pas d’un avatar !)
export async function createSession(agentId: string) {
  const response = await fetch("https://api.beyondpresence.ai/v1/sessions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": import.meta.env.VITE_BEYOND_PRESENCE_API_KEY
    },
    body: JSON.stringify({
      agent_id: agentId // ✅ bien l'id de l'agent créé
    })
  });

  if (!response.ok) throw new Error("Erreur création session");
  return response.json();
}

export async function startInterview(role: string) {
  const response = await fetch("https://api.beyondpresence.ai/v1/sessions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": import.meta.env.VITE_BEYOND_PRESENCE_API_KEY,
    },
    body: JSON.stringify({
      agent_id: "694c83e2-8895-4a98-bd16-56332ca3f449", // ID de ton agent
      metadata: { role }
    }),
  });

  if (!response.ok) throw new Error("Erreur démarrage session");
  return response.json();
}

export async function askNext() {
  // selon l’API tu peux lier à une logique "prochaine question"
  return { success: true };
}

export async function endInterview(sessionId: string) {
  const response = await fetch(`https://api.beyondpresence.ai/v1/sessions/${sessionId}`, {
    method: "DELETE",
    headers: {
      "x-api-key": import.meta.env.VITE_BEYOND_PRESENCE_API_KEY,
    }
  });

  if (!response.ok) throw new Error("Erreur fin de session");
  return response.json();
}

export async function getSessionResults(sessionId: string) {
  const response = await fetch(`https://api.beyondpresence.ai/v1/sessions/${sessionId}/results`, {
    headers: {
      "x-api-key": import.meta.env.VITE_BEYOND_PRESENCE_API_KEY
    }
  });
  if (!response.ok) throw new Error("Impossible de récupérer les résultats");
  return response.json();
}
