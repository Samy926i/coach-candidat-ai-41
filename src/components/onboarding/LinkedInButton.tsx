import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Linkedin, Check, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LinkedInButtonProps {
  onConnectionStart: () => void;
  onConnectionComplete: (success: boolean) => void;
  isConnected: boolean;
  isConnecting: boolean;
}

export function LinkedInButton({ 
  onConnectionStart, 
  onConnectionComplete, 
  isConnected, 
  isConnecting 
}: LinkedInButtonProps) {
  const { toast } = useToast();

  const handleLinkedInConnect = async () => {
    if (isConnected || isConnecting) return;

    try {
      onConnectionStart();
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'linkedin_oidc',
        options: {
          redirectTo: `${window.location.origin}/onboarding/1`,
          scopes: 'openid profile email'
        }
      });

      if (error) {
        console.error('LinkedIn connection error:', error);
        toast({
          title: "Erreur de connexion",
          description: "Impossible de se connecter à LinkedIn. Veuillez réessayer.",
          variant: "destructive"
        });
        onConnectionComplete(false);
      } else {
        // Success will be handled by auth state change
        toast({
          title: "Connexion en cours",
          description: "Redirection vers LinkedIn..."
        });
      }
    } catch (error) {
      console.error('LinkedIn connection error:', error);
      toast({
        title: "Erreur de connexion",
        description: "Une erreur inattendue s'est produite.",
        variant: "destructive"
      });
      onConnectionComplete(false);
    }
  };

  if (isConnected) {
    return (
      <Button 
        variant="outline" 
        className="w-full bg-green-50 border-green-200 text-green-700 hover:bg-green-50"
        disabled
      >
        <Check className="mr-2 h-4 w-4" />
        LinkedIn connecté
      </Button>
    );
  }

  return (
    <Button
      onClick={handleLinkedInConnect}
      disabled={isConnecting}
      className="w-full bg-[#0077B5] hover:bg-[#005885] text-white transition-all duration-200"
    >
      {isConnecting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Connexion...
        </>
      ) : (
        <>
          <Linkedin className="mr-2 h-4 w-4" />
          Connecter LinkedIn
        </>
      )}
    </Button>
  );
}