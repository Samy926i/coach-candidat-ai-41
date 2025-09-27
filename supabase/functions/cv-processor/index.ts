import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import * as pdfjsLib from "https://esm.sh/pdfjs-dist@4.0.379";
// Removed canvas import as it causes __dirname error in Deno Edge Functions

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

// Initialize database with pgvector extension (run once)
async function ensurePgVectorSetup() {
  try {
    await supabase.rpc('create_extension_if_not_exists', { extension_name: 'vector' });
  } catch (error) {
    console.log('[cv-processor] pgvector already enabled or error:', error);
  }
}

// Disable PDF.js worker for Deno Edge Functions - use workerless mode
// Worker configuré automatiquement

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
      // JSON input (images, base64 file, or raw text)
      const jsonData = await req.json();
      
      if (jsonData.cvContent) {
        // Raw text input
        rawText = jsonData.cvContent;
        uploadType = 'raw_text';
        fileName = 'raw_input.txt';
        fileType = 'text/plain';
        fileSize = rawText ? rawText.length : 0;
        
      } else if (jsonData.images && jsonData.fileName) {
        // PDF converted to images on frontend
        console.log(`[cv-processor] Received ${jsonData.images.length} images from frontend PDF conversion`);
        
        // Process images directly with OCR
        const result = await processImageArray(jsonData.images, jsonData.fileName);
        
        // Generate embeddings and store
        const cvId = await storeWithEmbeddings(result, {
          fileName: jsonData.fileName,
          fileType: jsonData.fileType || 'application/pdf',
          fileSize: jsonData.fileSize || 0,
          uploadType: 'pdf_images'
        }, req.headers.get('Authorization'));
        
        return new Response(JSON.stringify({ ...result, cv_id: cvId }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
        
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
        throw new Error('Invalid JSON input - expected cvContent, images, or fileData + fileName');
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

    // Generate embeddings and store with semantic search capability
    const cvId = await storeWithEmbeddings(result, {
      fileName,
      fileType,
      fileSize,
      uploadType
    }, req.headers.get('Authorization'));

    return new Response(JSON.stringify({ ...result, cv_id: cvId }), {
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
  console.log('[cv-processor] Processing PDF with simple text extraction...');
  
  const arrayBuffer = await file.arrayBuffer();
  
  try {
    // Extraction de texte basique et robuste
    const bytes = new Uint8Array(arrayBuffer);
    const decoder = new TextDecoder('utf-8', { fatal: false });
    
    // Convertir en texte et chercher du contenu
    let rawContent = decoder.decode(bytes);
    
    // Chercher les patterns de texte dans le PDF
    let extractedText = '';
    
    // Pattern 1: Extraire le texte entre BT et ET (PDF text objects)
    const textBlocks = rawContent.match(/BT\s*([\s\S]*?)\s*ET/g);
    if (textBlocks) {
      for (const block of textBlocks) {
        const content = block.replace(/BT\s*|\s*ET/g, '')
                            .replace(/\/\w+\s+\d+(\.\d+)?\s+Tf/g, '') // Remove font commands
                            .replace(/\d+(\.\d+)?\s+\d+(\.\d+)?\s+Td/g, '') // Remove positioning
                            .replace(/\([^)]*\)\s*Tj/g, (match) => {
                              // Extraire le texte des commandes Tj
                              const text = match.match(/\(([^)]*)\)/)?.[1] || '';
                              return text + ' ';
                            });
        extractedText += content + '\n';
      }
    }
    
    // Pattern 2: Fallback - chercher des mots simples
    if (extractedText.length < 100) {
      const words = rawContent.match(/[A-Za-z0-9@._%+-]+/g);
      if (words && words.length > 50) {
        extractedText = words.join(' ');
      }
    }
    
    // Nettoyer le texte extrait
    extractedText = extractedText
      .replace(/[^\x20-\x7E\u00C0-\u017F\n\r\t]/g, ' ') // Garder caractères lisibles
      .replace(/\s+/g, ' ')
      .trim();
    
    if (extractedText.length > 100) {
      console.log(`[cv-processor] Simple PDF extraction successful (${extractedText.length} chars)`);
      const normalizedText = normalizeText(extractedText);
      const structuredData = await structureCV(normalizedText);
      
      return {
        raw_text: normalizedText,
        structured_data: structuredData,
        processing_method: 'text_extraction' as const,
        confidence_score: 0.8,
        file_format: 'pdf' as const
      };
    }
    
    throw new Error('Extraction de texte insuffisante');
    
  } catch (error) {
    console.error('[cv-processor] PDF extraction failed:', error);
    throw new Error('Impossible de traiter ce PDF. Veuillez convertir en TXT ou utiliser un autre format.');
  }
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
      // Try to convert PDF pages to images
      console.log('[cv-processor] Attempting PDF to image conversion...');
      imageDataUrls = await convertPDFToImages(arrayBuffer);
      
      // If conversion failed, throw an error instead of sending PDF to OpenAI
      if (imageDataUrls.length === 0) {
        throw new Error('Impossible de convertir le PDF en images pour OCR. Le document pourrait être corrompu, protégé ou incompatible.');
      }
    } else {
      // For non-PDF files, convert directly to base64
      console.log('[cv-processor] Converting file to base64...');
      const base64 = await arrayBufferToBase64(arrayBuffer);
      const dataUrl = `data:application/${format};base64,${base64}`;
      imageDataUrls = [dataUrl];
    }
    
    console.log(`[cv-processor] Converted to ${imageDataUrls.length} image(s) for OCR`);

    // Process multiple images/text with OpenAI
    console.log('[cv-processor] Processing content with OpenAI...');
    let combinedText = '';
    
    for (let i = 0; i < imageDataUrls.length; i++) {
      const dataUrl = imageDataUrls[i];
      console.log(`[cv-processor] Processing content ${i + 1}/${imageDataUrls.length}...`);
      
      let pageText = '';
      
      if (dataUrl.startsWith('data:text/plain;base64,')) {
        // Handle extracted text from PDF pages
        const base64Text = dataUrl.replace('data:text/plain;base64,', '');
        pageText = decodeURIComponent(escape(atob(base64Text)));
        console.log(`[cv-processor] Processed text content (${pageText.length} chars)`);
      } else {
        // Handle images with OpenAI Vision API
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
          console.error(`[cv-processor] OpenAI API error for content ${i + 1}:`, response.status, errorText);
          continue;
        }

        const data = await response.json();
        pageText = data.choices[0]?.message?.content || '';
      }
      
      if (pageText.trim()) {
        combinedText += (combinedText ? '\n\n--- Page ' + (i + 1) + ' ---\n\n' : '') + pageText;
      }
      
      // Add small delay between API calls
      if (i < imageDataUrls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    if (combinedText.length < 50) {
      throw new Error('Extraction de texte insuffisante - le document pourrait être vide, corrompu ou protégé');
    }

    console.log(`[cv-processor] Content processing successful (${combinedText.length} chars extracted from ${imageDataUrls.length} sources)`);
    
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

// Helper function to convert PDF pages to images for OCR using Canvas
async function convertPDFToImages(arrayBuffer: ArrayBuffer): Promise<string[]> {
  console.log('[cv-processor] Converting PDF to images using PDF.js and Canvas...');
  
  try {
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    const images: string[] = [];
    const maxPages = Math.min(pdf.numPages, 10); // Limit to first 10 pages

    console.log(`[cv-processor] Processing ${maxPages} pages for conversion...`);

    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        
        // Set scale/resolution for better OCR quality
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = createCanvas(viewport.width, viewport.height);
        const context = canvas.getContext("2d");

        if (!context) {
          throw new Error(`Could not get 2D context for page ${pageNum}`);
        }

        console.log(`[cv-processor] Rendering page ${pageNum} (${viewport.width}x${viewport.height})...`);

        // Render page into canvas
        await page.render({ canvasContext: context, viewport }).promise;

        // Export as PNG base64
        const pngBuffer = canvas.toBuffer("image/png");
        const base64 = btoa(String.fromCharCode(...new Uint8Array(pngBuffer)));
        const dataUrl = `data:image/png;base64,${base64}`;
        
        images.push(dataUrl);
        console.log(`[cv-processor] Converted page ${pageNum}/${pdf.numPages} to PNG (${Math.round(dataUrl.length / 1024)}KB)`);
        
        // Clean up page resources
        page.cleanup();
        
      } catch (pageError) {
        console.error(`[cv-processor] Error processing page ${pageNum}:`, pageError);
        
        // Try fallback text extraction for this page
        try {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .filter((item: any) => 'str' in item)
            .map((item: any) => item.str)
            .join(' ');
          
          if (pageText.trim().length > 20) {
            console.log(`[cv-processor] Fallback: extracted text from page ${pageNum} (${pageText.length} chars)`);
            
            // Convert text to base64 for processing
            const textAsBase64 = btoa(unescape(encodeURIComponent(pageText)));
            const textDataUrl = `data:text/plain;base64,${textAsBase64}`;
            images.push(textDataUrl);
          }
          
          page.cleanup();
        } catch (textError) {
          console.error(`[cv-processor] Text extraction also failed for page ${pageNum}:`, textError);
        }
        
        continue;
      }
    }

    if (images.length === 0) {
      throw new Error('No pages could be converted to images or extracted as text');
    }

    console.log(`[cv-processor] Successfully converted ${images.length} pages to images/text`);
    return images;

  } catch (error) {
    console.error('[cv-processor] PDF to image conversion failed:', error);
    throw new Error(`Impossible de convertir le PDF en images pour OCR. Le document pourrait être corrompu, protégé ou incompatible.`);
  }
}


// This function has been removed - we don't send PDFs directly to OpenAI
// OpenAI's vision API only accepts image formats (PNG, JPG, WEBP), not PDFs

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

// Process images array received from frontend
async function processImageArray(images: string[], fileName: string) {
  console.log(`[cv-processor] Processing ${images.length} images from frontend`);
  
  if (!openAIApiKey) {
    throw new Error('Clé API OpenAI non configurée. OCR impossible.');
  }

  let combinedText = '';
  
  for (let i = 0; i < images.length; i++) {
    const imageDataUrl = images[i];
    console.log(`[cv-processor] Processing image ${i + 1}/${images.length}...`);
    
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
                  url: imageDataUrl,
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
      console.error(`[cv-processor] OpenAI API error for image ${i + 1}:`, response.status, errorText);
      continue;
    }

    const data = await response.json();
    const pageText = data.choices[0]?.message?.content || '';
    
    if (pageText.trim()) {
      combinedText += (combinedText ? '\n\n--- Page ' + (i + 1) + ' ---\n\n' : '') + pageText;
    }
    
    // Add small delay between API calls
    if (i < images.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  if (combinedText.length < 50) {
    throw new Error('Extraction de texte insuffisante - les images pourraient être vides ou illisibles');
  }

  console.log(`[cv-processor] Image processing successful (${combinedText.length} chars extracted from ${images.length} images)`);
  
  const normalizedText = normalizeText(combinedText);
  const structuredData = await structureCV(normalizedText);
  
  return {
    raw_text: normalizedText,
    structured_data: structuredData,
    processing_method: 'ocr_image' as const,
    confidence_score: 0.85,
    file_format: 'pdf' as const
  };
}

// Generate embeddings and store CV in database
async function storeWithEmbeddings(
  result: any,
  fileInfo: { fileName: string | null; fileType: string | null; fileSize: number; uploadType: string },
  authHeader: string | null
): Promise<string | null> {
  try {
    console.log('[cv-processor] Generating embeddings and storing CV...');
    
    // Ensure pgvector is setup
    await ensurePgVectorSetup();

    // Generate embeddings for the text
    let embedding: number[] | null = null;
    
    if (openAIApiKey && result.raw_text.length > 50) {
      console.log('[cv-processor] Generating OpenAI embeddings...');
      
      const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-ada-002',
          input: result.raw_text.slice(0, 8000) // Limit to 8k chars for embedding
        })
      });

      if (embeddingResponse.ok) {
        const embeddingData = await embeddingResponse.json();
        embedding = embeddingData.data[0]?.embedding || null;
        console.log(`[cv-processor] Generated embedding with ${embedding?.length || 0} dimensions`);
      } else {
        console.warn('[cv-processor] Failed to generate embeddings:', await embeddingResponse.text());
      }
    }

    // Get user ID if authenticated
    const userId = await getUserFromAuth(authHeader);
    
    if (!userId) {
      throw new Error('Authentication required - user must be logged in to upload CV');
    }
    
    // Store in database with embeddings
    const insertData: any = {
      user_id: userId, // Always require user ID
      filename: fileInfo.fileName,
      file_size: fileInfo.fileSize,
      mime_type: fileInfo.fileType,
      upload_type: fileInfo.uploadType,
      raw_text: result.raw_text,
      structured_data: result.structured_data,
      processing_method: result.processing_method,
      confidence_score: result.confidence_score,
      file_format: result.file_format,
      embedding: embedding ? `[${embedding.join(',')}]` : null // Convert to PostgreSQL array format
    };

    const { data, error } = await supabase
      .from('cv_uploads')
      .insert(insertData)
      .select('id')
      .single();

    if (error) {
      console.error('[cv-processor] Database storage error:', error);
      return null;
    }

    console.log(`[cv-processor] CV stored with ID: ${data.id}${embedding ? ' (with embeddings)' : ''}`);
    return data.id;

  } catch (error) {
    console.error('[cv-processor] Error storing CV with embeddings:', error);
    return null;
  }
}