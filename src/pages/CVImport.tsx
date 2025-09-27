import { CVImport } from '@/components/cv/CVImport';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Upload, Target, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function CVImportPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour au Dashboard
              </Button>
              
              <div className="flex items-center space-x-2">
                <FileText className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-semibold">Import Unifié de CV</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">
              Import Unifié de CV
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
              <strong>Un seul point d'entrée</strong> pour tous vos CVs. 
              Importez facilement vos fichiers PDF, DOCX ou TXT avec détection automatique 
              du format et extraction intelligente du contenu.
            </p>
            
            {/* Process Steps */}
            <div className="grid md:grid-cols-4 gap-4 mb-8">
              <div className="text-center">
                <Upload className="h-8 w-8 text-primary mx-auto mb-2" />
                <h3 className="font-medium">1. Importez</h3>
                <p className="text-sm text-muted-foreground">PDF, DOCX, TXT</p>
              </div>
              <div className="text-center">
                <Target className="h-8 w-8 text-accent mx-auto mb-2" />
                <h3 className="font-medium">2. Détection</h3>
                <p className="text-sm text-muted-foreground">Format automatique</p>
              </div>
              <div className="text-center">
                <FileText className="h-8 w-8 text-coaching-score-good mx-auto mb-2" />
                <h3 className="font-medium">3. Extraction</h3>
                <p className="text-sm text-muted-foreground">OCR si nécessaire</p>
              </div>
              <div className="text-center">
                <CheckCircle className="h-8 w-8 text-coaching-score-excellent mx-auto mb-2" />
                <h3 className="font-medium">4. Structure</h3>
                <p className="text-sm text-muted-foreground">JSON + UTF-8</p>
              </div>
            </div>
          </div>

          {/* Benefits Card */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span>Pourquoi utiliser l'import unifié ?</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">✅ Formats supportés</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• <strong>PDF</strong> : Texte ou scanné</li>
                    <li>• <strong>DOCX</strong> : Documents Word</li>
                    <li>• <strong>TXT</strong> : Texte simple</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">🚀 Fonctionnalités</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Détection automatique du format</li>
                    <li>• OCR intelligent (GPT-4 ou Tesseract)</li>
                    <li>• Extraction UTF-8 propre</li>
                    <li>• Structure JSON organisée</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Import Component */}
          <CVImport />

          {/* Next Steps */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Étapes suivantes</CardTitle>
              <CardDescription>
                Une fois votre CV traité, vous pouvez :
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  className="h-20 flex flex-col space-y-2"
                  onClick={() => navigate('/cv-analysis')}
                >
                  <Target className="h-5 w-5 text-blue-600" />
                  <div className="text-center">
                    <div className="font-medium text-sm">Analyser avec une JD</div>
                    <div className="text-xs text-muted-foreground">Générer des questions</div>
                  </div>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-20 flex flex-col space-y-2"
                  onClick={() => navigate('/research')}
                >
                  <FileText className="h-5 w-5 text-green-600" />
                  <div className="text-center">
                    <div className="font-medium text-sm">Research d'offres</div>
                    <div className="text-xs text-muted-foreground">Packs d'entretien</div>
                  </div>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-20 flex flex-col space-y-2"
                  onClick={() => navigate('/interview')}
                >
                  <Upload className="h-5 w-5 text-purple-600" />
                  <div className="text-center">
                    <div className="font-medium text-sm">Entretien live</div>
                    <div className="text-xs text-muted-foreground">Simulation vidéo</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}