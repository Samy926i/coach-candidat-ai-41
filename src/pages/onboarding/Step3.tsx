import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, Building, MapPin, Globe, ArrowRight, Sparkles, User, FileText } from 'lucide-react';
import { useOnboardingGuard } from './useOnboardingGuard';
import type { ResearchResponse } from '@/lib/schemas/job';

export default function Step3() {
  useOnboardingGuard();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [jobAnalysis, setJobAnalysis] = useState<ResearchResponse | null>(null);
  const [profileData, setProfileData] = useState<any>(null);

  useEffect(() => {
    // Load job analysis from localStorage
    const analysis = localStorage.getItem('job_analysis');
    if (analysis) {
      try {
        setJobAnalysis(JSON.parse(analysis));
      } catch (error) {
        console.error('Error parsing job analysis:', error);
      }
    }

    // Load profile data from localStorage
    const profile = localStorage.getItem('onboarding_profile');
    if (profile) {
      try {
        setProfileData(JSON.parse(profile));
      } catch (error) {
        console.error('Error parsing profile data:', error);
      }
    }
  }, []);

  const handleStartPreparation = () => {
    // Mark onboarding as complete
    localStorage.setItem('onboardingCompleted', 'true');
    
    toast({
      title: "Félicitations !",
      description: "Votre profil est configuré. Commençons la préparation !",
    });
    
    navigate('/dashboard');
  };

  const handleAnalyzeAnother = () => {
    navigate('/onboarding/2');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5 p-4">
      <div className="w-full max-w-4xl mx-auto space-y-8">
        {/* Progress indicator */}
        <div className="text-center space-y-2">
          <h1 className="coaching-heading">Étape 3 sur 3</h1>
          <p className="coaching-body">Récapitulatif et validation de votre configuration</p>
        </div>

        <Card className="shadow-coaching">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center space-x-2">
              <CheckCircle className="h-6 w-6 text-success" />
              <span>Configuration terminée !</span>
            </CardTitle>
            <CardDescription>
              Voici un résumé de ce qui a été configuré pour optimiser votre préparation d'entretien
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Profile Summary */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Profil configuré</h3>
                <CheckCircle className="h-4 w-4 text-success" />
              </div>
              
              <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                {profileData ? (
                  <div className="space-y-2">
                    {profileData.linkedin_connected && (
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary">LinkedIn connecté</Badge>
                      </div>
                    )}
                    {profileData.cv_uploaded && (
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm">CV analysé et traité</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Profil configuré avec succès
                  </p>
                )}
              </div>
            </div>

            {/* Job Analysis Summary */}
            {jobAnalysis && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Offre d'emploi analysée</h3>
                  <CheckCircle className="h-4 w-4 text-success" />
                </div>
                
                <Card className="bg-accent/5 border-accent/20">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex flex-col space-y-2">
                      <h4 className="font-medium text-lg">{jobAnalysis.job.role_title}</h4>
                      
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Building className="h-4 w-4" />
                          <span>{jobAnalysis.job.company_name}</span>
                        </div>
                        
                        {jobAnalysis.job.location && (
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-4 w-4" />
                            <span>{jobAnalysis.job.location}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-1">
                          <Globe className="h-4 w-4" />
                          <span className="text-primary">Offre analysée</span>
                        </div>
                      </div>
                    </div>

                    {jobAnalysis.job.must_have && jobAnalysis.job.must_have.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="font-medium text-sm">Compétences requises :</h5>
                        <div className="flex flex-wrap gap-2">
                          {jobAnalysis.job.must_have.slice(0, 8).map((skill, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {jobAnalysis.job.must_have.length > 8 && (
                            <Badge variant="outline" className="text-xs">
                              +{jobAnalysis.job.must_have.length - 8} autres
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {jobAnalysis.interviewPack && (
                      <div className="space-y-2">
                        <h5 className="font-medium text-sm">
                          Questions d'entretien générées : {(jobAnalysis.interviewPack.rh_questions?.length || 0) + (jobAnalysis.interviewPack.tech_questions?.length || 0)}
                        </h5>
                        <p className="text-xs text-muted-foreground">
                          Questions personnalisées basées sur l'analyse de l'offre et votre profil
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Next Steps */}
            <div className="space-y-4 pt-4">
              <h3 className="font-semibold text-center">Prêt à commencer ?</h3>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  onClick={handleAnalyzeAnother}
                  className="flex-1"
                >
                  Analyser une autre offre
                </Button>
                
                <Button
                  onClick={handleStartPreparation}
                  className="flex-1"
                  size="lg"
                >
                  Commencer la préparation
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Helper text */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Vous pourrez toujours ajouter d'autres offres et analyser de nouveaux postes depuis le tableau de bord</p>
        </div>
      </div>
    </div>
  );
}