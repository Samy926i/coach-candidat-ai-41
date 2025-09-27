import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Linkedin, ExternalLink, Unlink, RefreshCw, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@supabase/supabase-js';

interface LinkedInSectionProps {
  user: User | null;
}

interface LinkedInProfile {
  linkedin_id?: string;
  linkedin_public_profile_url?: string;
  linkedin_headline?: string;
  linkedin_location?: string;
  linkedin_industry?: string;
  linkedin_summary?: string;
  linkedin_linked_at?: string;
}

export function LinkedInSection({ user }: LinkedInSectionProps) {
  const [loading, setLoading] = useState(false);
  const [linkedInProfile, setLinkedInProfile] = useState<LinkedInProfile | null>(null);
  const [isLinked, setIsLinked] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      checkLinkedInStatus();
      fetchLinkedInProfile();
    }
  }, [user]);

  const checkLinkedInStatus = () => {
    if (user?.identities) {
      const hasLinkedIn = user.identities.some(identity => identity.provider === 'linkedin_oidc');
      setIsLinked(hasLinkedIn);
    }
  };

  const fetchLinkedInProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('linkedin_id, linkedin_public_profile_url, linkedin_headline, linkedin_location, linkedin_industry, linkedin_summary, linkedin_linked_at')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching LinkedIn profile:', error);
        return;
      }

      if (data) {
        setLinkedInProfile(data);
      }
    } catch (error) {
      console.error('Error fetching LinkedIn profile:', error);
    }
  };

  const handleLinkLinkedIn = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.linkIdentity({
        provider: 'linkedin_oidc',
        options: {
          redirectTo: `${window.location.origin}/settings`,
        }
      });

      if (error) {
        toast({
          title: "Erreur de liaison",
          description: error.message,
          variant: "destructive",
        });
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

  const handleUnlinkLinkedIn = async () => {
    setLoading(true);
    try {
      const linkedInIdentity = user?.identities?.find(i => i.provider === 'linkedin_oidc');
      
      if (linkedInIdentity) {
        const { error } = await supabase.auth.unlinkIdentity(linkedInIdentity);

        if (error) {
          toast({
            title: "Erreur de déliaison",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Compte délié",
            description: "Votre compte LinkedIn a été délié avec succès",
          });
          setIsLinked(false);
          setLinkedInProfile(null);
        }
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

  const handleRefreshProfile = async () => {
    setLoading(true);
    try {
      // Trigger a profile refresh by re-linking (this will update the data)
      const { error } = await supabase.auth.linkIdentity({
        provider: 'linkedin_oidc',
        options: {
          redirectTo: `${window.location.origin}/settings`,
        }
      });

      if (error) {
        toast({
          title: "Erreur de rafraîchissement",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Profil mis à jour",
          description: "Vos informations LinkedIn ont été rafraîchies",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de rafraîchir le profil",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Linkedin className="h-5 w-5 text-[#0A66C2]" />
          <span>Intégration LinkedIn</span>
          {isLinked && (
            <Badge variant="outline" className="text-green-600 border-green-200">
              <CheckCircle className="w-3 h-3 mr-1" />
              Connecté
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Liez votre profil LinkedIn pour enrichir vos données et obtenir des questions personnalisées
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!isLinked ? (
          <div className="text-center py-6">
            <Linkedin className="h-12 w-12 text-[#0A66C2] mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Compte LinkedIn non lié</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Connectez votre profil LinkedIn pour enrichir vos données professionnelles et obtenir des suggestions d'amélioration plus pertinentes.
            </p>
            <Button
              onClick={handleLinkLinkedIn}
              disabled={loading}
              className="bg-[#0A66C2] hover:bg-[#004182] text-white"
            >
              <Linkedin className="w-4 h-4 mr-2" />
              {loading ? "Connexion..." : "Connecter LinkedIn"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {linkedInProfile && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Informations LinkedIn</h4>
                  <div className="flex space-x-2">
                    <Button
                      onClick={handleRefreshProfile}
                      disabled={loading}
                      variant="outline"
                      size="sm"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Actualiser
                    </Button>
                    {linkedInProfile.linkedin_public_profile_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <a 
                          href={linkedInProfile.linkedin_public_profile_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Profil
                        </a>
                      </Button>
                    )}
                  </div>
                </div>

                <div className="bg-muted/30 p-4 rounded-lg space-y-2">
                  {linkedInProfile.linkedin_headline && (
                    <div>
                      <span className="font-medium text-sm">Titre:</span>
                      <p className="text-sm">{linkedInProfile.linkedin_headline}</p>
                    </div>
                  )}
                  {linkedInProfile.linkedin_location && (
                    <div>
                      <span className="font-medium text-sm">Localisation:</span>
                      <p className="text-sm">{linkedInProfile.linkedin_location}</p>
                    </div>
                  )}
                  {linkedInProfile.linkedin_industry && (
                    <div>
                      <span className="font-medium text-sm">Secteur:</span>
                      <p className="text-sm">{linkedInProfile.linkedin_industry}</p>
                    </div>
                  )}
                  {linkedInProfile.linkedin_summary && (
                    <div>
                      <span className="font-medium text-sm">Résumé:</span>
                      <p className="text-sm">{linkedInProfile.linkedin_summary}</p>
                    </div>
                  )}
                  {linkedInProfile.linkedin_linked_at && (
                    <div className="pt-2 border-t">
                      <span className="text-xs text-muted-foreground">
                        Lié le {new Date(linkedInProfile.linkedin_linked_at).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <Separator />

            <div className="flex items-center justify-between pt-2">
              <div>
                <h4 className="font-medium text-sm">Gestion du compte</h4>
                <p className="text-xs text-muted-foreground">
                  Délier votre compte LinkedIn supprimera les données associées
                </p>
              </div>
              <Button
                onClick={handleUnlinkLinkedIn}
                disabled={loading}
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive-foreground hover:bg-destructive"
              >
                <Unlink className="w-4 h-4 mr-2" />
                Délier
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}