import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useOnboardingGuard } from './useOnboardingGuard';
import { LinkedInButton } from '@/components/onboarding/LinkedInButton';
import { ResumeDropzone } from '@/components/onboarding/ResumeDropzone';
import { ArrowRight, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function Step1() {
  const navigate = useNavigate();
  const [hasLinkedIn, setHasLinkedIn] = useState(false);
  const [hasCV, setHasCV] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useOnboardingGuard();

  // Check LinkedIn connection status
  useEffect(() => {
    const checkLinkedInStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.app_metadata?.provider === 'linkedin_oidc') {
        setHasLinkedIn(true);
      }
    };
    checkLinkedInStatus();
  }, []);

  // Auto-advance when both conditions are met
  useEffect(() => {
    if (hasLinkedIn && hasCV && !isConnecting && !isUploading) {
      const timer = setTimeout(() => {
        navigate('/onboarding/2');
      }, 800); // Apple-like slight delay for magical feel
      return () => clearTimeout(timer);
    }
  }, [hasLinkedIn, hasCV, isConnecting, isUploading, navigate]);

  const canProceed = hasLinkedIn || hasCV;
  const isLoading = isConnecting || isUploading;

  const handleNext = () => {
    navigate('/onboarding/2');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-primary animate-pulse" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground">
            Set up your profile
          </h1>
          <p className="text-muted-foreground">
            Connect LinkedIn or upload your CV to get started
          </p>
        </div>

        {/* LinkedIn Connection */}
        <Card className="p-6 space-y-4 transition-all duration-200 hover:shadow-md">
          <div className="space-y-2">
            <h3 className="font-medium">LinkedIn Connection</h3>
            <p className="text-sm text-muted-foreground">
              Automatically import your professional profile
            </p>
          </div>
          <LinkedInButton 
            onConnectionStart={() => setIsConnecting(true)}
            onConnectionComplete={(success) => {
              setIsConnecting(false);
              if (success) setHasLinkedIn(true);
            }}
            isConnected={hasLinkedIn}
            isConnecting={isConnecting}
          />
        </Card>

        {/* CV Upload */}
        <Card className="p-6 space-y-4 transition-all duration-200 hover:shadow-md">
          <div className="space-y-2">
            <h3 className="font-medium">Upload CV</h3>
            <p className="text-sm text-muted-foreground">
              Drag and drop your CV in PDF format
            </p>
          </div>
          <ResumeDropzone 
            onUploadStart={() => setIsUploading(true)}
            onUploadComplete={(success) => {
              setIsUploading(false);
              if (success) setHasCV(true);
            }}
            hasCV={hasCV}
            isUploading={isUploading}
          />
        </Card>

        {/* Navigation */}
        <div className="flex justify-end pt-4">
          <Button
            onClick={handleNext}
            disabled={isLoading}
            variant={canProceed ? "default" : "outline"}
            className={`transition-all duration-200 ${!canProceed ? 'text-muted-foreground border-muted' : ''}`}
          >
            {!canProceed ? 'Skip' : 'Next'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        {/* Progress indicator */}
        <div className="flex justify-center space-x-2 pt-4">
          <div className="h-2 w-8 bg-primary rounded-full" />
          <div className="h-2 w-8 bg-muted rounded-full" />
        </div>
      </div>
    </div>
  );
}