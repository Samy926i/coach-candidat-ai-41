import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowRight, Loader2, Globe, CheckCircle } from 'lucide-react';
import { useOnboardingGuard } from './useOnboardingGuard';
import type { ResearchResponse } from '@/lib/schemas/job';

export default function Step2() {
  useOnboardingGuard();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [jobUrl, setJobUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [analysisComplete, setAnalysisComplete] = useState(false);

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
      // Mark onboarding as complete and navigate to dashboard
      localStorage.setItem('onboardingCompleted', 'true');
      navigate('/dashboard');
    } else {
      analyzeJobOffer();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5 p-4">
      <div className="w-full max-w-2xl mx-auto space-y-8">
        {/* Progress indicator */}
        <div className="text-center space-y-2">
          <h1 className="coaching-heading">Step 2 of 2</h1>
          <p className="coaching-body">Let's analyze the job offer you want to prepare for</p>
        </div>

        <Card className="shadow-coaching">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center space-x-2">
              <Globe className="h-6 w-6 text-primary" />
              <span>Job Offer Analysis</span>
            </CardTitle>
            <CardDescription>
              Enter the URL of the job offer so our AI can analyze the required skills and prepare your interview
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="job-url" className="text-base font-medium">Job Offer URL</Label>
              <Input
                id="job-url"
                type="url"
                placeholder="https://www.linkedin.com/jobs/view/... or other job site"
                value={jobUrl}
                onChange={handleUrlChange}
                className="text-base h-12"
                disabled={isAnalyzing}
              />
              <p className="text-sm text-muted-foreground">
                Works with LinkedIn, Indeed, Welcome to the Jungle, and most job sites
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

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => navigate('/onboarding/1')}
                disabled={isAnalyzing}
                className="flex-1"
              >
                Back
              </Button>
              
              <Button
                onClick={handleContinue}
                disabled={(!analysisComplete && (!jobUrl.trim() || isAnalyzing))}
                className="flex-1"
                size="lg"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : analysisComplete ? (
                  <>
                    Complete tutorial
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                ) : (
                  <>
                    Analyze offer
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Helper text */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Once the analysis is complete, you can start preparing for your interview</p>
        </div>
      </div>
    </div>
  );
}