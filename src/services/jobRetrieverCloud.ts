import { supabase } from "@/integrations/supabase/client";
import type { JobData } from "@/retriever/schema";

export async function retrieveJobData(jobUrl: string): Promise<JobData> {
  const { data, error } = await supabase.functions.invoke("job-retriever", {
    body: { url: jobUrl },
  });

  if (error) {
    throw new Error(error.message || "Job retriever function error");
  }

  return data as JobData;
}

