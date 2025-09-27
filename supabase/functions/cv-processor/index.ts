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

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Get user ID from Supabase auth
async function getUserFromAuth(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    console.error('[cv-processor] No authorization header');
    return null;
  }

  try {
    // Use Supabase client to get user from JWT
    const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    
    if (error || !user) {
      console.error('[cv-processor] Error getting user from Supabase:', error);
      return null;
    }
    
    console.log('[cv-processor] User authenticated:', user.id);
    return user.id;
  } catch (error) {
    console.error('[cv-processor] Error in getUserFromAuth:', error);
    return null;
  }
}

// Convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 204
    });
  }

  try {
    console.log(`[cv-processor] Request method: ${req.method}, Content-Type: ${req.headers.get('content-type')}`);
    
    // Get user ID from token
    const userId = await getUserFromAuth(req);
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé - token manquant ou invalide' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const contentType = req.headers.get('content-type') || '';
    let file: File | null = null;
    let fileName: string | null = null;
    let fileType: string | null = null;
    let fileSize: number | null = null;

    // Handle multipart/form-data (file upload)
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      file = formData.get('file') as File;
      
      if (!file) {
        return new Response(
          JSON.stringify({ error: 'Aucun fichier fourni' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      fileName = file.name;
      fileType = file.type;
      fileSize = file.size;
    } else {
      return new Response(
        JSON.stringify({ error: 'Type de contenu non supporté. Utilisez multipart/form-data.' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`[cv-processor] Processing file: ${fileName}, type: ${fileType}, size: ${fileSize} bytes`);

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
    if (!allowedTypes.includes(fileType || '')) {
      return new Response(
        JSON.stringify({ error: 'Type de fichier non supporté. Seuls les PDF et documents Word sont acceptés.' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate file size (max 10MB)
    if ((fileSize || 0) > 10 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: 'Fichier trop volumineux. Taille maximale: 10MB.' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Convert file to base64 for storage
    const arrayBuffer = await file!.arrayBuffer();
    const fileBase64 = arrayBufferToBase64(arrayBuffer);

    // Store the CV file in database
    const { data: cvData, error: insertError } = await supabase
      .from('cv_uploads')
      .insert({
        user_id: userId,
        filename: fileName,
        file_size: fileSize,
        mime_type: fileType,
        upload_type: 'file',
        raw_text: '', // Empty since we're not parsing
        structured_data: {}, // Empty since we're not parsing
        processing_method: 'file_storage',
        confidence_score: null,
        file_format: fileType === 'application/pdf' ? 'PDF' : 'DOCX',
        file_data: fileBase64, // Store the actual file data
        is_active: true,
        is_default: false
      })
      .select()
      .single();

    if (insertError) {
      console.error('[cv-processor] Database insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la sauvegarde en base de données' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`[cv-processor] CV stored with ID: ${cvData.id}`);

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        cvId: cvData.id,
        filename: fileName,
        fileSize: fileSize,
        message: 'CV téléchargé et stocké avec succès'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[cv-processor] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});