import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
// import * as pdfjsLib from 'pdfjs-dist'; // Supprimé

import {
  Upload, FileText, Download, Loader2, CheckCircle,
  User, Briefcase, GraduationCap, Award, Languages, Search, Brain
} from 'lucide-react';

// Définition du type de retour
interface CVUploadResult {
  raw_text: string;
  structured_data: {
    personal_info: {
      name?: string;
      email?: string;
      phone?: string;
      location?: string;
    };
    experience: Array<{
      title: string;
      company: string;
      duration: string;
      description: string;
    }>;
    education: Array<{
      degree: string;
      institution: string;
      year: string;
      description?: string;
    }>;
    skills: {
      technical: string[];
      soft: string[];
    };
    languages?: string[];
    certifications?: string[];
  };
  processing_method: 'text_extraction' | 'docx_extraction' | 'txt_direct' | 'ocr_image' | 'raw_text_input';
  confidence_score: number;
  file_format: 'pdf' | 'docx' | 'txt' | 'raw';
  embedding?: number[];
  cv_id?: string;
}

export function UnifiedCVUploader() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'file' | 'text'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<CVUploadResult | null>(null);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Supprimé - plus besoin de PDF.js côté frontend

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    validateFile(file);
  };

  // Validation fichier centralisée
  const validateFile = (file: File) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain'
    ];

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Type de fichier non supporté",
        description: "Veuillez uploader un fichier PDF, DOCX, DOC ou TXT",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast({
        title: "Fichier trop volumineux",
        description: "La taille maximale autorisée est de 20MB",
        variant: "destructive"
      });
      return;
    }

    setSelectedFile(file);
    setResult(null);
  };

  // Supprimé - traitement déplacé vers l'Edge Function

  const processInput = async () => {
    if (!selectedFile && !rawText.trim()) {
      toast({
        title: "Aucune donnée",
        description: "Veuillez sélectionner un fichier ou saisir du texte",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setCurrentStep('Initialisation...');

    try {
      let requestData: any;

      if (activeTab === 'file' && selectedFile) {
        // Envoyer le fichier directement à l'Edge Function
        const formData = new FormData();
        formData.append('file', selectedFile);
        requestData = formData;
      } else {
        requestData = { cvContent: rawText.normalize('NFC') };
      }

      setCurrentStep('Envoi pour traitement...');
      const response = await supabase.functions.invoke('cv-processor', {
        body: requestData
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erreur lors du traitement');
      }

      const processedData = response.data as CVUploadResult;
      setResult(processedData);

      const methodNames = {
        text_extraction: 'Extraction de texte directe',
        docx_extraction: 'Extraction DOCX',
        txt_direct: 'Lecture directe TXT',
        ocr_image: 'OCR avec Images',
        raw_text_input: 'Texte brut'
      };

      toast({
        title: "CV traité avec succès",
        description: `Méthode: ${methodNames[processedData.processing_method]} • ${Math.round(processedData.confidence_score * 100)}% confiance`
      });

    } catch (error: any) {
      console.error('CV processing error:', error);
      toast({
        title: "Erreur de traitement",
        description: error.message || "Une erreur s'est produite lors du traitement",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setCurrentStep('');
    }
  };

  // Gestion drag & drop simplifiée
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) validateFile(file);
  }, [toast]);

  const getMethodBadge = (method: CVUploadResult['processing_method']) => {
    const labels: Record<CVUploadResult['processing_method'], string> = {
      text_extraction: 'PDF Direct',
      docx_extraction: 'DOCX',
      txt_direct: 'TXT Direct',
      ocr_image: 'OCR Images',
      raw_text_input: 'Texte Brut'
    };
    return <Badge>{labels[method]}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Upload Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-primary" />
            <span>Upload de CV Unifié avec IA</span>
          </CardTitle>
          <CardDescription>
            Téléchargez un CV (PDF, DOCX, TXT) ou collez le texte. Conversion automatique PDF→Images pour OCR, génération d'embeddings pour recherche sémantique.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'file' | 'text')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="file">Fichier</TabsTrigger>
              <TabsTrigger value="text">Texte</TabsTrigger>
            </TabsList>

            {/* Onglet fichier */}
            <TabsContent value="file">
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  isDragging ? 'border-primary bg-primary/5' : 'border-gray-300'
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                  ref={fileInputRef}
                  disabled={isProcessing}
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className={`mx-auto h-12 w-12 mb-4 ${isDragging ? 'text-primary' : 'text-gray-400'}`} />
                  <p className="text-lg font-medium">
                    {isDragging ? 'Déposez votre fichier ici' : 'Sélectionnez ou glissez un fichier CV'}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    PDF (auto-converti en images), DOCX, DOC, TXT (max 20MB)
                  </p>
                </label>
              </div>

              {selectedFile && (
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg mt-2">
                  <FileText className="h-5 w-5 text-blue-600 mr-2" />
                  <div>
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Onglet texte */}
            <TabsContent value="text">
              <Label htmlFor="raw-text">Contenu du CV</Label>
              <Textarea
                id="raw-text"
                placeholder="Collez le contenu de votre CV ici..."
                value={rawText}
                onChange={(e) => setRawText(e.target.value.normalize('NFC'))}
                rows={8}
                className="font-mono text-sm"
                disabled={isProcessing}
              />
            </TabsContent>
          </Tabs>

          <Button
            onClick={processInput}
            disabled={isProcessing || (!selectedFile && !rawText.trim())}
            className="w-full mt-4"
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {currentStep || 'Traitement en cours...'}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Traiter le CV
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Résultats */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>Traitement terminé</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              {getMethodBadge(result.processing_method)}
              <Badge variant="outline">{Math.round(result.confidence_score * 100)}% confiance</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="structured" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="structured">Données Structurées</TabsTrigger>
                <TabsTrigger value="raw">Texte Brut</TabsTrigger>
              </TabsList>
              <TabsContent value="raw">
                <pre className="text-sm whitespace-pre-wrap font-mono bg-gray-50 p-3 rounded-md max-h-80 overflow-y-auto">
                  {result.raw_text}
                </pre>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
