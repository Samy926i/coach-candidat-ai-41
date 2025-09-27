import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as pdfjsLib from "https://esm.sh/pdfjs-dist@4.0.379";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

// Enhanced CORS headers for both JSON and multipart/form-data support
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '3600',
};

// Set up global worker for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.js`;

interface CVEntity {
  skills: string[];
  experiences: Array<{
    title: string;
    company: string;
    duration: string;
    responsibilities: string[];
    technologies?: string[];
  }>;
  education: Array<{
    degree: string;
    institution: string;
    year: string;
    field?: string;
  }>;
  certifications?: string[];
  languages?: string[];
}

serve(async (req) => {
  // Enhanced CORS handling
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 204
    });
  }

  try {
    const contentType = req.headers.get('content-type') || '';
    console.log(`[cv-parser] Request method: ${req.method}, Content-Type: ${contentType}`);
    
    let result;
    
    // Handle file upload (multipart/form-data)
    if (contentType.includes('multipart/form-data')) {
      console.log('[cv-parser] Processing file upload...');
      result = await handleFileUpload(req);
    }
    // Handle raw text input (JSON)
    else if (contentType.includes('application/json')) {
      console.log('[cv-parser] Processing raw text input...');
      result = await handleRawTextInput(req);
    }
    else {
      return new Response(
        JSON.stringify({ error: 'Content-Type non supporté. Utilisez multipart/form-data pour les fichiers ou application/json pour le texte brut.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }
    
    console.log(`[cv-parser] Successfully processed CV using ${result.processing_method}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }
    });

  } catch (error: any) {
    console.error('[cv-parser] Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Erreur interne du serveur'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
});

// Handle file upload processing
async function handleFileUpload(req: Request) {
  const formData = await req.formData();
  const file = formData.get('file') as File;
  
  if (!file) {
    throw new Error('Aucun fichier fourni');
  }

  console.log(`[cv-parser] Processing file: ${file.name}, type: ${file.type}, size: ${file.size} bytes`);

  // Enhanced file type detection
  const fileName = file.name.toLowerCase();
  const fileType = file.type.toLowerCase();
  
  if (isPDFFile(fileType, fileName)) {
    console.log('[cv-parser] Detected as PDF file');
    return await processPDF(file);
  } else if (isWordFile(fileType, fileName)) {
    console.log('[cv-parser] Detected as Word document');
    return await processDOCX(file);
  } else if (isTextFile(fileType, fileName)) {
    console.log('[cv-parser] Detected as text file');
    return await processTXT(file);
  } else {
    throw new Error(`Format non supporté: ${file.type}. Formats acceptés: PDF, DOCX, TXT`);
  }
}

// Handle raw text input processing
async function handleRawTextInput(req: Request) {
  const { cvContent } = await req.json();

  if (!cvContent) {
    throw new Error('Le contenu CV est requis');
  }

  console.log('[cv-parser] Processing raw text input...');
  
  // Normalize Unicode content to NFC for consistency
  const normalizedContent = cvContent.normalize ? cvContent.normalize('NFC') : cvContent;
  const cleanText = normalizeText(normalizedContent);
  
  // Parse the text content
  const structuredData = await structureCV(cleanText);
  
  return {
    raw_text: cleanText,
    structured_data: structuredData,
    processing_method: 'raw_text' as const,
    confidence_score: 1.0,
    file_format: 'raw_text' as const
  };
}

// Enhanced file type detection functions
function isPDFFile(mimeType: string, fileName: string): boolean {
  return mimeType.includes('pdf') || 
         mimeType === 'application/x-pdf' ||
         mimeType === 'application/octet-stream' && fileName.endsWith('.pdf');
}

function isWordFile(mimeType: string, fileName: string): boolean {
  return mimeType.includes('wordprocessingml') ||
         mimeType.includes('msword') ||
         mimeType === 'application/octet-stream' && (fileName.endsWith('.docx') || fileName.endsWith('.doc'));
}

function isTextFile(mimeType: string, fileName: string): boolean {
  return mimeType.includes('text/plain') ||
         mimeType === 'application/octet-stream' && fileName.endsWith('.txt');
}

async function processPDF(file: File) {
  console.log('[cv-parser] Attempting PDF text extraction...');
  
  const arrayBuffer = await file.arrayBuffer();
  
  try {
    // Try direct text extraction first
    console.log('[cv-parser] Loading PDF document...');
    const loadingTask = pdfjsLib.getDocument({ 
      data: arrayBuffer,
      verbosity: 0
    });
    
    const pdf = await loadingTask.promise;
    let textContent = '';
    const maxPages = Math.min(pdf.numPages, 20);
    
    console.log(`[cv-parser] Processing ${maxPages} pages...`);
    
    for (let i = 1; i <= maxPages; i++) {
      try {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
          .filter((item: any) => 'str' in item)
          .map((item: any) => item.str)
          .join(' ');
        textContent += pageText + '\n';
        page.cleanup();
      } catch (pageError) {
        console.warn(`[cv-parser] Failed to process page ${i}:`, pageError);
        continue;
      }
    }
    
    // Check if we got meaningful text
    const normalizedText = normalizeText(textContent);
    if (normalizedText.trim().length > 100 && hasRelevantContent(normalizedText)) {
      console.log(`[cv-parser] Text extraction successful (${normalizedText.length} chars)`);
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
    console.log('[cv-parser] Direct text extraction failed:', (error as Error).message);
  }

  // Fallback to OCR
  console.log('[cv-parser] Falling back to OCR...');
  return await performOCR(arrayBuffer, 'pdf', file.size);
}

async function processDOCX(file: File) {
  console.log('[cv-parser] Processing DOCX file...');
  
  const arrayBuffer = await file.arrayBuffer();
  
  try {
    // Basic DOCX text extraction
    const uint8Array = new Uint8Array(arrayBuffer);
    const text = new TextDecoder().decode(uint8Array);
    
    const cleanText = text
      .replace(/[^\x20-\x7E\n\r\t\u00C0-\u017F]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (cleanText.length > 50 && hasRelevantContent(cleanText)) {
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
    console.log('[cv-parser] DOCX extraction failed:', (error as Error).message);
  }

  // Fallback to OCR
  console.log('[cv-parser] DOCX extraction insufficient, using OCR...');
  return await performOCR(arrayBuffer, 'docx', file.size);
}

async function processTXT(file: File) {
  console.log('[cv-parser] Processing TXT file...');
  
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

async function performOCR(arrayBuffer: ArrayBuffer, format: string, fileSize: number) {
  console.log(`[cv-parser] Starting OCR process for ${format} file (${fileSize} bytes)...`);
  
  if (!openAIApiKey) {
    throw new Error('Clé API OpenAI non configurée. OCR impossible.');
  }

  try {
    // Check file size limits
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (fileSize > maxSize) {
      throw new Error(`Fichier trop volumineux pour OCR: ${(fileSize/1024/1024).toFixed(1)}MB (max: 20MB)`);
    }

    console.log('[cv-parser] Converting to base64...');
    
    // Enhanced base64 conversion
    const uint8Array = new Uint8Array(arrayBuffer);
    let base64 = '';
    
    const chunkSize = 0x4000; // 16KB chunks
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, i + chunkSize);
      try {
        base64 += btoa(String.fromCharCode(...chunk));
      } catch (chunkError) {
        console.error(`[cv-parser] Error processing chunk at ${i}:`, chunkError);
        throw new Error('Erreur lors de la conversion du fichier');
      }
    }
    
    const dataUrl = `data:application/${format};base64,${base64}`;
    console.log(`[cv-parser] Base64 conversion complete (${base64.length} chars)`);

    console.log('[cv-parser] Calling OpenAI vision API...');
    
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
            content: 'You are an expert OCR system. Extract ALL text from the document while preserving structure and formatting. Return clean, readable UTF-8 text.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all text from this CV/resume document. Preserve the original structure, formatting, and hierarchy. Include all contact information, experience, education, skills, and other relevant sections. Return clean UTF-8 text that maintains readability.'
              },
              {
                type: 'image_url',
                image_url: { 
                  url: dataUrl,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 4000,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[cv-parser] OpenAI API error:', response.status, errorText);
      
      if (response.status === 401) {
        throw new Error('Clé API OpenAI invalide. Veuillez vérifier la configuration.');
      } else if (response.status === 429) {
        throw new Error('Limite de taux atteinte. Veuillez réessayer dans quelques instants.');
      } else {
        throw new Error(`Erreur API OpenAI: ${response.status}`);
      }
    }

    const data = await response.json();
    const extractedText = data.choices[0]?.message?.content || '';
    
    if (extractedText.length < 50) {
      throw new Error('OCR a produit un texte insuffisant (document peut-être vide ou illisible)');
    }

    console.log(`[cv-parser] OCR successful (${extractedText.length} chars extracted)`);
    
    const normalizedText = normalizeText(extractedText);
    const structuredData = await structureCV(normalizedText);
    
    return {
      raw_text: normalizedText,
      structured_data: structuredData,
      processing_method: 'ocr' as const,
      confidence_score: 0.85,
      file_format: format as 'pdf' | 'docx'
    };

  } catch (error) {
    console.error('[cv-parser] OCR failed:', error);
    const errorMessage = (error as Error).message;
    
    if (errorMessage.includes('API')) {
      throw new Error('Erreur du service OCR. Veuillez réessayer.');
    } else if (errorMessage.includes('size') || errorMessage.includes('volumineux')) {
      throw new Error(errorMessage);
    } else {
      throw new Error('Échec de la reconnaissance optique. Le document pourrait être corrompu ou illisible.');
    }
  }
}

// Helper function to check if text contains CV-relevant content
function hasRelevantContent(text: string): boolean {
  const cvKeywords = ['experience', 'education', 'skills', 'work', 'university', 'degree', 'email', 'phone', 'cv', 'resume'];
  const lowerText = text.toLowerCase();
  const keywordCount = cvKeywords.filter(keyword => lowerText.includes(keyword)).length;
  return keywordCount >= 2;
}

function normalizeText(text: string): string {
  return text
    .normalize('NFC')
    .replace(/â€™/g, "'")
    .replace(/â€œ/g, '"')
    .replace(/â€/g, '"')
    .replace(/â€¢/g, '•')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

async function structureCV(text: string) {
  if (!openAIApiKey) {
    console.log('[cv-parser] OpenAI API key not available, returning basic structure');
    return getBasicStructure();
  }

  try {
    console.log('[cv-parser] Structuring CV data with AI...');
    
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
            content: `You are a CV parsing expert. Extract structured information from CV text and return ONLY valid JSON, no other text.

CRITICAL: Return only the JSON object, no explanations, no markdown formatting, no code blocks.

Required JSON structure:
{
  "skills": ["string"],
  "experiences": [
    {
      "title": "string",
      "company": "string",
      "duration": "string",
      "responsibilities": ["string"],
      "technologies": ["string"]
    }
  ],
  "education": [
    {
      "degree": "string",
      "institution": "string",
      "year": "string",
      "field": "string"
    }
  ],
  "certifications": ["string"],
  "languages": ["string"]
}

Extract information accurately. If a field is not found, use empty string or array. Keep descriptions concise and professional.`
          },
          {
            role: 'user',
            content: `Parse this CV text and extract structured data as JSON only:\n\n${text.substring(0, 8000)}`
          }
        ],
        max_tokens: 2000,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[cv-parser] OpenAI structuring error:', response.status, errorText);
      throw new Error(`Erreur lors de la structuration: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices[0]?.message?.content || '{}';
    
    console.log('[cv-parser] Raw AI response length:', content.length);
    
    // Enhanced JSON extraction
    content = cleanJsonResponse(content);
    
    try {
      const parsed = JSON.parse(content);
      console.log('[cv-parser] Successfully parsed structured data');
      return parsed;
    } catch (parseError) {
      console.error('[cv-parser] JSON parsing failed, trying regex extraction:', parseError);
      
      // Try to extract JSON using regex as fallback
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const extracted = JSON.parse(jsonMatch[0]);
          console.log('[cv-parser] Successfully extracted JSON with regex');
          return extracted;
        } catch (regexError) {
          console.error('[cv-parser] Regex JSON extraction also failed:', regexError);
        }
      }
      
      console.log('[cv-parser] Falling back to basic structure');
      return getBasicStructure();
    }

  } catch (error) {
    console.error('[cv-parser] Structuring failed:', error);
    return getBasicStructure();
  }
}

// Helper function to clean JSON response from GPT
function cleanJsonResponse(content: string): string {
  // Remove markdown code blocks
  content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');
  
  // Remove any text before the first {
  const firstBrace = content.indexOf('{');
  if (firstBrace > 0) {
    content = content.substring(firstBrace);
  }
  
  // Remove any text after the last }
  const lastBrace = content.lastIndexOf('}');
  if (lastBrace > 0 && lastBrace < content.length - 1) {
    content = content.substring(0, lastBrace + 1);
  }
  
  return content.trim();
}

// Helper function to return basic structure
function getBasicStructure() {
  return {
    skills: [],
    experiences: [],
    education: [],
    certifications: [],
    languages: []
  };
}