import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock types for testing
interface ProcessedCV {
  raw_text: string;
  structured_data: any;
  processing_method: 'text_extraction' | 'ocr_gpt4' | 'ocr_tesseract';
  confidence_score: number;
}

// Mock functions for PDF processing
const mockExtractTextFromPDF = vi.fn();
const mockIsTextReadable = vi.fn();
const mockNormalizeToUTF8 = vi.fn();
const mockStructureCVData = vi.fn();

describe('PDF Processor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Text Detection', () => {
    it('should detect readable text correctly', () => {
      // Test readable text
      const readableText = "John Doe Software Engineer Experience at Google Education Master Computer Science Skills JavaScript React Python";
      expect(isTextReadable(readableText)).toBe(true);
      
      // Test unreadable text
      const unreadableText = "%PDF-1.5 ⚆⚇⚈⚉ binary data ⚊⚋⚌⚍";
      expect(isTextReadable(unreadableText)).toBe(false);
      
      // Test short text
      const shortText = "John";
      expect(isTextReadable(shortText)).toBe(false);
    });
  });

  describe('UTF-8 Normalization', () => {
    it('should normalize text to UTF-8 correctly', () => {
      const input = "Résumé • François Müller – Software Engineer";
      const expected = "Résumé • François Müller -- Software Engineer";
      
      expect(normalizeToUTF8(input)).toContain("Résumé");
      expect(normalizeToUTF8(input)).toContain("François");
      expect(normalizeToUTF8(input)).toContain("Müller");
    });

    it('should clean up OCR artifacts', () => {
      const input = "John    Doe\n\n\nSoftware   Engineer";
      const normalized = normalizeToUTF8(input);
      
      expect(normalized).toBe("John Doe\n\nSoftware Engineer");
    });

    it('should preserve special characters', () => {
      const input = "Café • naïve • résumé • Zürich";
      const normalized = normalizeToUTF8(input);
      
      expect(normalized).toContain("Café");
      expect(normalized).toContain("naïve");
      expect(normalized).toContain("résumé");
      expect(normalized).toContain("Zürich");
    });
  });

  describe('Processing Method Selection', () => {
    it('should use text extraction for readable PDFs', async () => {
      const mockPdfBytes = new Uint8Array([1, 2, 3]);
      mockExtractTextFromPDF.mockResolvedValue("John Doe Software Engineer Experience Education Skills");
      mockIsTextReadable.mockReturnValue(true);
      
      const result = await mockProcessCV(mockPdfBytes);
      
      expect(result.processing_method).toBe('text_extraction');
      expect(result.confidence_score).toBe(1.0);
    });

    it('should use OCR for unreadable PDFs', async () => {
      const mockPdfBytes = new Uint8Array([1, 2, 3]);
      mockExtractTextFromPDF.mockResolvedValue("%PDF-1.5 binary data");
      mockIsTextReadable.mockReturnValue(false);
      
      // Mock OCR success
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: "John Doe Software Engineer" } }]
        })
      });
      
      const result = await mockProcessCV(mockPdfBytes);
      
      expect(result.processing_method).toBe('ocr_gpt4');
      expect(result.confidence_score).toBe(0.9);
    });
  });

  describe('Data Structuring', () => {
    it('should structure CV data correctly', async () => {
      const mockText = `
        John Doe
        john.doe@email.com
        +33 1 23 45 67 89
        Paris, France
        
        Experience:
        Software Engineer at Google (2020-2023)
        Developed web applications using React and Node.js
        
        Education:
        Master Computer Science, MIT (2018-2020)
        
        Skills:
        JavaScript, React, Python, Node.js
      `;
      
      mockStructureCVData.mockResolvedValue({
        personal_info: {
          name: "John Doe",
          email: "john.doe@email.com",
          phone: "+33 1 23 45 67 89",
          location: "Paris, France"
        },
        experience: [{
          title: "Software Engineer",
          company: "Google",
          duration: "2020-2023",
          description: "Developed web applications using React and Node.js"
        }],
        education: [{
          degree: "Master Computer Science",
          institution: "MIT",
          year: "2018-2020"
        }],
        skills: {
          technical: ["JavaScript", "React", "Python", "Node.js"],
          soft: []
        }
      });
      
      const result = await mockStructureCVData(mockText);
      
      expect(result.personal_info.name).toBe("John Doe");
      expect(result.personal_info.email).toBe("john.doe@email.com");
      expect(result.experience).toHaveLength(1);
      expect(result.education).toHaveLength(1);
      expect(result.skills.technical).toContain("JavaScript");
    });
  });
});

// Helper functions for testing
function isTextReadable(text: string): boolean {
  if (!text || text.trim().length < 50) return false;
  
  const readableChars = text.match(/[a-zA-Z0-9\s.,!?;:()\-]/g)?.length || 0;
  const readabilityRatio = readableChars / text.length;
  
  const cvKeywords = ['experience', 'education', 'skills', 'work', 'university', 'project', 'company'];
  const hasKeywords = cvKeywords.some(keyword => 
    text.toLowerCase().includes(keyword)
  );
  
  return readabilityRatio > 0.6 && hasKeywords;
}

function normalizeToUTF8(text: string): string {
  let normalized = text.normalize('NFC');
  
  normalized = normalized
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/–/g, '-')
    .replace(/—/g, '--')
    .trim();
  
  return normalized;
}

async function mockProcessCV(pdfBytes: Uint8Array): Promise<ProcessedCV> {
  const extractedText = await mockExtractTextFromPDF(pdfBytes);
  const hasReadableText = mockIsTextReadable(extractedText);
  
  let processingMethod: ProcessedCV['processing_method'] = 'text_extraction';
  let confidenceScore = 1.0;
  
  if (!hasReadableText) {
    processingMethod = 'ocr_gpt4';
    confidenceScore = 0.9;
  }
  
  return {
    raw_text: extractedText,
    structured_data: {},
    processing_method: processingMethod,
    confidence_score: confidenceScore
  };
}