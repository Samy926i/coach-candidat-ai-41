import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as pdfjsLib from "https://esm.sh/pdfjs-dist@4.0.379";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[cv-processor] Processing file: ${file.name}, type: ${file.type}, size: ${file.size} bytes`);

    let result;
    
    if (file.type === 'application/pdf') {
      result = await processPDF(file);
    } else if (file.type.includes('wordprocessingml') || file.type.includes('msword')) {
      result = await processDOCX(file);
    } else if (file.type === 'text/plain') {
      result = await processTXT(file);
    } else {
      throw new Error(`Unsupported file type: ${file.type}`);
    }

    console.log(`[cv-processor] Successfully processed CV using ${result.processing_method}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[cv-processor] Error:', error);
    return new Response(JSON.stringify({ 
      error: (error as Error).message || 'Processing failed'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function processPDF(file: File) {
  console.log('[cv-processor] Attempting PDF text extraction...');
  
  const arrayBuffer = await file.arrayBuffer();
  
  try {
    // Try direct text extraction first
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let textContent = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .filter((item: any) => 'str' in item)
        .map((item: any) => item.str)
        .join(' ');
      textContent += pageText + '\n';
    }
    
    if (textContent.trim().length > 100) {
      console.log('[cv-processor] Text extraction successful');
      const normalizedText = normalizeText(textContent);
      const structuredData = await structureCV(normalizedText);
      
      return {
        raw_text: normalizedText,
        structured_data: structuredData,
        processing_method: 'text_extraction' as const,
        confidence_score: 0.95,
        file_format: 'pdf' as const
      };
    }
  } catch (error) {
    console.log('[cv-processor] Direct text extraction failed:', (error as Error).message);
  }

  // If text extraction fails or yields poor results, use OCR
  console.log('[cv-processor] No readable text found, using OCR...');
  return await performOCR(arrayBuffer, 'pdf');
}

async function processDOCX(file: File) {
  console.log('[cv-processor] Processing DOCX file...');
  
  // For DOCX, we'll use a simple text extraction approach
  // In a full implementation, you'd use a library like mammoth
  const arrayBuffer = await file.arrayBuffer();
  
  try {
    // Convert to text using a basic approach
    // This is a simplified version - in production you'd want proper DOCX parsing
    const uint8Array = new Uint8Array(arrayBuffer);
    const text = new TextDecoder().decode(uint8Array);
    
    // Extract readable text using basic patterns
    const cleanText = text
      .replace(/[^\x20-\x7E\n\r\t\u00C0-\u017F]/g, ' ') // Keep only printable chars + accents
      .replace(/\s+/g, ' ')
      .trim();
    
    if (cleanText.length > 50) {
      const normalizedText = normalizeText(cleanText);
      const structuredData = await structureCV(normalizedText);
      
      return {
        raw_text: normalizedText,
        structured_data: structuredData,
        processing_method: 'docx_extraction' as const,
        confidence_score: 0.8,
        file_format: 'docx' as const
      };
    }
  } catch (error) {
    console.log('[cv-processor] DOCX extraction failed:', (error as Error).message);
  }

  // Fallback to OCR if direct extraction fails
  return await performOCR(arrayBuffer, 'docx');
}

async function processTXT(file: File) {
  console.log('[cv-processor] Processing TXT file...');
  
  const text = await file.text();
  const normalizedText = normalizeText(text);
  const structuredData = await structureCV(normalizedText);
  
  return {
    raw_text: normalizedText,
    structured_data: structuredData,
    processing_method: 'txt_direct' as const,
    confidence_score: 1.0,
    file_format: 'txt' as const
  };
}

async function performOCR(arrayBuffer: ArrayBuffer, format: string) {
  console.log('[cv-processor] Starting OCR process...');
  
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    // Convert to base64 for OpenAI
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const dataUrl = `data:application/${format};base64,${base64}`;

    console.log('[cv-processor] Calling OpenAI OCR...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all text from this CV/resume document. Preserve the structure, formatting, and hierarchy. Return clean UTF-8 text that maintains readability.'
              },
              {
                type: 'image_url',
                image_url: { url: dataUrl }
              }
            ]
          }
        ],
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const extractedText = data.choices[0]?.message?.content || '';
    
    if (extractedText.length < 50) {
      throw new Error('OCR produced insufficient text');
    }

    console.log('[cv-processor] OCR successful');
    
    const normalizedText = normalizeText(extractedText);
    const structuredData = await structureCV(normalizedText);
    
    return {
      raw_text: normalizedText,
      structured_data: structuredData,
      processing_method: 'ocr_gpt4' as const,
      confidence_score: 0.85,
      file_format: format as 'pdf' | 'docx'
    };

  } catch (error) {
    console.error('[cv-processor] OCR failed:', error);
    throw new Error(`OCR processing failed: ${(error as Error).message}`);
  }
}

function normalizeText(text: string): string {
  return text
    // Normalize Unicode (NFC - canonical composition)
    .normalize('NFC')
    // Fix common encoding issues
    .replace(/â€™/g, "'")
    .replace(/â€œ/g, '"')
    .replace(/â€/g, '"')
    .replace(/â€¢/g, '•')
    // Clean up whitespace
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

async function structureCV(text: string) {
  if (!openAIApiKey) {
    // Return basic structure without AI processing
    return {
      personal_info: {},
      experience: [],
      education: [],
      skills: { technical: [], soft: [] },
      languages: [],
      certifications: []
    };
  }

  try {
    console.log('[cv-processor] Structuring CV data...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a CV parsing expert. Extract structured information from CV text and return it as JSON.

Required JSON structure:
{
  "personal_info": {
    "name": "string",
    "email": "string", 
    "phone": "string",
    "location": "string"
  },
  "experience": [
    {
      "title": "string",
      "company": "string", 
      "duration": "string",
      "description": "string"
    }
  ],
  "education": [
    {
      "degree": "string",
      "institution": "string",
      "year": "string",
      "description": "string"
    }
  ],
  "skills": {
    "technical": ["string"],
    "soft": ["string"]
  },
  "languages": ["string"],
  "certifications": ["string"]
}

Extract information accurately. If a field is not found, use empty string or array. Keep descriptions concise.`
          },
          {
            role: 'user',
            content: `Parse this CV text and extract structured data:\n\n${text}`
          }
        ],
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI structuring error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '{}';
    
    try {
      return JSON.parse(content);
    } catch (parseError) {
      console.error('[cv-processor] JSON parsing failed:', parseError);
      // Return basic structure if parsing fails
      return {
        personal_info: {},
        experience: [],
        education: [],
        skills: { technical: [], soft: [] },
        languages: [],
        certifications: []
      };
    }

  } catch (error) {
    console.error('[cv-processor] Structuring failed:', error);
    // Return basic structure on error
    return {
      personal_info: {},
      experience: [],
      education: [],
      skills: { technical: [], soft: [] },
      languages: [],
      certifications: []
    };
  }
}