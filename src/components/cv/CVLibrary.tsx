import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CVCard } from './CVCard';
import { UnifiedCVUploader } from '@/components/upload/UnifiedCVUploader';

interface CVUpload {
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
}

export function CVLibrary() {
  const [cvs, setCvs] = useState<CVUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploader, setShowUploader] = useState(false);
  const { toast } = useToast();

  const fetchCVs = async () => {
    try {
      const { data, error } = await supabase
        .from('cv_uploads')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCvs(data || []);
    } catch (error) {
      console.error('Error fetching CVs:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger vos CV",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCVs();
  }, []);

  const handleSetDefault = async (cvId: string) => {
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

      fetchCVs();
    } catch (error) {
      console.error('Error setting default CV:', error);
      toast({
        title: "Erreur",
        description: "Impossible de définir ce CV comme principal",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (cvId: string) => {
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

      fetchCVs();
    } catch (error) {
      console.error('Error deleting CV:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le CV",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (showUploader) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Ajouter un nouveau CV</span>
            <Button variant="ghost" onClick={() => setShowUploader(false)}>
              Retour
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <UnifiedCVUploader />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Mes CV</h2>
          <p className="text-muted-foreground">
            Gérez vos CV et documents professionnels
          </p>
        </div>
        <Button onClick={() => setShowUploader(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Ajouter un CV
        </Button>
      </div>

      {cvs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun CV trouvé</h3>
            <p className="text-muted-foreground mb-4">
              Commencez par importer votre premier CV
            </p>
            <Button onClick={() => setShowUploader(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un CV
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cvs.map((cv) => (
            <CVCard
              key={cv.id}
              cv={cv}
              onSetDefault={handleSetDefault}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}