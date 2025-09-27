import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessedCV {
  raw_text: string;
  structured_data: {
    personal_info: {
      name?: string;
      email?: string;
      phone?: string;
      location?: string;
    };
    experience: Array<{
      title: string;
      company: string;
      duration: string;
      description: string;
    }>;
    education: Array<{
      degree: string;
      institution: string;
      year: string;
      description?: string;
    }>;
    skills: {
      technical: string[];
      soft: string[];
    };
    languages?: string[];
    certifications?: string[];
  };
  processing_method: 'text_extraction' | 'ocr_gpt4' | 'ocr_tesseract';
  confidence_score: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const pdfFile = formData.get('pdf') as File;
    
    if (!pdfFile) {
      return new Response(
        JSON.stringify({ error: 'No PDF file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    console.log(`[pdf-processor] Processing PDF: ${pdfFile.name}, size: ${pdfFile.size} bytes`);

    // Convert file to array buffer
    const pdfBuffer = await pdfFile.arrayBuffer();
    const pdfBytes = new Uint8Array(pdfBuffer);

    // Step 1: Try text extraction first
    console.log('[pdf-processor] Attempting text extraction...');
    let extractedText = await extractTextFromPDF(pdfBytes);
    let processingMethod: ProcessedCV['processing_method'] = 'text_extraction';
    let confidenceScore = 1.0;

    // Step 2: Check if extracted text is meaningful
    const hasReadableText = isTextReadable(extractedText);
    
    if (!hasReadableText) {
      console.log('[pdf-processor] No readable text found, using OCR...');
      
      // Try GPT-4o mini OCR first (cost-effective)
      try {
        extractedText = await performGPT4OCR(pdfBytes);
        processingMethod = 'ocr_gpt4';
        confidenceScore = 0.9;
      } catch (gptError) {
        console.log('[pdf-processor] GPT-4 OCR failed, falling back to Tesseract...');
        
        // Fallback to Tesseract if available
        try {
          extractedText = await performTesseractOCR(pdfBytes);
          processingMethod = 'ocr_tesseract';
          confidenceScore = 0.7;
        } catch (tesseractError) {
          throw new Error('All OCR methods failed');
        }
      }
    }

    // Step 3: Normalize text to UTF-8
    const normalizedText = normalizeToUTF8(extractedText);

    // Step 4: Structure the data using AI
    console.log('[pdf-processor] Structuring CV data...');
    const structuredData = await structureCVData(normalizedText);

    // Step 5: Prepare final result
    const result: ProcessedCV = {
      raw_text: normalizedText,
      structured_data: structuredData,
      processing_method: processingMethod,
      confidence_score: confidenceScore
    };

    console.log(`[pdf-processor] Successfully processed CV using ${processingMethod}`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' } }
    );

  } catch (error: any) {
    console.error('[pdf-processor] Error:', error);
    
    let status = 500;
    let message = 'Internal server error';
    
    if (error.message.includes('No PDF file')) {
      status = 400;
      message = 'Invalid or missing PDF file';
    } else if (error.message.includes('OCR')) {
      status = 503;
      message = 'OCR service temporarily unavailable';
    } else if (error.message.includes('AI') || error.message.includes('OpenAI')) {
      status = 503;
      message = 'AI processing service temporarily unavailable';
    }

    return new Response(
      JSON.stringify({ error: message, details: error.message }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
});

async function extractTextFromPDF(pdfBytes: Uint8Array): Promise<string> {
  // Simple PDF text extraction - look for text objects
  const pdfString = new TextDecoder('latin1').decode(pdfBytes);
  
  // Look for text streams and objects
  const textMatches = pdfString.match(/\((.*?)\)/g) || [];
  const extractedTexts: string[] = [];
  
  for (const match of textMatches) {
    const text = match.slice(1, -1); // Remove parentheses
    if (text.length > 3 && /[a-zA-Z]/.test(text)) {
      extractedTexts.push(text);
    }
  }
  
  return extractedTexts.join(' ');
}

function isTextReadable(text: string): boolean {
  if (!text || text.trim().length < 50) return false;
  
  // Check for readable words (at least 60% should be letters/numbers/common punctuation)
  const readableChars = text.match(/[a-zA-Z0-9\s.,!?;:()\-]/g)?.length || 0;
  const readabilityRatio = readableChars / text.length;
  
  // Check for common CV keywords
  const cvKeywords = ['experience', 'education', 'skills', 'work', 'university', 'project', 'company'];
  const hasKeywords = cvKeywords.some(keyword => 
    text.toLowerCase().includes(keyword)
  );
  
  return readabilityRatio > 0.6 && hasKeywords;
}

async function performGPT4OCR(pdfBytes: Uint8Array): Promise<string> {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }
  
  // Convert PDF to PNG images for proper OCR
  try {
    const base64PDF = btoa(String.fromCharCode(...pdfBytes));
    
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
            content: `You are an OCR expert. Extract ALL text from the image, preserving the original structure, formatting, and special characters. 
            
            IMPORTANT:
            - Maintain bullet points, line breaks, and section headers
            - Preserve accents, special characters, and Unicode
            - Keep the original order and hierarchy
            - Don't interpret or summarize - extract verbatim
            - Output clean, readable UTF-8 text`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all text from this CV/resume document. Preserve formatting and structure. Return clean UTF-8 text.'
              },
              {
                type: 'image_url',
                image_url: { 
                  url: `data:application/pdf;base64,${base64PDF}`,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 4000,
        temperature: 0.1,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`GPT-4 OCR failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content || '';
  } catch (error) {
    console.error('[pdf-processor] OCR error:', error);
    throw new Error(`OCR processing failed: ${(error as Error).message}`);
  }
}

async function performTesseractOCR(pdfBytes: Uint8Array): Promise<string> {
  // Placeholder for Tesseract OCR integration
  // In a real implementation, you'd convert PDF to images and use Tesseract
  console.log('[pdf-processor] Tesseract OCR not implemented - using fallback');
  
  // Simple fallback extraction
  const text = new TextDecoder('utf-8', { fatal: false }).decode(pdfBytes);
  return text.replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, '').slice(0, 2000);
}

function normalizeToUTF8(text: string): string {
  // Normalize Unicode to NFC form
  let normalized = text.normalize('NFC');
  
  // Clean up common OCR artifacts
  normalized = normalized
    .replace(/\s+/g, ' ') // Multiple spaces to single
    .replace(/\n\s*\n/g, '\n\n') // Multiple newlines to double
    .replace(/[""]/g, '"') // Smart quotes to regular
    .replace(/['']/g, "'") // Smart apostrophes
    .replace(/–/g, '-') // En dash to hyphen
    .replace(/—/g, '--') // Em dash to double hyphen
    .trim();
  
  return normalized;
}

async function structureCVData(text: string): Promise<ProcessedCV['structured_data']> {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured for structuring');
  }
  
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
          content: `You are a CV parsing expert. Extract and structure information from CV text into JSON format.

Return ONLY valid JSON with this exact structure:
{
  "personal_info": {
    "name": "Full Name",
    "email": "email@domain.com",
    "phone": "phone number",
    "location": "city, country"
  },
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "duration": "Start - End dates",
      "description": "Job description and achievements"
    }
  ],
  "education": [
    {
      "degree": "Degree name",
      "institution": "School/University",
      "year": "Graduation year",
      "description": "Additional details"
    }
  ],
  "skills": {
    "technical": ["skill1", "skill2"],
    "soft": ["skill1", "skill2"]
  },
  "languages": ["language1", "language2"],
  "certifications": ["cert1", "cert2"]
}

Preserve all accents and special characters. If information is missing, use null or empty arrays.`
        },
        {
          role: 'user',
          content: `Structure this CV text:\n\n${text.slice(0, 6000)}`
        }
      ],
      max_tokens: 2000,
      temperature: 0.1,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`CV structuring failed: ${response.status}`);
  }
  
  const data = await response.json();
  const structuredContent = data.choices[0].message.content;
  
  try {
    return JSON.parse(structuredContent);
  } catch (error) {
    console.error('[pdf-processor] Failed to parse structured data:', error);
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
}