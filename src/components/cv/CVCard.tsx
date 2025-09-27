import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Star, 
  Trash2, 
  Calendar, 
  Target,
  MoreVertical,
  Download,
  Eye
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

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

interface CVCardProps {
  cv: CVUpload;
  onSetDefault: (cvId: string) => void;
  onDelete: (cvId: string) => void;
}

export function CVCard({ cv, onSetDefault, onDelete }: CVCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Taille inconnue';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const getProcessingMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      'text_extraction': 'Extraction PDF',
      'docx_extraction': 'Extraction Word',
      'txt_direct': 'Texte direct',
      'ocr_gpt4': 'OCR GPT-4',
      'raw_text_input': 'Saisie directe'
    };
    return labels[method] || method;
  };

  const getConfidenceColor = (score: number | null) => {
    if (!score) return 'secondary';
    if (score >= 0.8) return 'default';
    if (score >= 0.6) return 'secondary';
    return 'destructive';
  };

  const extractedSkills = cv.structured_data?.skills || [];
  const displayName = cv.filename || 'CV saisi directement';

  return (
    <>
      <Card className={`hover:shadow-md transition-shadow ${cv.is_default ? 'ring-2 ring-primary' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{displayName}</span>
                {cv.is_default && (
                  <Star className="h-4 w-4 text-yellow-500 fill-current flex-shrink-0" />
                )}
              </CardTitle>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowPreview(true)}>
                  <Eye className="mr-2 h-4 w-4" />
                  Aperçu
                </DropdownMenuItem>
                <DropdownMenuItem disabled>
                  <Download className="mr-2 h-4 w-4" />
                  Télécharger
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {!cv.is_default && (
                  <DropdownMenuItem onClick={() => onSetDefault(cv.id)}>
                    <Star className="mr-2 h-4 w-4" />
                    Définir par défaut
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem 
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">
              {cv.file_format?.toUpperCase() || cv.upload_type}
            </Badge>
            {cv.confidence_score && (
              <Badge variant={getConfidenceColor(cv.confidence_score)}>
                <Target className="mr-1 h-3 w-3" />
                {Math.round(cv.confidence_score * 100)}%
              </Badge>
            )}
            <Badge variant="secondary">
              {getProcessingMethodLabel(cv.processing_method)}
            </Badge>
          </div>

          {cv.file_size && (
            <div className="text-sm text-muted-foreground">
              {formatFileSize(cv.file_size)}
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              {formatDistanceToNow(new Date(cv.created_at), { 
                addSuffix: true,
                locale: fr 
              })}
            </span>
          </div>

          {extractedSkills.length > 0 && (
            <div>
              <div className="text-sm font-medium mb-2">Compétences détectées :</div>
              <div className="flex flex-wrap gap-1">
                {extractedSkills.slice(0, 3).map((skill: string, index: number) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {skill}
                  </Badge>
                ))}
                {extractedSkills.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{extractedSkills.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground line-clamp-2">
            {cv.raw_text.substring(0, 120)}...
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce CV ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action archivera le CV "{displayName}". Vous pourrez le récupérer plus tard si nécessaire.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                onDelete(cv.id);
                setShowDeleteDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {showPreview && (
        <AlertDialog open={showPreview} onOpenChange={setShowPreview}>
          <AlertDialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
            <AlertDialogHeader>
              <AlertDialogTitle>Aperçu : {displayName}</AlertDialogTitle>
            </AlertDialogHeader>
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <pre className="whitespace-pre-wrap text-sm font-mono">
                {cv.raw_text}
              </pre>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Fermer</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}