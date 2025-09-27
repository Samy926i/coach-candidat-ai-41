-- Add file_data column to store the actual file content as base64
ALTER TABLE public.cv_uploads 
ADD COLUMN file_data TEXT;