import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, Linkedin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LinkedInButtonProps {
  onConnect: () => void;
  isConnecting: boolean;
  isConnected: boolean;
}

export function LinkedInButton({ onConnect, isConnecting, isConnected }: LinkedInButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleRealLinkedInConnect = async () => {
    if (isConnecting || isConnected) return;
    
    try {
      setError(null);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'linkedin_oidc',
        options: {
          redirectTo: `${window.location.origin}/onboarding/2`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) {
        console.error('LinkedIn OAuth error:', error);
        setError("Impossible de se connecter à LinkedIn. Veuillez réessayer.");
        toast({
          title: "Erreur LinkedIn",
          description: error.message,
          variant: "destructive",
        });
      } else {
        // OAuth redirection will happen automatically
        onConnect();
      }
    } catch (err) {
      console.error('LinkedIn connection error:', err);
      setError("Erreur de connexion à LinkedIn. Veuillez réessayer.");
    }
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={handleRealLinkedInConnect}
        disabled={isConnecting || isConnected}
        className="w-full h-12 rounded-xl font-medium inline-flex items-center justify-center gap-2 bg-[#0A66C2] hover:bg-[#004182] text-white disabled:opacity-50"
      >
        {isConnecting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Connexion en cours...
          </>
        ) : isConnected ? (
          <>
            <CheckCircle className="w-5 h-5" />
            Connecté à LinkedIn
          </>
        ) : (
          <>
            <Linkedin className="w-5 h-5" />
            Continuer avec LinkedIn
          </>
        )}
      </Button>
      
      {/* Error state */}
      {error && (
        <p className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}