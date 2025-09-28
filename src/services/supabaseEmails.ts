import { supabase } from "@/integrations/supabase/client";

export async function getLatestEmail() {
  const { data, error } = await supabase
    .from("emails")
    .select("*")
    .order("received_at", { ascending: false })
    .limit(1);

  if (error) throw error;
  return data?.[0] || null;
}
