import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LinkedInButton } from '@/components/onboarding/LinkedInButton';
import { ResumeDropzone } from '@/components/onboarding/ResumeDropzone';
import { useOnboardingGuard } from './useOnboardingGuard';

interface Step1Props {
  onStep1Complete?: (data: { hasLinkedIn: boolean; hasCV: boolean }) => void;
}

export default function Step1({ onStep1Complete }: Step1Props) {
  const navigate = useNavigate();
  const [hasLinkedIn, setHasLinkedIn] = useState(false);
  const [hasCV, setHasCV] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isAutoAdvancing, setIsAutoAdvancing] = useState(false);

  // Guard to prevent navigation away from onboarding
  useOnboardingGuard();

  // Check if we should show dev mode badge
  const showDevBadge = import.meta.env.DEV || 
    new URLSearchParams(window.location.search).get('tutorial') === 'force' ||
    localStorage.getItem('forceTutorial') === '1';

  // Auto-advance when both LinkedIn and CV are provided
  useEffect(() => {
    if (hasLinkedIn && hasCV && !isAutoAdvancing) {
      setIsAutoAdvancing(true);
      
      // Show success animation for 600ms then navigate
      setTimeout(() => {
        onStep1Complete?.({ hasLinkedIn, hasCV });
        navigate('/onboarding/2');
      }, 600);
    }
  }, [hasLinkedIn, hasCV, isAutoAdvancing, navigate, onStep1Complete]);

  const handleLinkedInConnect = async () => {
    setIsConnecting(true);
    
    // Simulate LinkedIn connection (placeholder)
    setTimeout(() => {
      setHasLinkedIn(true);
      setIsConnecting(false);
    }, 1500);
  };

  const handleResumeUpload = async (file: File) => {
    setIsUploading(true);
    
    // Simulate upload (placeholder)
    setTimeout(() => {
      setHasCV(true);
      setIsUploading(false);
    }, 1000);
  };

  const handleCTAClick = () => {
    onStep1Complete?.({ hasLinkedIn, hasCV });
    navigate('/onboarding/2');
  };

  const getCtaText = () => {
    if (!hasLinkedIn && !hasCV) return 'Skip';
    return 'Next';
  };

  const getCtaVariant = () => {
    if (!hasLinkedIn && !hasCV) return 'outline' as const;
    return 'default' as const;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Dev mode badge */}
      {showDevBadge && (
        <Badge 
          variant="outline" 
          className="fixed top-4 left-4 text-xs bg-warning/10 text-warning border-warning/20"
        >
          Tutorial Dev Mode
        </Badge>
      )}

      {/* Success checkmark overlay for auto-advance */}
      {isAutoAdvancing && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
          <div className="flex items-center space-x-2 bg-background p-6 rounded-2xl shadow-lg border animate-in fade-in zoom-in duration-300">
            <div className="w-6 h-6 rounded-full bg-success flex items-center justify-center">
              <svg className="w-4 h-4 text-success-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-sm font-medium">Perfect! Moving forward...</span>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="w-full max-w-[640px] p-8 sm:p-10 rounded-2xl shadow-sm border bg-card">
        <div className="space-y-6">
          {/* LinkedIn Connection */}
          <LinkedInButton
            onConnect={handleLinkedInConnect}
            isConnecting={isConnecting}
            isConnected={hasLinkedIn}
          />

          {/* Resume Upload */}
          <ResumeDropzone
            onUpload={handleResumeUpload}
            isUploading={isUploading}
            hasFile={hasCV}
          />
        </div>
      </div>

      {/* Fixed bottom-right CTA */}
      <div className="fixed bottom-6 right-6">
        <Button
          onClick={handleCTAClick}
          variant={getCtaVariant()}
          size="lg"
          className="h-12 px-8 rounded-xl font-medium shadow-lg"
          disabled={isAutoAdvancing}
        >
          {getCtaText()}
        </Button>
      </div>
    </div>
  );
}