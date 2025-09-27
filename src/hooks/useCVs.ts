import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CVUpload {
  id: string;
  filename: string | null;
  file_size: number | null;
  mime_type: string | null;
  upload_type: string;
  raw_text: string;
  structured_data: any;
  processing_method: string;
  confidence_score: number | null;
  file_format: string | null;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  file_data?: string | null;
  file_url?: string | null;
}

export function useCVs() {
  const [cvs, setCvs] = useState<CVUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchCVs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // CORRECTION SÉCURITE CRITIQUE: Filtrer par user_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCvs([]);
        return;
      }

      const { data, error } = await supabase
        .from('cv_uploads')
        .select('*')
        .eq('user_id', user.id) // FILTRE SÉCURISÉ PAR UTILISATEUR
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCvs(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue';
      setError(errorMessage);
      console.error('Error fetching CVs:', err);
    } finally {
      setLoading(false);
    }
  };

  const setDefaultCV = async (cvId: string) => {
    try {
      // First, remove default from all CVs
      await supabase
        .from('cv_uploads')
        .update({ is_default: false })
        .eq('is_active', true);

      // Then set the selected CV as default
      const { error } = await supabase
        .from('cv_uploads')
        .update({ is_default: true })
        .eq('id', cvId);

      if (error) throw error;

      toast({
        title: "CV par défaut mis à jour",
        description: "Ce CV est maintenant votre CV principal"
      });

      await fetchCVs();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la mise à jour';
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive"
      });
      return false;
    }
  };

  const deleteCV = async (cvId: string) => {
    try {
      const { error } = await supabase
        .from('cv_uploads')
        .update({ is_active: false })
        .eq('id', cvId);

      if (error) throw error;

      toast({
        title: "CV supprimé",
        description: "Le CV a été archivé avec succès"
      });

      await fetchCVs();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la suppression';
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive"
      });
      return false;
    }
  };

  const getDefaultCV = () => {
    return cvs.find(cv => cv.is_default);
  };

  const getTotalCVs = () => {
    return cvs.length;
  };

  // Nouvelles fonctions pour différencier les types de CVs
  const getDirectCVs = () => {
    return cvs.filter(cv => cv.upload_type === 'direct');
  };

  const getParsedCVs = () => {
    return cvs.filter(cv => cv.upload_type !== 'direct');
  };

  const getTotalDirectCVs = () => {
    return getDirectCVs().length;
  };

  const getTotalParsedCVs = () => {
    return getParsedCVs().length;
  };

  useEffect(() => {
    fetchCVs();
  }, []);

  return {
    cvs,
    loading,
    error,
    fetchCVs,
    setDefaultCV,
    deleteCV,
    getDefaultCV,
    getTotalCVs,
    getDirectCVs,
    getParsedCVs,
    getTotalDirectCVs,
    getTotalParsedCVs,
    refreshCVs: fetchCVs
  };
}