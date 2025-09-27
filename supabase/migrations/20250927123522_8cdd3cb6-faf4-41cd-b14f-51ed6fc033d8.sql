-- Create unified CV uploads table
CREATE TABLE public.cv_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  filename TEXT,
  file_size INTEGER,
  mime_type TEXT,
  upload_type TEXT NOT NULL CHECK (upload_type IN ('file', 'raw_text')),
  raw_text TEXT NOT NULL,
  structured_data JSONB NOT NULL DEFAULT '{}',
  processing_method TEXT NOT NULL CHECK (processing_method IN ('text_extraction', 'docx_extraction', 'txt_direct', 'ocr_gpt4', 'raw_text_input')),
  confidence_score NUMERIC(3,2) DEFAULT 0.0,
  file_format TEXT CHECK (file_format IN ('pdf', 'docx', 'txt', 'raw')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.cv_uploads ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own CV uploads" 
ON public.cv_uploads 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own CV uploads" 
ON public.cv_uploads 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own CV uploads" 
ON public.cv_uploads 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own CV uploads" 
ON public.cv_uploads 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_cv_uploads_updated_at
BEFORE UPDATE ON public.cv_uploads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();