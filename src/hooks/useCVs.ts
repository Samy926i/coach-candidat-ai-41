import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { CV } from '@/types/cv';
export function useCVs() {
  const [cvs, setCvs] = useState<CV[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const isFetchingRef = useRef(false);

  const fetchCVs = useCallback(async () => {
    if (isFetchingRef.current) {
      console.debug('[useCVs] fetchCVs: already fetching, skipping');
      return;
    }
    isFetchingRef.current = true;
    console.debug('[useCVs] fetchCVs: start');
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCvs([]);
        return;
      }

      const { data, error } = await supabase
        .from('cv_uploads')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: CV[] = (data || []).map((row: any) => ({
        id: row.id,
        filename: row.filename || row.file_data || 'document.pdf',
        file_size: row.file_size || 0,
        file_url: row.file_url || row.file_data || '',
        created_at: row.created_at || new Date().toISOString(),
        is_default: !!row.is_default,
        mime_type: row.mime_type || 'application/pdf'
      }));

      setCvs(mapped);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue';
      setError(errorMessage);
      console.error('Error fetching CVs:', err);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
      console.debug('[useCVs] fetchCVs: end');
    }
  }, []);

  const setDefaultCV = useCallback(async (cvId: string) => {
    try {
      await supabase
        .from('cv_uploads')
        .update({ is_default: false })
        .eq('is_active', true);

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
  }, [fetchCVs, toast]);

  const deleteCV = useCallback(async (cvId: string) => {
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
  }, [fetchCVs, toast]);

  useEffect(() => {
    fetchCVs();
  }, []);

  // helpers utilisés par le dashboard
  const getTotalDirectCVs = () => cvs.length;
  const getDirectCVs = () => cvs;

  return {
    cvs,
    loading,
    error,
    fetchCVs,
    setDefaultCV,
    deleteCV,
    refreshCVs: fetchCVs,
    getTotalDirectCVs,
    getDirectCVs,
  };
}