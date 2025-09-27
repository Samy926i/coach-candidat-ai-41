import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Search, Loader2, Globe } from 'lucide-react';
import type { ResearchResponse } from '@/lib/schemas/job';

interface ResearchFormProps {
  onResult: (result: ResearchResponse) => void;
}

export function ResearchForm({ onResult }: ResearchFormProps) {
  const { toast } = useToast();
  const [jobUrl, setJobUrl] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');

  const validateUrl = (url: string): boolean => {
    try {
      const parsedUrl = new URL(url);
      return ['http:', 'https:'].includes(parsedUrl.protocol);
    } catch {
      return false;
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let url = e.target.value;
    // Apply Unicode normalization for international URLs
    if (url && typeof url.normalize === 'function') {
      url = url.normalize('NFC');
    }
    setJobUrl(url);
  };

  const runResearch = async () => {
    if (!jobUrl.trim()) {
      toast({
        title: "URL manquante",
        description: "Veuillez fournir l'URL de l'offre d'emploi",
        variant: "destructive"
      });
      return;
    }

    if (!validateUrl(jobUrl)) {
      toast({
        title: "URL invalide",
        description: "Veuillez fournir une URL valide (http/https)",
        variant: "destructive"
      });
      return;
    }

    setIsSearching(true);
    setCurrentStep('Initialisation...');

    try {
      setCurrentStep('Scraping de l\'offre...');
      const response = await supabase.functions.invoke('research', {
        body: { url: jobUrl }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erreur lors de la recherche');
      }

      const result = response.data as ResearchResponse;
      onResult(result);
      
      toast({
        title: "Recherche terminée",
        description: `Analyse complète pour ${result.job.role_title} chez ${result.job.company_name}`
      });

    } catch (error: any) {
      console.error('Research error:', error);
      let errorMessage = "Une erreur s'est produite lors de la recherche";
      
      if (error.message.includes('timeout')) {
        errorMessage = "Délai d'attente dépassé - veuillez réessayer";
      } else if (error.message.includes('Invalid URL')) {
        errorMessage = "URL invalide ou inaccessible";
      } else if (error.message.includes('scraper')) {
        errorMessage = "Impossible d'accéder à la page - vérifiez l'URL";
      }
      
      toast({
        title: "Erreur de recherche",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
      setCurrentStep('');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Globe className="h-5 w-5 text-primary" />
          <span>Lightpanda Research</span>
        </CardTitle>
        <CardDescription>
          Analysez une offre d'emploi et générez des packs d'entretien personnalisés
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="job-url">URL de l'Offre d'Emploi</Label>
          <div className="flex items-center space-x-2">
            <Input
              id="job-url"
              type="url"
              placeholder="https://www.linkedin.com/jobs/view/... ou autre site d'emploi"
              value={jobUrl}
              onChange={handleUrlChange}
              className="flex-1"
              disabled={isSearching}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Supports LinkedIn, Indeed, Welcome to the Jungle, et autres sites d'emploi publics
          </p>
        </div>

        <Button
          onClick={runResearch}
          disabled={isSearching || !jobUrl.trim()}
          className="w-full"
          size="lg"
        >
          {isSearching ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {currentStep || 'Recherche en cours...'}
            </>
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              Lancer la Recherche
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}