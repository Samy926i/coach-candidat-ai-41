import { useState, useCallback } from 'react';
import { useToast } from './use-toast';
import { CVStorageService } from '../services/CVStorageService';
import type { CV } from '../types/cv';

const cvStorage = new CVStorageService();

interface UseCVUploaderResult {
  uploadCV: (file: File, userId: string) => Promise<CV>;
  previewCV: (fileUrl: string) => Promise<void>;
  deleteCV: (cv: CV) => Promise<void>;
  isLoading: boolean;
}

export function useCVUploader(): UseCVUploaderResult {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const uploadCV = useCallback(async (file: File, userId: string): Promise<CV> => {
    setIsLoading(true);
    try {
      // Validation du fichier
      if (file.type !== 'application/pdf') {
        throw new Error('Seuls les fichiers PDF sont acceptés');
      }
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('La taille du fichier ne doit pas dépasser 10MB');
      }

      // Upload du fichier
      const fileUrl = await cvStorage.uploadCV(file, userId);

      // Sauvegarde des métadonnées
      const cv = await cvStorage.saveMetadata({
        user_id: userId,
        filename: file.name,
        file_size: file.size,
        file_data: fileUrl,
        mime_type: file.type,
        file_format: 'pdf',
        upload_type: 'direct',
        is_active: true,
      });

      toast({
        title: "CV uploadé avec succès",
        description: `${file.name} a été sauvegardé`
      });

      return cv;
    } catch (error: any) {
      toast({
        title: "Erreur d'upload",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const previewCV = useCallback(async (fileUrl: string): Promise<void> => {
    try {
      const signedUrl = await cvStorage.getPreviewUrl(fileUrl);
      window.open(signedUrl, '_blank', 'noopener,noreferrer');
    } catch (error: any) {
      toast({
        title: "Erreur d'aperçu",
        description: error.message,
        variant: "destructive"
      });
    }
  }, [toast]);

  const deleteCV = useCallback(async (cv: CV): Promise<void> => {
    try {
      await cvStorage.deleteFile(cv.file_url);
      toast({
        title: "CV supprimé",
        description: "Le CV a été supprimé avec succès"
      });
    } catch (error: any) {
      toast({
        title: "Erreur de suppression",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  }, [toast]);

  return {
    uploadCV,
    previewCV,
    deleteCV,
    isLoading
  };
}