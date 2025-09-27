import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SessionList } from "@/components/coaching/SessionList";
import { TrendChart } from "@/components/coaching/TrendChart";
import { ScoreBadge } from "@/components/coaching/ScoreBadge";
import { AccountLinkingBanner } from "@/components/ui/account-linking-banner";
import { 
  Video, 
  TrendingUp, 
  Calendar, 
  Target, 
  Plus, 
  BarChart3,
  Users,
  Clock,
  Brain
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { mockKPIData, mockChartData, mockSessions } from "@/lib/mock-data";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [showAccountLinking, setShowAccountLinking] = useState(false);
  
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      
      // Check if user has LinkedIn linked
      if (session?.user) {
        const identities = session.user.identities || [];
        const hasLinkedIn = identities.some(identity => identity.provider === 'linkedin_oidc');
        const hasOtherProvider = identities.some(identity => 
          identity.provider === 'google' || identity.provider === 'email'
        );
        
        // Show linking banner if user has other providers but not LinkedIn
        setShowAccountLinking(hasOtherProvider && !hasLinkedIn);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (!session?.user) {
          navigate('/auth');
        } else {
          // Update linking banner visibility
          const identities = session.user.identities || [];
          const hasLinkedIn = identities.some(identity => identity.provider === 'linkedin_oidc');
          const hasOtherProvider = identities.some(identity => 
            identity.provider === 'google' || identity.provider === 'email'
          );
          setShowAccountLinking(hasOtherProvider && !hasLinkedIn);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  const recentSessions = mockSessions.slice(0, 3);
  const completedSessions = mockSessions.filter(s => s.status === 'completed');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Video className="h-8 w-8 text-primary" />
                <span className="text-xl font-bold">Coach Candidat IA</span>
              </div>
              <Badge variant="outline" className="hidden sm:inline-flex">
                Tableau de bord
              </Badge>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => navigate('/job-context')}
                variant="outline"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nouveau contexte
              </Button>
              <Button
                onClick={() => navigate('/interview')}
                className="bg-primary hover:bg-primary/90"
              >
                <Video className="h-4 w-4 mr-2" />
                Démarrer un entretien
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Account Linking Banner */}
        {showAccountLinking && (
          <AccountLinkingBanner onDismiss={() => setShowAccountLinking(false)} />
        )}

        {/* Welcome Section */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Bonjour {user.user_metadata?.full_name || user.email} 👋
          </h1>
          <p className="text-muted-foreground">
            Voici un aperçu de vos performances et sessions d'entretien
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dernier Score</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockKPIData.lastScore}/10</div>
              <div className="flex items-center space-x-2 mt-2">
                <TrendingUp className="h-4 w-4 text-accent" />
                <span className="text-sm text-accent">
                  +{mockKPIData.trend} depuis la dernière fois
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sessions Totales</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockKPIData.totalSessions}</div>
              <p className="text-xs text-muted-foreground mt-2">
                {completedSessions.length} terminées cette semaine
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Amélioration Moyenne</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+{mockKPIData.avgImprovement}</div>
              <p className="text-xs text-muted-foreground mt-2">
                Points par session
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Temps Pratiqué</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {completedSessions.reduce((acc, s) => acc + s.duration_minutes, 0)}min
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Cette semaine
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Recent Sessions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Progress Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Évolution de vos Performances</CardTitle>
              <CardDescription>
                Suivi de vos scores sur les dernières sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TrendChart data={mockChartData} />
            </CardContent>
          </Card>

          {/* Latest Scores */}
          <Card>
            <CardHeader>
              <CardTitle>Derniers Scores</CardTitle>
              <CardDescription>
                Performance de votre dernière session
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {completedSessions.length > 0 && (
                <div className="space-y-3">
                  <ScoreBadge 
                    score={completedSessions[0].overall_score || 0} 
                    label="Global" 
                    size="lg" 
                  />
                  <div className="space-y-2">
                    <ScoreBadge 
                      score={completedSessions[0].communication_score || 0} 
                      label="Communication" 
                    />
                    <ScoreBadge 
                      score={completedSessions[0].technical_score || 0} 
                      label="Technique" 
                    />
                    <ScoreBadge 
                      score={completedSessions[0].confidence_score || 0} 
                      label="Confiance" 
                    />
                  </div>
                </div>
              )}
              
              <Button 
                className="w-full mt-4" 
                variant="outline"
                onClick={() => navigate(`/sessions/${completedSessions[0]?.id}`)}
              >
                Voir le détail complet
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Sessions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Sessions Récentes</CardTitle>
              <CardDescription>
                Vos dernières simulations d'entretien
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              onClick={() => navigate('/sessions')}
            >
              Voir tout
            </Button>
          </CardHeader>
          <CardContent>
            <SessionList sessions={recentSessions} limit={3} />
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" 
                onClick={() => navigate('/job-context')}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-primary" />
                <span>Nouveau Contexte</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Ajoutez une offre d'emploi pour personnaliser vos entretiens
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate('/cv')}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-accent" />
                <span>Importer CV</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Téléchargez votre CV pour des questions personnalisées
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate('/cv-analysis')}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="h-5 w-5 text-primary" />
                <span>Analyse CV-JD</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Analysez votre CV face à une offre et générez des questions ciblées
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate('/settings')}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-coaching-score-good" />
                <span>Paramètres</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Configurez vos préférences et objectifs
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}