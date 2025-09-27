import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '3600',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 204
    });
  }

  try {
    const { query, search_type = 'semantic', limit = 10 } = await req.json();
    
    if (!query?.trim()) {
      return new Response(JSON.stringify({ error: 'Query is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[cv-search] Searching for: "${query}" (type: ${search_type})`);

    let results = [];

    if (search_type === 'semantic' && openAIApiKey) {
      // Semantic search using embeddings
      results = await performSemanticSearch(query, limit);
    } else {
      // Text search using PostgreSQL full-text search
      results = await performTextSearch(query, limit);
    }

    console.log(`[cv-search] Found ${results.length} results`);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[cv-search] Error:', error);
    return new Response(JSON.stringify({ 
      error: (error as Error).message || 'Search error occurred'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function performSemanticSearch(query: string, limit: number) {
  if (!openAIApiKey) {
    console.warn('[cv-search] OpenAI API key not configured, falling back to text search');
    return await performTextSearch(query, limit);
  }

  try {
    // Generate embedding for the search query
    console.log('[cv-search] Generating query embedding...');
    
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: query
      })
    });

    if (!embeddingResponse.ok) {
      throw new Error(`OpenAI API error: ${embeddingResponse.status}`);
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0]?.embedding;

    if (!queryEmbedding) {
      throw new Error('Failed to generate query embedding');
    }

    console.log('[cv-search] Performing similarity search...');

    // Perform similarity search using pgvector
    const { data, error } = await supabase.rpc('search_cvs_by_similarity', {
      query_embedding: queryEmbedding,
      similarity_threshold: 0.1, // Lower threshold for more results
      match_limit: limit
    });

    if (error) {
      console.error('[cv-search] Similarity search error:', error);
      throw new Error(`Database search error: ${error.message}`);
    }

    return data || [];

  } catch (error) {
    console.error('[cv-search] Semantic search failed:', error);
    console.log('[cv-search] Falling back to text search');
    return await performTextSearch(query, limit);
  }
}

async function performTextSearch(query: string, limit: number) {
  try {
    console.log('[cv-search] Performing text search...');

    // Use PostgreSQL full-text search
    const { data, error } = await supabase
      .from('cv_uploads')
      .select(`
        id,
        filename,
        raw_text,
        structured_data,
        processing_method,
        confidence_score,
        file_format,
        created_at
      `)
      .textSearch('raw_text', query, {
        type: 'websearch',
        config: 'french'
      })
      .limit(limit)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Text search error: ${error.message}`);
    }

    return data || [];

  } catch (error) {
    console.error('[cv-search] Text search failed:', error);
    
    // Final fallback: simple ILIKE search
    console.log('[cv-search] Using simple pattern matching...');
    
    const { data, error: fallbackError } = await supabase
      .from('cv_uploads')
      .select(`
        id,
        filename,
        raw_text,
        structured_data,
        processing_method,
        confidence_score,
        file_format,
        created_at
      `)
      .ilike('raw_text', `%${query}%`)
      .limit(limit)
      .order('created_at', { ascending: false });

    if (fallbackError) {
      throw new Error(`Fallback search error: ${fallbackError.message}`);
    }

    return data || [];
  }
}