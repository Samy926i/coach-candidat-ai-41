import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SessionList } from "@/components/coaching/SessionList";
import { TrendChart } from "@/components/coaching/TrendChart";
import { ScoreBadge } from "@/components/coaching/ScoreBadge";
import { AccountLinkingBanner } from "@/components/ui/account-linking-banner";
import { ProfileCompletenessCard } from "@/components/profile/ProfileCompletenessCard";
import { 
  Video, 
  TrendingUp, 
  Calendar, 
  Target, 
  Plus, 
  BarChart3,
  Users,
  Clock,
  Brain,
  FileText,
  Globe,
  Archive,
  Star
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { mockKPIData, mockChartData } from "@/lib/mock-data";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { useCVs } from "@/hooks/useCVs";

// UI pour la modal
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [showAccountLinking, setShowAccountLinking] = useState(false);
  const { getTotalCVs, getDefaultCV } = useCVs();

  // Sessions stockées dans localStorage
  const [sessions, setSessions] = useState<any[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [title, setTitle] = useState("");

  useEffect(() => {
    // Charger les sessions locales
    const saved = localStorage.getItem("interview_sessions");
    if (saved) setSessions(JSON.parse(saved));

    // Auth Supabase (inchangé)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const identities = session.user.identities || [];
        const hasLinkedIn = identities.some(identity => identity.provider === "linkedin_oidc");
        const hasOtherProvider = identities.some(identity => 
          identity.provider === "google" || identity.provider === "email"
        );
        setShowAccountLinking(hasOtherProvider && !hasLinkedIn);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (!session?.user) navigate("/auth");
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

  // === Gestion des entretiens locaux ===
  const handleStartInterview = () => {
    if (!title) return;

    const newSession = {
      id: Date.now(),
      title,
      created_at: new Date().toISOString(),
      status: "planned",
      duration_minutes: 0,
      overall_score: null,
      email_body: null, // ⚡ ajouté
    };

    const updated = [newSession, ...sessions];
    setSessions(updated);
    localStorage.setItem("interview_sessions", JSON.stringify(updated));

    setOpenDialog(false);
    navigate(`/interview?session=${newSession.id}`);
  };

  const completedSessions = sessions.filter(s => s.status === "completed");
  const recentSessions = sessions.slice(0, 3);

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
                onClick={() => navigate("/job-context")}
                variant="outline"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nouveau contexte
              </Button>
              <Button
                onClick={() => setOpenDialog(true)}
                className="bg-primary hover:bg-primary/90"
              >
                <Video className="h-4 w-4 mr-2" />
                Démarrer un entretien
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Dialog pour nommer l’entretien */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nommez votre entretien</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Ex: Entretien Frontend Developer"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <DialogFooter>
            <Button onClick={handleStartInterview} disabled={!title}>
              Lancer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Banner compte */}
        {showAccountLinking && (
          <AccountLinkingBanner onDismiss={() => setShowAccountLinking(false)} />
        )}

        {/* Welcome */}
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
              <div className="text-2xl font-bold">{sessions.length}</div>
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
              <p className="text-xs text-muted-foreground mt-2">Points par session</p>
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
              <p className="text-xs text-muted-foreground mt-2">Cette semaine</p>
            </CardContent>
          </Card>
        </div>

        {/* Chart + Profile */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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

          <ProfileCompletenessCard user={user} />
        </div>

        {/* Sessions Récentes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Sessions Récentes</CardTitle>
              <CardDescription>Vos dernières simulations d'entretien</CardDescription>
            </div>
            <Button variant="outline" onClick={() => navigate("/sessions")}>
              Voir tout
            </Button>
          </CardHeader>
          <CardContent>
            <SessionList sessions={recentSessions} limit={3} />
          </CardContent>
        </Card>

        {/* Mes CV */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate('/my-cvs')}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Archive className="h-5 w-5 text-primary" />
                <span>Mes CV</span>
              </div>
              {getTotalCVs() > 0 && (
                <Badge variant="secondary">{getTotalCVs()}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {getTotalCVs() === 0 
                ? "Aucun CV importé" 
                : `${getTotalCVs()} CV${getTotalCVs() > 1 ? 's' : ''} dans votre bibliothèque`
              }
            </p>
            {getDefaultCV() && (
              <div className="mt-2 flex items-center text-xs text-muted-foreground">
                <Star className="h-3 w-3 text-yellow-500 mr-1" />
                CV principal: {getDefaultCV()?.filename || 'CV directement saisi'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
