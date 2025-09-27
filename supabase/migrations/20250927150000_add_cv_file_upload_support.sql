-- Migration pour supporter l'upload direct de fichiers CV
-- Ajout d'une colonne file_url pour stocker l'URL du fichier sur Supabase Storage

-- Ajouter la colonne file_url
ALTER TABLE public.cv_uploads 
ADD COLUMN file_url TEXT;

-- Créer le bucket pour stocker les fichiers CV
INSERT INTO storage.buckets (id, name, public)
VALUES ('cv-files', 'cv-files', true)
ON CONFLICT (id) DO NOTHING;

-- Politique de sécurité pour permettre aux utilisateurs authentifiés d'uploader leurs propres CVs
CREATE POLICY "Users can upload their own CVs" ON storage.objects
FOR INSERT 
WITH CHECK (bucket_id = 'cv-files' AND (auth.uid())::text = (storage.foldername(name))[2]);

-- Politique pour permettre aux utilisateurs de voir leurs propres CVs
CREATE POLICY "Users can view their own CVs" ON storage.objects
FOR SELECT 
USING (bucket_id = 'cv-files' AND (auth.uid())::text = (storage.foldername(name))[2]);

-- Politique pour permettre aux utilisateurs de supprimer leurs propres CVs  
CREATE POLICY "Users can delete their own CVs" ON storage.objects
FOR DELETE 
USING (bucket_id = 'cv-files' AND (auth.uid())::text = (storage.foldername(name))[2]);

-- Mettre à jour les contraintes pour permettre file_url OU raw_text
ALTER TABLE public.cv_uploads 
ALTER COLUMN raw_text DROP NOT NULL;

-- Ajouter un index sur file_url pour les requêtes
CREATE INDEX idx_cv_uploads_file_url ON public.cv_uploads(file_url) WHERE file_url IS NOT NULL;

-- Ajouter un commentaire pour clarifier l'usage
COMMENT ON COLUMN public.cv_uploads.file_url IS 'URL publique du fichier CV stocké sur Supabase Storage';
COMMENT ON COLUMN public.cv_uploads.raw_text IS 'Texte extrait du CV (NULL si upload direct sans parsing)';
