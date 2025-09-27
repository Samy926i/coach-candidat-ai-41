// Types personnalisés pour les CVs avec support d'upload direct
import type { Tables } from '@/integrations/supabase/types';

// Extension du type cv_uploads avec file_url
export interface CVUpload extends Tables<'cv_uploads'> {
  file_url?: string | null;
}

// Type pour un CV uploadé directement
export interface DirectUploadedCV {
  id: string;
  filename: string;
  file_size: number;
  file_url: string;
  created_at: string;
  is_default: boolean;
  mime_type: string;
}

// Type pour les métadonnées d'upload
export interface CVUploadMetadata {
  user_id: string;
  filename: string;
  file_size: number;
  file_url: string;
  mime_type: string;
  file_format: string;
  upload_type: 'direct' | 'parsed';
  processing_method: 'none' | 'text_extraction' | 'ocr_gpt4' | 'ocr_tesseract';
  raw_text: string;
  structured_data: Record<string, any>;
  is_active: boolean;
  is_default: boolean;
}
