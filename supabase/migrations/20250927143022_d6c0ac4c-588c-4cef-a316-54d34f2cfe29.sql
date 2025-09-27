-- Phase 1: Add missing fields to cv_uploads table

-- Add missing fields to cv_uploads table
ALTER TABLE public.cv_uploads 
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS is_default boolean DEFAULT false;

-- Add constraint to ensure only one default CV per user
CREATE UNIQUE INDEX IF NOT EXISTS cv_uploads_user_default_idx 
ON public.cv_uploads (user_id) 
WHERE is_default = true AND is_active = true;

-- Drop cv_documents table as cv_uploads is more complete
DROP TABLE IF EXISTS public.cv_documents CASCADE;