import { CVUploadAnalyzer } from '@/components/analysis/CVUploadAnalyzer';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Brain } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function CVAnalysis() {
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
                Retour
              </Button>
              
              <div className="flex items-center space-x-2">
                <Brain className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-semibold">Analyse CV & Génération de Questions</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">
              Analyseur Intelligent CV-Offre d'Emploi
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Uploadez votre CV et fournissez un lien vers une offre d'emploi pour obtenir une analyse 
              détaillée des compétences et des questions d'entretien personnalisées basées sur vos forces 
              et lacunes identifiées.
            </p>
          </div>

          <CVUploadAnalyzer />
        </div>
      </main>
    </div>
  );
}