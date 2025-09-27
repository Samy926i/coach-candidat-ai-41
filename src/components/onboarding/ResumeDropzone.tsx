import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Check, Loader2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ResumeDropzoneProps {
  onUploadStart: () => void;
  onUploadComplete: (success: boolean) => void;
  hasCV: boolean;
  isUploading: boolean;
}

export function ResumeDropzone({ 
  onUploadStart, 
  onUploadComplete, 
  hasCV, 
  isUploading 
}: ResumeDropzoneProps) {
  const { toast } = useToast();
  const [fileName, setFileName] = useState<string>('');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Format non supporté",
        description: "Veuillez sélectionner un fichier PDF ou Word (.doc, .docx)",
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

    // Simulate upload process (replace with actual upload logic)
    setTimeout(() => {
      toast({
        title: "CV importé",
        description: `${file.name} a été importé avec succès`
      });
      onUploadComplete(true);
    }, 1500);

  }, [onUploadStart, onUploadComplete, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxFiles: 1,
    disabled: hasCV || isUploading
  });

  if (hasCV) {
    return (
      <div className="border-2 border-green-200 bg-green-50 rounded-lg p-6 text-center">
        <Check className="mx-auto h-8 w-8 text-green-600 mb-2" />
        <p className="text-sm font-medium text-green-700">CV importé</p>
        <p className="text-xs text-green-600 mt-1">{fileName}</p>
      </div>
    );
  }

  if (isUploading) {
    return (
      <div className="border-2 border-dashed border-primary/50 bg-primary/5 rounded-lg p-6 text-center">
        <Loader2 className="mx-auto h-8 w-8 text-primary animate-spin mb-2" />
        <p className="text-sm font-medium text-primary">Import en cours...</p>
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
          {isDragActive ? 'Déposez votre CV ici' : 'Glissez votre CV ici'}
        </p>
        <p className="text-xs text-muted-foreground">
          ou cliquez pour sélectionner
        </p>
        <p className="text-xs text-muted-foreground">
          PDF, DOC, DOCX • Max 10MB
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