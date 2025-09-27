// Types pour les CVs utilisés dans l'application

export interface CV {
  id: string;
  filename: string;
  file_size: number;
  file_url: string;
  created_at: string;
  is_default: boolean;
  mime_type: string;
}

export interface UploadedCV extends CV {
  user_id?: string;
  file_data?: string;
  file_format?: string;
  upload_type?: 'direct' | 'parsed';
  processing_method?: string;
  raw_text?: string;
  structured_data?: Record<string, any>;
  is_active?: boolean;
}

export interface CVUploadMetadata {
  user_id: string;
  filename: string;
  file_size: number;
  file_url: string;
  mime_type: string;
  file_format: string;
  upload_type: 'direct' | 'parsed';
  processing_method: string;
  raw_text: string;
  structured_data: Record<string, any>;
  is_active: boolean;
  is_default: boolean;
}
