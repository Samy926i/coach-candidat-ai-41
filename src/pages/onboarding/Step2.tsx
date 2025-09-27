import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowRight, Loader2, Globe, CheckCircle, Search, Link, Sparkles } from 'lucide-react';
import { useOnboardingGuard } from './useOnboardingGuard';
import { JobSearchResults } from '@/components/onboarding/JobSearchResults';
import type { ResearchResponse } from '@/lib/schemas/job';

interface JobOffer {
  title: string;
  company: string;
  url: string;
  description: string;
  location: string;
}

export default function Step2() {
  useOnboardingGuard();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [jobUrl, setJobUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [analysisComplete, setAnalysisComplete] = useState(false);
  
  // Smart search states
  const [searchKeywords, setSearchKeywords] = useState('');
  const [searchLocation, setSearchLocation] = useState('France');
  const [experienceLevel, setExperienceLevel] = useState<'internship' | 'junior' | 'mid' | 'senior'>('junior');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<JobOffer[]>([]);
  const [activeTab, setActiveTab] = useState('search');

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
    if (url && typeof url.normalize === 'function') {
      url = url.normalize('NFC');
    }
    setJobUrl(url);
  };

  const searchJobs = async () => {
    if (!searchKeywords.trim()) {
      toast({
        title: "Mots-clés requis",
        description: "Veuillez saisir des mots-clés pour la recherche",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    setSearchResults([]);

    try {
      const response = await supabase.functions.invoke('job-search', {
        body: {
          keywords: searchKeywords,
          location: searchLocation,
          experienceLevel: experienceLevel
        }
      });

      if (response.error) {
        throw new Error('Erreur lors de la recherche');
      }

      const { jobs } = response.data;
      setSearchResults(jobs);

      toast({
        title: "Recherche terminée",
        description: `${jobs.length} offres trouvées`,
      });
    } catch (error: any) {
      console.error('Job search error:', error);
      toast({
        title: "Erreur de recherche",
        description: error.message || "Une erreur s'est produite lors de la recherche",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectJob = (url: string) => {
    setJobUrl(url);
    setActiveTab('manual');
    analyzeJobOffer();
  };

  const analyzeJobOffer = async () => {
    if (!jobUrl.trim()) {
      toast({
        title: "Missing URL",
        description: "Please enter the job offer URL",
        variant: "destructive"
      });
      return;
    }

    if (!validateUrl(jobUrl)) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL (http/https)",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    setCurrentStep('Analyzing offer...');

    try {
      setCurrentStep('Extracting information...');
      const response = await supabase.functions.invoke('research', {
        body: { url: jobUrl }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Analysis error');
      }

      const result = response.data as ResearchResponse;
      
      setCurrentStep('Analysis complete');
      setAnalysisComplete(true);
      
      toast({
        title: "Analysis successful!",
        description: `The offer for ${result.job.role_title} at ${result.job.company_name} has been successfully analyzed.`
      });

      // Store the analysis result for later use
      localStorage.setItem('job_analysis', JSON.stringify(result));
      
      // Wait a moment to show success, then enable navigation
      setTimeout(() => {
        setCurrentStep('');
      }, 1500);

    } catch (error: any) {
      console.error('Analysis error:', error);
      let errorMessage = "An error occurred during analysis";
      
      if (error.message.includes('timeout')) {
        errorMessage = "Timeout exceeded - please try again";
      } else if (error.message.includes('Invalid URL')) {
        errorMessage = "Invalid or inaccessible URL";
      } else if (error.message.includes('scraper')) {
        errorMessage = "Unable to access the page - check the URL";
      }
      
      toast({
        title: "Analysis error",
        description: errorMessage,
        variant: "destructive"
      });
      
      setIsAnalyzing(false);
      setCurrentStep('');
    }
  };

  const handleContinue = () => {
    if (analysisComplete) {
      // Navigate to step 3 for recap
      navigate('/onboarding/3');
    } else if (activeTab === 'manual') {
      analyzeJobOffer();
    } else {
      // Allow to skip the step if using search tab without analyzing
      navigate('/onboarding/3');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5 p-4">
      <div className="w-full max-w-4xl mx-auto space-y-8">
        {/* Progress indicator */}
        <div className="text-center space-y-2">
          <h1 className="coaching-heading">Étape 2 sur 3</h1>
          <p className="coaching-body">Analysons une offre d'emploi pour préparer votre entretien</p>
        </div>

        <Card className="shadow-coaching">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center space-x-2">
              <Sparkles className="h-6 w-6 text-primary" />
              <span>Analyse d'offre d'emploi</span>
            </CardTitle>
            <CardDescription>
              Recherchez automatiquement des offres ou collez une URL pour que Lightpanda l'analyse et génère des questions d'entretien personnalisées
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="search" className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Recherche automatique
                </TabsTrigger>
                <TabsTrigger value="manual" className="flex items-center gap-2">
                  <Link className="h-4 w-4" />
                  URL manuelle
                </TabsTrigger>
              </TabsList>

              <TabsContent value="search" className="space-y-4 mt-6">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="keywords">Mots-clés de recherche</Label>
                    <Input
                      id="keywords"
                      placeholder="ex: stage IA, développeur Python junior, designer UX..."
                      value={searchKeywords}
                      onChange={(e) => setSearchKeywords(e.target.value)}
                      disabled={isSearching}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="location">Localisation</Label>
                      <Input
                        id="location"
                        placeholder="France"
                        value={searchLocation}
                        onChange={(e) => setSearchLocation(e.target.value)}
                        disabled={isSearching}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="experience">Niveau d'expérience</Label>
                      <Select value={experienceLevel} onValueChange={(value: any) => setExperienceLevel(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="internship">Stage</SelectItem>
                          <SelectItem value="junior">Junior (0-2 ans)</SelectItem>
                          <SelectItem value="mid">Intermédiaire (3-5 ans)</SelectItem>
                          <SelectItem value="senior">Senior (5+ ans)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    onClick={searchJobs}
                    disabled={isSearching || !searchKeywords.trim()}
                    className="w-full"
                  >
                    {isSearching ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Recherche en cours...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Rechercher des offres
                      </>
                    )}
                  </Button>
                </div>

                {searchResults.length > 0 && (
                  <JobSearchResults
                    jobs={searchResults}
                    onSelectJob={handleSelectJob}
                    isAnalyzing={isAnalyzing}
                  />
                )}
              </TabsContent>

              <TabsContent value="manual" className="space-y-4 mt-6">
                <div className="space-y-2">
                  <Label htmlFor="job-url">URL de l'offre d'emploi</Label>
                  <Input
                    id="job-url"
                    type="url"
                    placeholder="https://www.linkedin.com/jobs/view/..."
                    value={jobUrl}
                    onChange={handleUrlChange}
                    disabled={isAnalyzing}
                  />
                  <p className="text-sm text-muted-foreground">
                    Copiez l'URL d'une offre depuis LinkedIn, Welcome to the Jungle, Indeed, etc.
                  </p>
                </div>

                {currentStep && (
                  <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 text-center">
                    <div className="flex items-center justify-center space-x-2 text-primary">
                      {analysisComplete ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      )}
                      <span className="font-medium">{currentStep}</span>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => navigate('/onboarding/1')}
                disabled={isAnalyzing}
                className="flex-1"
              >
                Retour
              </Button>
              
              <Button
                onClick={handleContinue}
                disabled={activeTab === 'manual' && !analysisComplete && (!jobUrl.trim() || isAnalyzing)}
                className="flex-1"
                size="lg"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyse en cours...
                  </>
                ) : analysisComplete ? (
                  <>
                    Continuer
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                ) : activeTab === 'manual' ? (
                  <>
                    Analyser l'offre
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                ) : (
                  <>
                    Passer cette étape
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Helper text */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Une fois l'analyse terminée, vous pourrez commencer à préparer votre entretien</p>
        </div>
      </div>
    </div>
  );
}