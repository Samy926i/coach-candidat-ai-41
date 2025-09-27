-- Migration pour corriger les relations de la base de données
-- Date: 2025-09-27
-- Objectif: Établir les relations manquantes et nettoyer les tables inutiles

-- 1. Créer la relation entre cv_uploads et auth.users
-- Cette contrainte assure que chaque CV appartient à un utilisateur valide
ALTER TABLE public.cv_uploads
ADD CONSTRAINT cv_uploads_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Créer la relation entre profiles et auth.users  
-- Cette contrainte assure que chaque profil appartient à un utilisateur valide
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Créer la relation entre interview_sessions et auth.users
-- Cette contrainte assure que chaque session appartient à un utilisateur valide
ALTER TABLE public.interview_sessions
ADD CONSTRAINT interview_sessions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 4. Créer la relation entre job_contexts et auth.users
-- Cette contrainte assure que chaque contexte appartient à un utilisateur valide
ALTER TABLE public.job_contexts
ADD CONSTRAINT job_contexts_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 5. Améliorer les politiques RLS pour cv_uploads
-- S'assurer que les utilisateurs ne peuvent voir que leurs CVs
DROP POLICY IF EXISTS "Users can view own cv_uploads" ON public.cv_uploads;
DROP POLICY IF EXISTS "Users can insert own cv_uploads" ON public.cv_uploads;
DROP POLICY IF EXISTS "Users can update own cv_uploads" ON public.cv_uploads;
DROP POLICY IF EXISTS "Users can delete own cv_uploads" ON public.cv_uploads;

-- Nouvelles politiques RLS plus strictes
CREATE POLICY "Users can view own cv_uploads" 
ON public.cv_uploads FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cv_uploads" 
ON public.cv_uploads FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cv_uploads" 
ON public.cv_uploads FOR UPDATE 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own cv_uploads" 
ON public.cv_uploads FOR DELETE 
USING (auth.uid() = user_id);

-- 6. Améliorer les politiques RLS pour profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- 7. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS cv_uploads_user_id_active_idx 
ON public.cv_uploads (user_id, is_active) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS cv_uploads_user_id_default_idx 
ON public.cv_uploads (user_id, is_default) 
WHERE is_default = true;

-- 8. Fonction pour nettoyer les données orphelines (optionnel)
-- Cette fonction peut être exécutée pour nettoyer les données existantes
CREATE OR REPLACE FUNCTION clean_orphaned_data() RETURNS void AS $$
BEGIN
    -- Supprimer les CVs sans utilisateur valide
    DELETE FROM public.cv_uploads 
    WHERE user_id NOT IN (SELECT id FROM auth.users);
    
    -- Supprimer les profils sans utilisateur valide
    DELETE FROM public.profiles 
    WHERE user_id NOT IN (SELECT id FROM auth.users);
    
    -- Supprimer les sessions sans utilisateur valide
    DELETE FROM public.interview_sessions 
    WHERE user_id NOT IN (SELECT id FROM auth.users);
    
    -- Supprimer les contextes sans utilisateur valide
    DELETE FROM public.job_contexts 
    WHERE user_id NOT IN (SELECT id FROM auth.users);
    
    RAISE NOTICE 'Données orphelines nettoyées avec succès';
END;
$$ LANGUAGE plpgsql;

-- 9. Commentaires sur les tables pour la documentation
COMMENT ON TABLE public.cv_uploads IS 'Stockage des CVs uploadés par les utilisateurs avec support pour upload direct et parsing';
COMMENT ON TABLE public.profiles IS 'Profils utilisateurs avec données LinkedIn et préférences';
COMMENT ON TABLE public.interview_sessions IS 'Sessions d''entretien avec scoring et feedback';
COMMENT ON TABLE public.job_contexts IS 'Contextes d''offres d''emploi pour la préparation';

-- 10. Contraintes additionnelles pour la cohérence des données
-- S'assurer qu'un utilisateur n'a qu'un seul CV par défaut
CREATE OR REPLACE FUNCTION check_single_default_cv() RETURNS trigger AS $$
BEGIN
    IF NEW.is_default = true THEN
        -- Désactiver le CV par défaut précédent pour cet utilisateur
        UPDATE public.cv_uploads 
        SET is_default = false 
        WHERE user_id = NEW.user_id 
        AND id != NEW.id 
        AND is_default = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger pour maintenir un seul CV par défaut
DROP TRIGGER IF EXISTS trigger_single_default_cv ON public.cv_uploads;
CREATE TRIGGER trigger_single_default_cv
    BEFORE INSERT OR UPDATE ON public.cv_uploads
    FOR EACH ROW
    EXECUTE FUNCTION check_single_default_cv();
