-- Migration pour supporter l'upload direct de fichiers CV
-- Ajout d'une colonne file_url pour stocker l'URL du fichier sur Supabase Storage

-- Ajouter la colonne file_url à la table cv_uploads
ALTER TABLE public.cv_uploads 
ADD COLUMN IF NOT EXISTS file_url TEXT;

-- Créer le bucket pour stocker les fichiers CV (si pas déjà créé)
INSERT INTO storage.buckets (id, name, public)
VALUES ('cv-files', 'cv-files', true)
ON CONFLICT (id) DO NOTHING;

-- Supprimer les politiques existantes si elles existent
DROP POLICY IF EXISTS "Users can upload their own CVs" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own CVs" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own CVs" ON storage.objects;
DROP POLICY IF EXISTS "Public can view CV files" ON storage.objects;

-- Politique de sécurité pour permettre aux utilisateurs authentifiés d'uploader leurs propres CVs
CREATE POLICY "Users can upload their own CVs" ON storage.objects
FOR INSERT 
WITH CHECK (
  bucket_id = 'cv-files' 
  AND auth.uid() IS NOT NULL 
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Politique pour permettre aux utilisateurs de voir leurs propres CVs
CREATE POLICY "Users can view their own CVs" ON storage.objects
FOR SELECT 
USING (
  bucket_id = 'cv-files' 
  AND auth.uid() IS NOT NULL 
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Politique pour permettre aux utilisateurs de supprimer leurs propres CVs  
CREATE POLICY "Users can delete their own CVs" ON storage.objects
FOR DELETE 
USING (
  bucket_id = 'cv-files' 
  AND auth.uid() IS NOT NULL 
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Permettre l'accès public en lecture aux fichiers (pour l'aperçu)
CREATE POLICY "Public can view CV files" ON storage.objects
FOR SELECT 
USING (bucket_id = 'cv-files');

-- Mettre à jour les contraintes pour permettre file_url OU raw_text (pas forcément les deux)
ALTER TABLE public.cv_uploads 
ALTER COLUMN raw_text DROP NOT NULL;

-- Ajouter 'direct' comme type d'upload valide
ALTER TABLE public.cv_uploads
DROP CONSTRAINT IF EXISTS cv_uploads_upload_type_check;

ALTER TABLE public.cv_uploads
ADD CONSTRAINT cv_uploads_upload_type_check 
CHECK (upload_type = ANY (ARRAY['file'::text, 'raw_text'::text, 'direct'::text]));

-- Ajouter 'none' comme méthode de traitement valide (pour upload direct sans parsing)
ALTER TABLE public.cv_uploads
DROP CONSTRAINT IF EXISTS cv_uploads_processing_method_check;

ALTER TABLE public.cv_uploads
ADD CONSTRAINT cv_uploads_processing_method_check 
CHECK (processing_method = ANY (ARRAY['text_extraction'::text, 'docx_extraction'::text, 'txt_direct'::text, 'ocr_gpt4'::text, 'raw_text_input'::text, 'none'::text]));

-- Ajouter un index sur file_url pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_cv_uploads_file_url 
ON public.cv_uploads(file_url) 
WHERE file_url IS NOT NULL;

-- Ajouter des commentaires pour clarifier l'usage
COMMENT ON COLUMN public.cv_uploads.file_url IS 'URL publique du fichier CV stocké sur Supabase Storage (pour upload direct)';
COMMENT ON COLUMN public.cv_uploads.raw_text IS 'Texte extrait du CV (NULL si upload direct sans parsing)';
COMMENT ON COLUMN public.cv_uploads.file_data IS 'Données du fichier ou URL temporaire (usage flexible)';

-- Créer une vue pour les CVs avec fichiers uploadés directement
CREATE OR REPLACE VIEW public.cv_files_view AS
SELECT 
  id,
  user_id,
  filename,
  file_size,
  file_url,
  mime_type,
  file_format,
  upload_type,
  is_active,
  is_default,
  created_at,
  updated_at
FROM public.cv_uploads 
WHERE file_url IS NOT NULL 
  AND upload_type = 'direct'
  AND is_active = true;

-- Accorder les permissions sur la vue
GRANT SELECT ON public.cv_files_view TO authenticated;
