import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScoreBadge } from "@/components/coaching/ScoreBadge";
import { 
  ArrowLeft, 
  Download, 
  Share2, 
  Play,
  FileText,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Target,
  MessageSquare,
  BarChart3,
  Upload,
  Calendar,
  Clock,
  ArrowRight
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

export default function SessionDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState("overview");
  const [session, setSession] = useState<any | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("interview_sessions");
    if (stored) {
      const sessions = JSON.parse(stored);
      const found = sessions.find((s: any) => s.id.toString() === id?.toString());
      setSession(found || null);
    }
  }, [id]);

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Session introuvable</p>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/dashboard")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
              <div>
                <h1 className="text-xl font-semibold">{session.title}</h1>
                <p className="text-sm text-muted-foreground">
                  {formatDate(session.created_at)}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                Partager
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exporter PDF
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="feedback">Email & Feedback</TabsTrigger>
            <TabsTrigger value="progress">Progression</TabsTrigger>
          </TabsList>

          {/* === Overview === */}
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Résumé de la Session</span>
                  <Badge className="capitalize">
                    {session.status === "completed" ? "Terminé" : session.status}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Session de {session.duration_minutes} minutes • Type: {session.session_type || "N/A"}
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="flex items-center space-between">
                  <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(session.created_at)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{session.duration_minutes} min</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <FileText className="h-4 w-4" />
                      <span className="capitalize">{session.session_type || "non défini"}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {session.overall_score && (
                      <ScoreBadge score={session.overall_score} label="Score" size="sm" />
                    )}
                  </div>
                </div>

                {/* Aperçu email lié */}
                {session.email_body && (
                  <p className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap">
                    {session.email_body}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* === Feedback (Email + future feedback) === */}
          <TabsContent value="feedback" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Email lié à la session</CardTitle>
                <CardDescription>
                  Contenu récupéré depuis Supabase (via n8n)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {session.email_body ? (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {session.email_body}
                  </p>
                ) : (
                  <p className="text-muted-foreground">Aucun email attaché</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* === Progression === */}
          <TabsContent value="progress" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <span>Analyse de Progression</span>
                </CardTitle>
                <CardDescription>
                  Comparaison avec vos sessions précédentes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Graphique de progression disponible après plusieurs sessions</p>
                  <p className="text-sm mt-2">Continuez à pratiquer pour voir votre évolution !</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
