import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X, Linkedin, Link } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AccountLinkingBannerProps {
  onDismiss: () => void;
}

export function AccountLinkingBanner({ onDismiss }: AccountLinkingBannerProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleLinkLinkedIn = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.linkIdentity({
        provider: 'linkedin_oidc'
      });

      if (error) {
        toast({
          title: "Erreur de liaison",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Liaison réussie",
          description: "Votre compte LinkedIn a été lié avec succès !",
        });
        onDismiss();
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur inattendue s'est produite",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full">
                <Link className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Enrichissez votre profil
              </h3>
              <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                Liez votre compte LinkedIn pour personnaliser davantage votre expérience et obtenir des questions plus pertinentes basées sur votre profil professionnel.
              </p>
              <div className="mt-3 flex space-x-3">
                <Button
                  size="sm"
                  onClick={handleLinkLinkedIn}
                  disabled={loading}
                  className="bg-[#0A66C2] hover:bg-[#0A66C2]/90 text-white"
                >
                  <Linkedin className="w-4 h-4 mr-2" />
                  {loading ? "Liaison..." : "Lier LinkedIn"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onDismiss}
                  className="text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100"
                >
                  Plus tard
                </Button>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="text-blue-400 hover:text-blue-600"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}