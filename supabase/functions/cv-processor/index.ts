import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import * as pdfjsLib from "https://esm.sh/pdfjs-dist@4.0.379";

// Enhanced CORS headers for better multipart/form-data support
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

// Set up global worker for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.js`;

serve(async (req) => {
  // Enhanced CORS handling
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 204
    });
  }

  try {
    console.log(`[cv-processor] Request method: ${req.method}, Content-Type: ${req.headers.get('content-type')}`);
    
    const contentType = req.headers.get('content-type') || '';
    let file: File | null = null;
    let rawText: string | null = null;
    let fileName: string | null = null;
    let fileType: string | null = null;
    let fileSize: number = 0;
    let uploadType: string = '';

    // Handle different input types
    if (contentType.includes('multipart/form-data')) {
      // File upload via form data
      const formData = await req.formData();
      file = formData.get('file') as File;
      
      if (!file) {
        console.error('[cv-processor] No file in form data');
        return new Response(JSON.stringify({ error: 'No file provided' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      fileName = file.name;
      fileType = file.type;
      fileSize = file.size;
      uploadType = 'file';
      
    } else if (contentType.includes('application/json')) {
      // JSON input (base64 file or raw text)
      const jsonData = await req.json();
      
      if (jsonData.cvContent) {
        // Raw text input
        rawText = jsonData.cvContent;
        uploadType = 'raw_text';
        fileName = 'raw_input.txt';
        fileType = 'text/plain';
        fileSize = rawText ? rawText.length : 0;
        
      } else if (jsonData.fileData && jsonData.fileName) {
        // Base64 file input
        const base64Data = jsonData.fileData;
        const jsonFileName = jsonData.fileName;
        const jsonFileType = jsonData.fileType || 'application/pdf';
        
        try {
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          file = new File([bytes], jsonFileName, { type: jsonFileType });
          fileName = jsonFileName;
          fileType = jsonFileType;
          fileSize = file.size;
          uploadType = 'file';
        } catch (error) {
          console.error('[cv-processor] Error converting base64 to file:', error);
          throw new Error('Invalid base64 file data');
        }
      } else {
        throw new Error('Invalid JSON input - expected cvContent or fileData + fileName');
      }
    } else {
      throw new Error('Unsupported content type - use multipart/form-data or application/json');
    }

    console.log(`[cv-processor] Processing input: ${fileName}, type: ${fileType}, size: ${fileSize} bytes, upload_type: ${uploadType}`);

    let result;
    
    if (uploadType === 'raw_text') {
      console.log('[cv-processor] Processing raw text input');
      result = await processRawText(rawText!);
    } else if (file) {
      // Enhanced file type detection - handle various MIME types and extensions
      const fileNameLower = fileName!.toLowerCase();
      const fileTypeLower = fileType!.toLowerCase();
      
      if (isPDFFile(fileTypeLower, fileNameLower)) {
        console.log('[cv-processor] Detected as PDF file');
        result = await processPDF(file);
      } else if (isWordFile(fileTypeLower, fileNameLower)) {
        console.log('[cv-processor] Detected as Word document');
        result = await processDOCX(file);
      } else if (isTextFile(fileTypeLower, fileNameLower)) {
        console.log('[cv-processor] Detected as text file');
        result = await processTXT(file);
      } else {
        console.error(`[cv-processor] Unsupported file type: ${fileType} (${fileName})`);
        throw new Error(`Format non supporté: ${fileType}. Formats acceptés: PDF, DOCX, TXT`);
      }
    } else {
      throw new Error('No valid input provided');
    }

    console.log(`[cv-processor] Successfully processed CV using ${result.processing_method}`);

    // Store in database if user is authenticated
    const authHeader = req.headers.get('Authorization');
    const userId = await getUserFromAuth(authHeader);
    
    if (userId) {
      try {
        const { error } = await supabase
          .from('cv_uploads')
          .insert({
            user_id: userId,
            filename: fileName,
            file_size: fileSize,
            mime_type: fileType,
            upload_type: uploadType,
            raw_text: result.raw_text,
            structured_data: result.structured_data,
            processing_method: result.processing_method,
            confidence_score: result.confidence_score,
            file_format: result.file_format
          });

        if (error) {
          console.error('[cv-processor] Database storage error:', error);
          // Don't fail the request, just log the error
        } else {
          console.log('[cv-processor] CV stored in database successfully');
        }
      } catch (dbError) {
        console.error('[cv-processor] Database error:', dbError);
        // Don't fail the request, just log the error
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[cv-processor] Error:', error);
    return new Response(JSON.stringify({ 
      error: (error as Error).message || 'Erreur lors du traitement du fichier'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

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
  console.log('[cv-processor] Attempting PDF text extraction...');
  
  const arrayBuffer = await file.arrayBuffer();
  
  try {
    // Try direct text extraction first with better error handling
    console.log('[cv-processor] Loading PDF document...');
    const loadingTask = pdfjsLib.getDocument({ 
      data: arrayBuffer,
      verbosity: 0 // Reduce PDF.js logging
    });
    
    const pdf = await loadingTask.promise;
    let textContent = '';
    const maxPages = Math.min(pdf.numPages, 20); // Limit to first 20 pages for performance
    
    console.log(`[cv-processor] Processing ${maxPages} pages...`);
    
    for (let i = 1; i <= maxPages; i++) {
      try {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
          .filter((item: any) => 'str' in item)
          .map((item: any) => item.str)
          .join(' ');
        textContent += pageText + '\n';
        
        // Clean up page resources
        page.cleanup();
      } catch (pageError) {
        console.warn(`[cv-processor] Failed to process page ${i}:`, pageError);
        continue; // Skip this page and continue with others
      }
    }
    
    // Check if we got meaningful text
    const normalizedText = normalizeText(textContent);
    if (normalizedText.trim().length > 100 && hasRelevantContent(normalizedText)) {
      console.log(`[cv-processor] Text extraction successful (${normalizedText.length} chars)`);
      const structuredData = await structureCV(normalizedText);
      
      return {
        raw_text: normalizedText,
        structured_data: structuredData,
        processing_method: 'text_extraction' as const,
        confidence_score: 0.95,
        file_format: 'pdf' as const
      };
    } else {
      console.log('[cv-processor] Extracted text insufficient for CV processing');
    }
  } catch (error) {
    console.log('[cv-processor] Direct text extraction failed:', (error as Error).message);
  }

  // If text extraction fails or yields poor results, use OCR
  console.log('[cv-processor] Falling back to OCR...');
  return await performOCR(arrayBuffer, 'pdf', file.size);
}

// Helper function to check if text contains CV-relevant content
function hasRelevantContent(text: string): boolean {
  const cvKeywords = ['experience', 'education', 'skills', 'work', 'university', 'degree', 'email', 'phone', 'cv', 'resume'];
  const lowerText = text.toLowerCase();
  const keywordCount = cvKeywords.filter(keyword => lowerText.includes(keyword)).length;
  return keywordCount >= 2; // At least 2 CV-related keywords
}

async function processDOCX(file: File) {
  console.log('[cv-processor] Processing DOCX file...');
  
  const arrayBuffer = await file.arrayBuffer();
  
  try {
    // Basic DOCX text extraction - in production use a proper library like mammoth
    const uint8Array = new Uint8Array(arrayBuffer);
    const text = new TextDecoder().decode(uint8Array);
    
    // Extract readable text using basic patterns
    const cleanText = text
      .replace(/[^\x20-\x7E\n\r\t\u00C0-\u017F]/g, ' ') // Keep only printable chars + accents
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
    console.log('[cv-processor] DOCX extraction failed:', (error as Error).message);
  }

  // Fallback to OCR if direct extraction fails
  console.log('[cv-processor] DOCX extraction insufficient, using OCR...');
  return await performOCR(arrayBuffer, 'docx', file.size);
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

async function performOCR(arrayBuffer: ArrayBuffer, format: string, fileSize: number) {
  console.log(`[cv-processor] Starting OCR process for ${format} file (${fileSize} bytes)...`);
  
  if (!openAIApiKey) {
    throw new Error('Clé API OpenAI non configurée. OCR impossible.');
  }

  try {
    // Check file size limits - OpenAI has a 20MB limit for vision API
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (fileSize > maxSize) {
      throw new Error(`Fichier trop volumineux pour OCR: ${(fileSize/1024/1024).toFixed(1)}MB (max: 20MB)`);
    }

    let imageDataUrls: string[] = [];
    
    if (format === 'pdf') {
      // Convert PDF pages to images for better OCR compatibility
      console.log('[cv-processor] Converting PDF pages to images...');
      imageDataUrls = await convertPDFToImages(arrayBuffer);
    } else {
      // For non-PDF files, convert directly to base64
      console.log('[cv-processor] Converting file to base64...');
      const base64 = await arrayBufferToBase64(arrayBuffer);
      const dataUrl = `data:application/${format};base64,${base64}`;
      imageDataUrls = [dataUrl];
    }
    
    console.log(`[cv-processor] Converted to ${imageDataUrls.length} image(s) for OCR`);

    // Process multiple images with OpenAI OCR
    console.log('[cv-processor] Processing images with OpenAI OCR...');
    let combinedText = '';
    
    for (let i = 0; i < imageDataUrls.length; i++) {
      const imageUrl = imageDataUrls[i];
      console.log(`[cv-processor] Processing image ${i + 1}/${imageDataUrls.length}...`);
      
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
                  text: `Extract all text from this CV/resume document page ${i + 1}. Preserve the original structure, formatting, and hierarchy. Include all contact information, experience, education, skills, and other relevant sections. Return clean UTF-8 text that maintains readability.`
                },
                {
                  type: 'image_url',
                  image_url: { 
                    url: imageUrl,
                    detail: 'high' // High detail for better OCR accuracy
                  }
                }
              ]
            }
          ],
          max_tokens: 4000,
          temperature: 0.1 // Lower temperature for more consistent OCR results
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[cv-processor] OpenAI API error for page ${i + 1}:`, response.status, errorText);
        // Continue with other pages instead of failing completely
        continue;
      }

      const data = await response.json();
      const pageText = data.choices[0]?.message?.content || '';
      
      if (pageText.trim()) {
        combinedText += (combinedText ? '\n\n--- Page ' + (i + 1) + ' ---\n\n' : '') + pageText;
      }
      
      // Add small delay between API calls to avoid rate limiting
      if (i < imageDataUrls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    if (combinedText.length < 50) {
      throw new Error('OCR a produit un texte insuffisant (document peut-être vide ou illisible)');
    }

    console.log(`[cv-processor] OCR successful (${combinedText.length} chars extracted from ${imageDataUrls.length} pages)`);
    
    const normalizedText = normalizeText(combinedText);
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
    const errorMessage = (error as Error).message;
    
    // Provide more user-friendly error messages
    if (errorMessage.includes('API')) {
      throw new Error('Erreur du service OCR. Veuillez réessayer.');
    } else if (errorMessage.includes('size') || errorMessage.includes('volumineux')) {
      throw new Error(errorMessage);
    } else {
      throw new Error('Échec de la reconnaissance optique. Le document pourrait être corrompu ou illisible.');
    }
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
    console.log('[cv-processor] OpenAI API key not available, returning basic structure');
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
    console.log('[cv-processor] Structuring CV data with AI...');
    
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

Extract information accurately. If a field is not found, use empty string or array. Keep descriptions concise and professional.`
          },
          {
            role: 'user',
            content: `Parse this CV text and extract structured data as JSON only:\n\n${text.substring(0, 8000)}`
          }
        ],
        max_tokens: 2000,
        temperature: 0.1 // Lower temperature for more consistent JSON output
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[cv-processor] OpenAI structuring error:', response.status, errorText);
      throw new Error(`Erreur lors de la structuration: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices[0]?.message?.content || '{}';
    
    console.log('[cv-processor] Raw AI response length:', content.length);
    
    // Enhanced JSON extraction - handle GPT responses with extra text
    content = cleanJsonResponse(content);
    
    try {
      const parsed = JSON.parse(content);
      console.log('[cv-processor] Successfully parsed structured data');
      return parsed;
    } catch (parseError) {
      console.error('[cv-processor] JSON parsing failed, trying regex extraction:', parseError);
      
      // Try to extract JSON using regex as fallback
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const extracted = JSON.parse(jsonMatch[0]);
          console.log('[cv-processor] Successfully extracted JSON with regex');
          return extracted;
        } catch (regexError) {
          console.error('[cv-processor] Regex JSON extraction also failed:', regexError);
        }
      }
      
      // If all else fails, return basic structure
      console.log('[cv-processor] Falling back to basic structure');
      return getBasicStructure();
    }

  } catch (error) {
    console.error('[cv-processor] Structuring failed:', error);
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

// Helper function to convert PDF pages to images
async function convertPDFToImages(arrayBuffer: ArrayBuffer): Promise<string[]> {
  try {
    console.log('[cv-processor] Loading PDF for image conversion...');
    
    // For now, convert the entire PDF to base64 and let OpenAI handle it
    // Future enhancement: Use a proper PDF-to-image conversion service
    const base64 = await arrayBufferToBase64(arrayBuffer);
    const dataUrl = `data:application/pdf;base64,${base64}`;
    
    console.log('[cv-processor] PDF converted to base64 for OCR processing');
    return [dataUrl];
    
  } catch (error) {
    console.error('[cv-processor] PDF conversion failed:', error);
    throw new Error('Erreur lors de la conversion PDF: ' + (error as Error).message);
  }
}

// Helper function to convert ArrayBuffer to base64
async function arrayBufferToBase64(arrayBuffer: ArrayBuffer): Promise<string> {
  const uint8Array = new Uint8Array(arrayBuffer);
  let base64 = '';
  
  // Process in chunks for better memory handling
  const chunkSize = 0x4000; // 16KB chunks
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, i + chunkSize);
    try {
      base64 += btoa(String.fromCharCode(...chunk));
    } catch (chunkError) {
      console.error(`[cv-processor] Error processing chunk at ${i}:`, chunkError);
      throw new Error('Erreur lors de la conversion du fichier');
    }
  }
  
  return base64;
}

// Helper function to extract user ID from Authorization header
async function getUserFromAuth(authHeader: string | null): Promise<string | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    return user ? user.id : null;
  } catch (error) {
    console.error('[cv-processor] Auth error:', error);
    return null;
  }
}

// Process raw text input
async function processRawText(text: string) {
  console.log('[cv-processor] Processing raw text input...');
  
  const normalizedText = normalizeText(text);
  const structuredData = await structureCV(normalizedText);
  
  return {
    raw_text: normalizedText,
    structured_data: structuredData,
    processing_method: 'raw_text_input' as const,
    confidence_score: 1.0,
    file_format: 'raw' as const
  };
}

// Helper function to return basic structure
function getBasicStructure() {
  return {
    personal_info: {},
    experience: [],
    education: [],
    skills: { technical: [], soft: [] },
    languages: [],
    certifications: []
  };
}