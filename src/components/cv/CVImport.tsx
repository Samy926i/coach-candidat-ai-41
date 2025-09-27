import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Upload, 
  FileText, 
  Download, 
  Eye,
  Loader2, 
  CheckCircle, 
  AlertTriangle,
  User,
  Briefcase,
  GraduationCap,
  Award,
  Copy
} from 'lucide-react';

interface ProcessedCV {
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
  processing_method: 'text_extraction' | 'ocr_gpt4' | 'ocr_tesseract' | 'docx_extraction' | 'txt_direct';
  confidence_score: number;
  file_format: 'pdf' | 'docx' | 'txt';
}

export function CVImport() {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ProcessedCV | null>(null);
  const [currentStep, setCurrentStep] = useState<string>('');

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Support PDF, DOCX, TXT
    const supportedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain'
    ];

    if (!supportedTypes.includes(file.type)) {
      toast({
        title: "Format non supporté",
        description: "Veuillez sélectionner un fichier PDF, DOCX ou TXT",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast({
        title: "Fichier trop volumineux",
        description: "La taille maximale autorisée est de 10MB",
        variant: "destructive"
      });
      return;
    }

    setSelectedFile(file);
    setResult(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      // Simulate file input change
      const input = document.getElementById('cv-upload') as HTMLInputElement;
      if (input) {
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        handleFileSelect({ target: { files: dt.files } } as any);
      }
    }
  };

  const processCV = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setCurrentStep('Analyse du document...');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      setCurrentStep('Traitement en cours...');
      
      const response = await supabase.functions.invoke('cv-processor', {
        body: formData
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erreur lors du traitement');
      }

      const processedData = response.data as ProcessedCV;
      setResult(processedData);

      const methodNames = {
        'text_extraction': 'Extraction de texte directe',
        'ocr_gpt4': 'OCR avec GPT-4o mini',
        'ocr_tesseract': 'OCR Tesseract',
        'docx_extraction': 'Extraction DOCX',
        'txt_direct': 'Lecture directe'
      };

      toast({
        title: "CV traité avec succès",
        description: `Méthode: ${methodNames[processedData.processing_method]} (${Math.round(processedData.confidence_score * 100)}% de confiance)`
      });

    } catch (error: any) {
      console.error('CV processing error:', error);
      
      let errorMessage = "Erreur lors du traitement du CV";
      if (error.message.includes('OCR')) {
        errorMessage = "Erreur OCR - le document pourrait être corrompu";
      } else if (error.message.includes('format')) {
        errorMessage = "Format de fichier non reconnu";
      }
      
      toast({
        title: "Erreur de traitement",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setCurrentStep('');
    }
  };

  const saveToProfile = async () => {
    if (!result || !selectedFile) return;

    try {
      setCurrentStep('Sauvegarde...');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erreur d'authentification",
          description: "Vous devez être connecté pour sauvegarder",
          variant: "destructive"
        });
        return;
      }

      // TODO: Save to unified cv_documents table once schema is properly aligned
      // For now, just show success without saving to DB
      toast({
        title: "CV traité avec succès",
        description: "Le CV a été traité et peut être téléchargé"
      });

    } catch (error: any) {
      toast({
        title: "Erreur de sauvegarde",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setCurrentStep('');
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copié",
        description: "Texte copié dans le presse-papiers"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de copier le texte",
        variant: "destructive"
      });
    }
  };

  const downloadTXT = () => {
    if (!result) return;
    
    const blob = new Blob([result.raw_text], { type: 'text/plain; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedFile?.name.replace(/\.[^/.]+$/, '') || 'cv'}_extracted.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadJSON = () => {
    if (!result) return;
    
    const blob = new Blob([JSON.stringify(result.structured_data, null, 2)], { 
      type: 'application/json; charset=utf-8' 
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedFile?.name.replace(/\.[^/.]+$/, '') || 'cv'}_structured.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getFormatBadge = (format: ProcessedCV['file_format']) => {
    const variants = {
      'pdf': 'destructive',
      'docx': 'default',
      'txt': 'secondary'
    } as const;
    
    return (
      <Badge variant={variants[format]}>
        {format.toUpperCase()}
      </Badge>
    );
  };

  const getMethodBadge = (method: ProcessedCV['processing_method']) => {
    const variants = {
      'text_extraction': 'default',
      'ocr_gpt4': 'secondary',
      'ocr_tesseract': 'outline',
      'docx_extraction': 'default',
      'txt_direct': 'secondary'
    } as const;
    
    const labels = {
      'text_extraction': 'Texte Direct',
      'ocr_gpt4': 'OCR GPT-4',
      'ocr_tesseract': 'OCR Tesseract',
      'docx_extraction': 'DOCX',
      'txt_direct': 'Texte Direct'
    };
    
    return (
      <Badge variant={variants[method]}>
        {labels[method]}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-primary" />
            <span>Import Unifié de CV</span>
          </CardTitle>
          <CardDescription>
            Importez votre CV en PDF, DOCX ou TXT - détection automatique et extraction intelligente
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div 
            className="border-2 border-dashed border-border rounded-lg p-8 text-center transition-colors hover:border-primary/50"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept=".pdf,.docx,.doc,.txt"
              onChange={handleFileSelect}
              className="hidden"
              id="cv-upload"
              disabled={isProcessing}
            />
            <label htmlFor="cv-upload" className="cursor-pointer">
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Glissez-déposez ou cliquez pour sélectionner votre CV</p>
              <p className="text-sm text-muted-foreground mt-2">
                Formats supportés: PDF, DOCX, TXT (max 10MB)
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Détection automatique: texte ou scanné
              </p>
            </label>
          </div>

          {selectedFile && (
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex items-center space-x-3">
                <FileText className="h-6 w-6 text-primary" />
                <div>
                  <p className="font-medium flex items-center space-x-2">
                    <span>{selectedFile.name}</span>
                    {getFormatBadge(selectedFile.type.includes('pdf') ? 'pdf' : 
                                   selectedFile.type.includes('word') ? 'docx' : 'txt')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              
              <Button
                onClick={processCV}
                disabled={isProcessing}
                className="ml-4"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {currentStep || 'Traitement...'}
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Traiter le CV
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Section */}
      {result && (
        <div className="space-y-6">
          {/* Processing Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Traitement terminé</span>
                </CardTitle>
                <div className="flex items-center space-x-2">
                  {getMethodBadge(result.processing_method)}
                  <Badge variant="outline">
                    {Math.round(result.confidence_score * 100)}% confiance
                  </Badge>
                </div>
              </div>
              <div className="flex items-center space-x-2 mt-4">
                <Button onClick={downloadTXT} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  TXT
                </Button>
                <Button onClick={downloadJSON} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  JSON
                </Button>
                <Button onClick={() => copyToClipboard(result.raw_text)} variant="outline" size="sm">
                  <Copy className="h-4 w-4 mr-2" />
                  Copier
                </Button>
                <Button onClick={saveToProfile} disabled={!!currentStep} className="ml-auto">
                  {currentStep ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {currentStep}
                    </>
                  ) : (
                    <>
                      <User className="h-4 w-4 mr-2" />
                      Sauvegarder
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
          </Card>

          {/* Structured Data Tabs */}
          <Tabs defaultValue="structured" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="structured">Données Structurées</TabsTrigger>
              <TabsTrigger value="raw">Texte Brut</TabsTrigger>
            </TabsList>

            {/* Structured Data Tab */}
            <TabsContent value="structured" className="space-y-4">
              {/* Personal Info */}
              {result.structured_data.personal_info && Object.keys(result.structured_data.personal_info).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-lg">
                      <User className="h-4 w-4 mr-2 text-blue-600" />
                      Informations Personnelles
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      {result.structured_data.personal_info.name && (
                        <div>
                          <span className="font-medium">Nom:</span> {result.structured_data.personal_info.name}
                        </div>
                      )}
                      {result.structured_data.personal_info.email && (
                        <div>
                          <span className="font-medium">Email:</span> {result.structured_data.personal_info.email}
                        </div>
                      )}
                      {result.structured_data.personal_info.phone && (
                        <div>
                          <span className="font-medium">Téléphone:</span> {result.structured_data.personal_info.phone}
                        </div>
                      )}
                      {result.structured_data.personal_info.location && (
                        <div>
                          <span className="font-medium">Localisation:</span> {result.structured_data.personal_info.location}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Experience */}
              {result.structured_data.experience.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-lg">
                      <Briefcase className="h-4 w-4 mr-2 text-green-600" />
                      Expérience ({result.structured_data.experience.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {result.structured_data.experience.map((exp, idx) => (
                      <div key={idx} className="border-l-2 border-primary/20 pl-4">
                        <h4 className="font-semibold">{exp.title}</h4>
                        <p className="text-sm text-muted-foreground">{exp.company} • {exp.duration}</p>
                        <p className="text-sm mt-1">{exp.description}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Education */}
              {result.structured_data.education.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-lg">
                      <GraduationCap className="h-4 w-4 mr-2 text-purple-600" />
                      Formation ({result.structured_data.education.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {result.structured_data.education.map((edu, idx) => (
                      <div key={idx} className="border-l-2 border-purple-200 pl-4">
                        <h4 className="font-semibold">{edu.degree}</h4>
                        <p className="text-sm text-muted-foreground">{edu.institution} • {edu.year}</p>
                        {edu.description && (
                          <p className="text-sm mt-1">{edu.description}</p>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Skills & Languages */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-lg">
                      <Award className="h-4 w-4 mr-2 text-orange-600" />
                      Compétences
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {result.structured_data.skills.technical.length > 0 && (
                      <div>
                        <h5 className="font-medium text-sm mb-2">Techniques:</h5>
                        <div className="flex flex-wrap gap-1">
                          {result.structured_data.skills.technical.map((skill, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {result.structured_data.skills.soft.length > 0 && (
                      <div>
                        <h5 className="font-medium text-sm mb-2">Soft Skills:</h5>
                        <div className="flex flex-wrap gap-1">
                          {result.structured_data.skills.soft.map((skill, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {result.structured_data.languages && result.structured_data.languages.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Langues & Certifications</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <h5 className="font-medium text-sm mb-2">Langues:</h5>
                        <div className="flex flex-wrap gap-1">
                          {result.structured_data.languages.map((lang, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {lang}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      {result.structured_data.certifications && result.structured_data.certifications.length > 0 && (
                        <div>
                          <h5 className="font-medium text-sm mb-2">Certifications:</h5>
                          <div className="space-y-1">
                            {result.structured_data.certifications.map((cert, idx) => (
                              <p key={idx} className="text-xs text-muted-foreground">{cert}</p>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* Raw Text Tab */}
            <TabsContent value="raw">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Texte Extrait (UTF-8)</CardTitle>
                      <CardDescription>
                        Texte normalisé prêt pour copier-coller dans des formulaires
                      </CardDescription>
                    </div>
                    <Button onClick={() => copyToClipboard(result.raw_text)} variant="outline" size="sm">
                      <Copy className="h-4 w-4 mr-2" />
                      Copier tout
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted p-4 rounded-lg max-h-96 overflow-y-auto">
                    <pre className="text-sm whitespace-pre-wrap font-mono">
                      {result.raw_text}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}