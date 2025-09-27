import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCVs } from '@/hooks/useCVs';
import type { DirectUploadedCV, CVUploadMetadata } from '@/types/cv';
import { 
  Upload, 
  FileText, 
  Check, 
  Loader2, 
  Eye,
  Trash2
} from 'lucide-react';

interface CVUploadDirectProps {
  onUploadComplete?: (cv: DirectUploadedCV) => void;
  userId: string;
}

export function CVUploadDirect({ onUploadComplete, userId }: CVUploadDirectProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [currentFile, setCurrentFile] = useState<string>('');
  
  // Utiliser le hook useCVs pour la cohérence avec le Dashboard
  const { getDirectCVs, refreshCVs, deleteCV: deleteCVFromHook, getTotalDirectCVs } = useCVs();
  const directCVs = getDirectCVs();

  // Charger les CVs au montage du composant
  useEffect(() => {
    refreshCVs();
  }, [refreshCVs]);

  // Upload du fichier PDF vers Supabase Storage
  const uploadPDFToStorage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `cvs/${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('cv-files')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Erreur d'upload: ${uploadError.message}`);
    }

    // Obtenir l'URL publique du fichier
    const { data } = supabase.storage
      .from('cv-files')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  // Sauvegarder les métadonnées dans la base de données
  const saveCVMetadata = async (file: File, fileUrl: string): Promise<DirectUploadedCV> => {
    const { data, error } = await supabase
      .from('cv_uploads')
      .insert({
        user_id: userId,
        filename: file.name,
        file_size: file.size,
        file_data: fileUrl, // Stocker l'URL dans file_data temporairement
        mime_type: file.type,
        file_format: file.name.split('.').pop()?.toLowerCase() || 'pdf',
        upload_type: 'direct',
        processing_method: 'none',
        raw_text: '', // Vide car pas de parsing
        structured_data: {}, // Vide car pas de parsing
        is_active: true,
        is_default: directCVs.length === 0 // Premier CV devient default
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Erreur de sauvegarde: ${error.message}`);
    }

    return {
      id: data.id,
      filename: data.filename!,
      file_size: data.file_size!,
      file_url: data.file_data || fileUrl, // Temporaire: utiliser file_data
      created_at: data.created_at,
      is_default: data.is_default || false,
      mime_type: data.mime_type || 'application/pdf'
    };
  };

  // Fonction de suppression d'un CV (utilise le hook)
  const handleDeleteCV = async (cvId: string, fileUrl: string) => {
    try {
      // Extraire le chemin du fichier depuis l'URL
      const url = new URL(fileUrl);
      const filePath = url.pathname.split('/storage/v1/object/public/cv-files/')[1];
      
      // Supprimer le fichier du storage
      const { error: storageError } = await supabase.storage
        .from('cv-files')
        .remove([filePath]);

      if (storageError) {
        console.warn('Erreur suppression storage:', storageError);
      }

      // Utiliser la fonction du hook
      await deleteCVFromHook(cvId);
      
      toast({
        title: "CV supprimé",
        description: "Le CV a été supprimé avec succès"
      });
    } catch (error: any) {
      console.error('Error deleting CV:', error);
      toast({
        title: "Erreur de suppression",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Fonction d'aperçu
  const previewCV = (fileUrl: string, filename: string) => {
    // Ouvrir dans un nouvel onglet pour l'aperçu
    window.open(fileUrl, '_blank', 'noopener,noreferrer');
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validation du type de fichier (PDF seulement)
    if (file.type !== 'application/pdf') {
      toast({
        title: "Format non supporté",
        description: "Seuls les fichiers PDF sont acceptés",
        variant: "destructive"
      });
      return;
    }

    // Validation de la taille (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Fichier trop volumineux",
        description: "La taille du fichier ne doit pas dépasser 10MB",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    setCurrentFile(file.name);

    try {
      // 1. Upload vers Supabase Storage
      const fileUrl = await uploadPDFToStorage(file);
      
      // 2. Sauvegarder les métadonnées
      const uploadedCV = await saveCVMetadata(file, fileUrl);
      
      // 3. Rafraîchir les données via le hook
      await refreshCVs();
      
      // 4. Notifier le parent
      onUploadComplete?.(uploadedCV);

      toast({
        title: "CV uploadé avec succès",
        description: `${file.name} a été sauvegardé`
      });

    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Erreur d'upload",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      setCurrentFile('');
    }
  }, [userId, directCVs.length, onUploadComplete, toast, refreshCVs]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    disabled: isUploading
  });

  return (
    <div className="space-y-6">
      {/* Zone d'upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5 text-primary" />
            <span>Upload de CV</span>
          </CardTitle>
          <CardDescription>
            Uploadez vos CVs en PDF pour les utiliser avec les agents IA
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {isUploading ? (
            <div className="border-2 border-dashed border-primary/50 bg-primary/5 rounded-lg p-8 text-center">
              <Loader2 className="mx-auto h-8 w-8 text-primary animate-spin mb-3" />
              <p className="text-sm font-medium text-primary">Upload en cours...</p>
              <p className="text-xs text-muted-foreground mt-1">{currentFile}</p>
            </div>
          ) : (
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200
                ${isDragActive 
                  ? 'border-primary bg-primary/5 scale-[1.02]' 
                  : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-primary/5'
                }
              `}
            >
              <input {...getInputProps()} />
              
              <FileText className={`mx-auto h-10 w-10 mb-4 transition-colors duration-200 ${
                isDragActive ? 'text-primary' : 'text-muted-foreground'
              }`} />
              
              <div className="space-y-2">
                <p className="text-lg font-medium">
                  {isDragActive ? 'Déposez votre CV ici' : 'Glissez votre CV PDF ici'}
                </p>
                <p className="text-sm text-muted-foreground">
                  ou cliquez pour sélectionner un fichier
                </p>
                <p className="text-xs text-muted-foreground">
                  Format: PDF • Taille max: 10MB
                </p>
              </div>

              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4"
                onClick={(e) => e.stopPropagation()}
              >
                <FileText className="mr-2 h-4 w-4" />
                Parcourir les fichiers
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Liste des CVs uploadés */}
      {directCVs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-green-600" />
              <span>Mes CVs ({directCVs.length})</span>
            </CardTitle>
            <CardDescription>
              Vos CVs sont prêts à être utilisés par les agents IA
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-3">
              {directCVs.map((cv) => (
                <div 
                  key={cv.id} 
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-red-600" />
                    <div>
                      <p className="font-medium text-sm">{cv.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {(cv.file_size / 1024 / 1024).toFixed(2)} MB • 
                        {new Date(cv.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => previewCV(cv.file_url, cv.filename)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Aperçu
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteCV(cv.id, cv.file_url)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
