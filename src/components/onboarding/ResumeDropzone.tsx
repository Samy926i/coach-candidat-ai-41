import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Check, Loader2, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface ResumeDropzoneProps {
  onUploadStart: () => void;
  onUploadComplete: (success: boolean) => void;
  hasCV: boolean;
  isUploading: boolean;
}

interface UploadedCV {
  id: string;
  filename: string;
  file_data: string;
}

export function ResumeDropzone({ 
  onUploadStart, 
  onUploadComplete, 
  hasCV, 
  isUploading 
}: ResumeDropzoneProps) {
  const { toast } = useToast();
  const { userId, isAuthenticated } = useAuth();
  const [fileName, setFileName] = useState<string>('');
  const [uploadedCV, setUploadedCV] = useState<UploadedCV | null>(null);

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
  const saveCVMetadata = async (file: File, fileUrl: string) => {
    const { data, error } = await supabase
      .from('cv_uploads')
      .insert({
        user_id: userId,
        filename: file.name,
        file_size: file.size,
        file_data: fileUrl, // Stocker l'URL dans file_data
        mime_type: file.type,
        file_format: file.name.split('.').pop()?.toLowerCase() || 'pdf',
        upload_type: 'direct',
        processing_method: 'none',
        raw_text: '', // Vide car pas de parsing
        structured_data: {}, // Vide car pas de parsing
        is_active: true,
        is_default: true // Premier CV devient default
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Erreur de sauvegarde: ${error.message}`);
    }

    return {
      id: data.id,
      filename: data.filename!,
      file_data: data.file_data || fileUrl
    };
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (!isAuthenticated) {
      toast({
        title: "Authentification requise",
        description: "Veuillez vous connecter pour uploader un CV",
        variant: "destructive"
      });
      return;
    }

    // Validate file type (PDF seulement)
    if (file.type !== 'application/pdf') {
      toast({
        title: "Format non supporté",
        description: "Seuls les fichiers PDF sont acceptés",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Fichier trop volumineux",
        description: "La taille du fichier ne doit pas dépasser 10MB",
        variant: "destructive"
      });
      return;
    }

    onUploadStart();
    setFileName(file.name);

    try {
      // 1. Upload vers Supabase Storage
      const fileUrl = await uploadPDFToStorage(file);
      
      // 2. Sauvegarder les métadonnées
      const savedCV = await saveCVMetadata(file, fileUrl);
      setUploadedCV(savedCV);
      
      toast({
        title: "CV uploadé avec succès",
        description: `${file.name} a été sauvegardé`
      });

      onUploadComplete(true);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Erreur d'upload",
        description: error.message,
        variant: "destructive"
      });
      onUploadComplete(false);
    }

  }, [onUploadStart, onUploadComplete, toast, userId, isAuthenticated]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    disabled: hasCV || isUploading
  });

  const previewCV = () => {
    if (uploadedCV?.file_data) {
      window.open(uploadedCV.file_data, '_blank', 'noopener,noreferrer');
    }
  };

  if (hasCV && uploadedCV) {
    return (
      <div className="border-2 border-green-200 bg-green-50 rounded-lg p-6 text-center">
        <Check className="mx-auto h-8 w-8 text-green-600 mb-2" />
        <p className="text-sm font-medium text-green-700">CV importé</p>
        <p className="text-xs text-green-600 mt-1">{uploadedCV.filename}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={previewCV}
        >
          <Eye className="h-4 w-4 mr-1" />
          Aperçu
        </Button>
      </div>
    );
  }

  if (isUploading) {
    return (
      <div className="border-2 border-dashed border-primary/50 bg-primary/5 rounded-lg p-6 text-center">
        <Loader2 className="mx-auto h-8 w-8 text-primary animate-spin mb-2" />
        <p className="text-sm font-medium text-primary">Upload en cours...</p>
        <p className="text-xs text-muted-foreground mt-1">{fileName}</p>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200
        ${isDragActive 
          ? 'border-primary bg-primary/5 scale-[1.02]' 
          : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-primary/5'
        }
      `}
    >
      <input {...getInputProps()} />
      
      <Upload className={`mx-auto h-8 w-8 mb-3 transition-colors duration-200 ${
        isDragActive ? 'text-primary' : 'text-muted-foreground'
      }`} />
      
      <div className="space-y-2">
        <p className="text-sm font-medium">
          {isDragActive ? 'Déposez votre CV ici' : 'Glissez votre CV PDF ici'}
        </p>
        <p className="text-xs text-muted-foreground">
          ou cliquez pour sélectionner
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
        Parcourir
      </Button>
    </div>
  );
}