import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import * as pdfjsLib from 'pdfjs-dist';
import { 
  Upload, 
  FileText, 
  Download, 
  Loader2, 
  CheckCircle,
  User,
  Briefcase,
  GraduationCap,
  Award,
  Languages,
  Search,
  Brain
} from 'lucide-react';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.js`;

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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

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

    if (file.size > 20 * 1024 * 1024) { // 20MB limit
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

  // Convert PDF pages to images using PDF.js
  const convertPDFToImages = useCallback(async (file: File): Promise<string[]> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const images: string[] = [];
    
    const maxPages = Math.min(pdf.numPages, 10); // Limit to 10 pages for performance
    
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2.0 }); // High resolution
      
      // Create canvas
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      // Render page to canvas
      await page.render({
        canvasContext: context,
        viewport: viewport,
        canvas: canvas
      }).promise;
      
      // Convert to base64 PNG
      const imageDataUrl = canvas.toDataURL('image/png');
      images.push(imageDataUrl);
      
      // Clean up
      page.cleanup();
    }
    
    return images;
  }, []);

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
        // Check if it's a PDF that needs image conversion
        if (selectedFile.type === 'application/pdf') {
          setCurrentStep('Conversion PDF en images...');
          const images = await convertPDFToImages(selectedFile);
          
          requestData = {
            images: images,
            fileName: selectedFile.name,
            fileType: selectedFile.type,
            fileSize: selectedFile.size,
            uploadType: 'pdf_images'
          };
        } else {
          // For non-PDF files, use FormData
          setCurrentStep('Traitement du fichier...');
          const formData = new FormData();
          formData.append('file', selectedFile);
          
          requestData = formData;
        }
      } else {
        // Raw text input
        setCurrentStep('Traitement du texte...');
        requestData = { cvContent: rawText };
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
        'text_extraction': 'Extraction de texte directe',
        'docx_extraction': 'Extraction DOCX',
        'txt_direct': 'Lecture directe TXT',
        'ocr_image': 'OCR avec Images',
        'raw_text_input': 'Texte brut'
      };

      toast({
        title: "CV traité avec succès",
        description: `Méthode: ${methodNames[processedData.processing_method]} • ${Math.round(processedData.confidence_score * 100)}% confiance ${processedData.cv_id ? '• Stocké avec embeddings' : ''}`
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

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const file = files[0];
    
    if (file) {
      // Directly set the file and validate it
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

      if (file.size > 20 * 1024 * 1024) { // 20MB limit
        toast({
          title: "Fichier trop volumineux",
          description: "La taille maximale autorisée est de 20MB",
          variant: "destructive"
        });
        return;
      }

      setSelectedFile(file);
      setResult(null);
    }
  }, [toast]);

  const downloadTXT = () => {
    if (!result) return;
    
    const blob = new Blob([result.raw_text], { type: 'text/plain; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cv_extracted_${Date.now()}.txt`;
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
    link.download = `cv_structured_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getMethodBadge = (method: CVUploadResult['processing_method']) => {
    const variants = {
      'text_extraction': 'default',
      'docx_extraction': 'secondary',
      'txt_direct': 'outline',
      'ocr_image': 'secondary',
      'raw_text_input': 'default'
    } as const;
    
    const labels = {
      'text_extraction': 'PDF Direct',
      'docx_extraction': 'DOCX',
      'txt_direct': 'TXT Direct',
      'ocr_image': 'OCR Images',
      'raw_text_input': 'Texte Brut'
    };
    
    return (
      <Badge variant={variants[method]}>
        {labels[method]}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Input Section */}
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

            <TabsContent value="file" className="space-y-4">
              <div 
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  isDragging ? 'border-primary bg-primary/5' : 'border-gray-300'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
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
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="text" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="raw-text">Contenu du CV</Label>
                <Textarea
                  id="raw-text"
                  placeholder="Collez le contenu de votre CV ici..."
                  value={rawText}
                  onChange={(e) => {
                    let content = e.target.value;
                    // Apply Unicode normalization
                    if (content && typeof content.normalize === 'function') {
                      content = content.normalize('NFC');
                    }
                    setRawText(content);
                  }}
                  rows={8}
                  className="font-mono text-sm"
                  disabled={isProcessing}
                />
              </div>
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
                  {result.embedding && (
                    <Badge variant="secondary" className="flex items-center space-x-1">
                      <Search className="h-3 w-3" />
                      <span>Embeddings</span>
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <Button onClick={downloadTXT} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger TXT
                </Button>
                <Button onClick={downloadJSON} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger JSON
                </Button>
              </div>
            </CardHeader>
          </Card>

          {/* Structured Data */}
          <Tabs defaultValue="structured" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="structured">Données Structurées</TabsTrigger>
              <TabsTrigger value="raw">Texte Brut</TabsTrigger>
            </TabsList>

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

                {(result.structured_data.languages && result.structured_data.languages.length > 0) || 
                 (result.structured_data.certifications && result.structured_data.certifications.length > 0) ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center text-lg">
                        <Languages className="h-4 w-4 mr-2 text-indigo-600" />
                        Langues & Certifications
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {result.structured_data.languages && result.structured_data.languages.length > 0 && (
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
                      )}
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
                ) : null}
              </div>
            </TabsContent>

            <TabsContent value="raw">
              <Card>
                <CardHeader>
                  <CardTitle>Texte Extrait (UTF-8)</CardTitle>
                  <CardDescription>
                    Texte normalisé prêt pour copier-coller
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
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