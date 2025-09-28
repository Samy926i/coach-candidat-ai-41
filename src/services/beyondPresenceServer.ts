import { supabase } from "@/integrations/supabase/client";
import { startMockInterview } from "./mockInterviewService";

export async function startBpSessionWithPrompt(params: {
  avatarId: string;
  language?: string;
  greeting?: string;
  system_prompt?: string;
  text?: string; // legacy compatibility
}) {
  console.log('Using Edge Function for Beyond Presence...');

  try {
    // Use Edge Function
    const fnBase = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string | undefined;
    const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

    if (fnBase && anon) {
      const res = await fetch(`https://lasdcxnkoptubfoaqinw.supabase.co/functions/v1/rapid-processor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anon,
          'Authorization': `Bearer ${anon}`,
        },
        body: JSON.stringify(params),
      });
      
      if (res.ok) {
        const result = await res.json();
        
        // Si Beyond Presence ne fournit pas d'URL (nouvelle API), utilise la solution mock
        if (!result.url || result.url === "") {
          console.log('Beyond Presence session created but no URL provided, using mock interview...');
          return await startMockInterview(params);
        }
        
        return result;
      } else {
        console.warn('Edge Function failed, falling back to mock interview');
      }
    }
  } catch (error) {
    console.warn('Edge Function error, falling back to mock interview:', error);
  }

  // Fallback to mock interview
  console.log('Using mock interview as fallback...');
  return await startMockInterview(params);
}
