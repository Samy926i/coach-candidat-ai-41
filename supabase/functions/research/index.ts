import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Import helpers
import { scrapeJobPage } from './lib/lightpanda.ts';
import { extractJobData } from './lib/extract.ts';
import { generateInterviewPack } from './lib/interview.ts';
import { upsertJobAndCompany, ensurePgvectorSetup } from './lib/pgvector.ts';
import { validateUrl, sanitizeUrl } from './lib/utils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResearchRequest {
  url: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url: rawUrl } = await req.json() as ResearchRequest;

    if (!rawUrl) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Validate and sanitize URL
    const url = sanitizeUrl(rawUrl);
    if (!validateUrl(url)) {
      return new Response(
        JSON.stringify({ error: 'Invalid URL format. Only HTTP/HTTPS URLs are allowed.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    console.log(`[research] Starting research for URL: ${url}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Ensure pgvector setup
    await ensurePgvectorSetup(supabase);

    let sources: string[] = [];

    // Step 1: Scrape job page
    console.log(`[research] Scraping job page...`);
    const scrapedData = await scrapeJobPage(url);
    sources.push(url);

    // Step 2: Extract structured data
    console.log(`[research] Extracting job data...`);
    const jobData = await extractJobData(scrapedData, url);

    // Step 3: Enrichment - company website and LinkedIn
    console.log(`[research] Enriching with company data...`);
    let companyData: any = {
      name: jobData.company_name,
      culture_values: [],
      about: '',
      sources: []
    };

    // Try to find company website and LinkedIn
    try {
      // Basic company info enrichment
      const enrichedSources = await enrichCompanyData(jobData.company_name);
      companyData.sources = enrichedSources.sources;
      companyData.culture_values = enrichedSources.culture_values || [];
      companyData.about = enrichedSources.about || '';
      sources = [...sources, ...enrichedSources.sources];
    } catch (error: any) {
      console.log(`[research] Company enrichment failed (continuing): ${error.message}`);
    }

    // Step 4: Generate interview pack
    console.log(`[research] Generating interview pack...`);
    const interviewPack = await generateInterviewPack(jobData, companyData);

    // Step 5: Store in database with embeddings
    console.log(`[research] Storing in database...`);
    const { company, jobPosting } = await upsertJobAndCompany(
      supabase,
      jobData,
      companyData,
      sources
    );

    // Final response
    const result = {
      job: jobData,
      company,
      interviewPack,
      sources: Array.from(new Set(sources)) // Remove duplicates
    };

    console.log(`[research] Research completed successfully for ${jobData.company_name}`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' } }
    );

  } catch (error: any) {
    console.error('[research] Error:', error);
    
    let status = 500;
    let message = 'Internal server error';
    
    if (error.message.includes('timeout')) {
      status = 408;
      message = 'Request timeout - the page took too long to load';
    } else if (error.message.includes('scraper') || error.message.includes('CDP')) {
      status = 502;
      message = 'Scraper service unavailable - please try again later';
    } else if (error.message.includes('Invalid URL') || error.message.includes('URL')) {
      status = 400;
      message = 'Invalid or inaccessible URL';
    } else if (error.message.includes('AI') || error.message.includes('OpenAI')) {
      status = 503;
      message = 'AI service temporarily unavailable';
    }

    return new Response(
      JSON.stringify({ error: message, details: error.message }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
});

async function enrichCompanyData(companyName: string) {
  // This is a simplified enrichment - in a real implementation,
  // you would scrape company websites and LinkedIn pages
  console.log(`[research] Enriching data for company: ${companyName}`);
  
  // For now, return mock enrichment data
  // TODO: Implement actual scraping logic
  return {
    sources: [],
    culture_values: ['Innovation', 'Collaboration', 'Growth'],
    about: `${companyName} is a dynamic company focused on innovation and growth.`
  };
}