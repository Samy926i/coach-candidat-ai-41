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
  Upload
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function SessionDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState("overview");

  // --- states Supabase ---
  const [session, setSession] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // --- charger données ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        // session
        const { data: sessionData, error: sessionError } = await supabase
          .from("interview_sessions")
          .select("*")
          .eq("id", id)
          .single();
        if (sessionError) throw sessionError;
        setSession(sessionData);

        // questions
        const { data: questionsData, error: qError } = await supabase
          .from("questions")
          .select("*")
          .eq("session_id", id)
          .order("order_index", { ascending: true });
        if (qError) throw qError;
        setQuestions(questionsData);

        // answers
        const { data: answersData, error: aError } = await supabase
          .from("answers")
          .select("*")
          .eq("session_id", id);
        if (aError) throw aError;
        setAnswers(answersData);

        // feedbacks
        const { data: feedbacksData, error: fError } = await supabase
          .from("feedbacks")
          .select("*")
          .eq("session_id", id);
        if (fError) throw fError;
        setFeedbacks(feedbacksData);
      } catch (err) {
        console.error("❌ Erreur chargement session:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Chargement...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Session introuvable</p>
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
      minute: "2-digit",
    });
  };

  const overallFeedback = feedbacks.find(f => f.feedback_type === "overall");
  const questionFeedbacks = feedbacks.filter(f => f.feedback_type === "question");

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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="questions">Questions & Réponses</TabsTrigger>
            <TabsTrigger value="feedback">Feedback Détaillé</TabsTrigger>
            <TabsTrigger value="progress">Progression</TabsTrigger>
          </TabsList>

          {/* --- Overview --- */}
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Résumé de la Session</span>
                  <Badge className={`capitalize ${
                    session.status === "completed" ? "score-excellent border" : ""
                  }`}>
                    {session.status}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Session de {session.duration_minutes} minutes • Type: {session.session_type}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary mb-1">
                      {session.overall_score?.toFixed(1) || "0.0"}/10
                    </div>
                    <div className="text-sm text-muted-foreground">Score Global</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-accent mb-1">
                      {questions.length}
                    </div>
                    <div className="text-sm text-muted-foreground">Questions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-coaching-score-good mb-1">
                      {answers.length}
                    </div>
                    <div className="text-sm text-muted-foreground">Réponses</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-coaching-score-average mb-1">
                      {session.duration_minutes}min
                    </div>
                    <div className="text-sm text-muted-foreground">Durée</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* --- Questions & Réponses --- */}
          <TabsContent value="questions" className="space-y-6">
            {questions.map((question, index) => {
              const answer = answers.find(a => a.question_id === question.id);
              const questionFeedback = questionFeedbacks.find(f => f.answer_id === answer?.id);

              return (
                <Card key={question.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Question {index + 1}</CardTitle>
                      <div className="flex items-center space-x-2">
                        <Badge>{question.question_type}</Badge>
                        <Badge variant="outline">{question.difficulty}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">{question.question_text}</p>

                    {answer && (
                      <div className="bg-muted p-4 rounded-lg">
                        <p>{answer.transcript}</p>
                        <div className="flex items-center space-x-4 mt-3 text-xs text-muted-foreground">
                          <span>Durée: {Math.floor((answer.duration_seconds || 0) / 60)}min</span>
                          {answer.video_url && (
                            <Button variant="ghost" size="sm">
                              <Play className="h-3 w-3 mr-1" />
                              Revoir la vidéo
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {questionFeedback && (
                      <div className="mt-3">
                        <h4 className="font-medium">Feedback:</h4>
                        <p className="text-sm text-muted-foreground">{questionFeedback.detailed_feedback}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* --- Feedback global --- */}
          <TabsContent value="feedback" className="space-y-6">
            {overallFeedback ? (
              <Card>
                <CardHeader>
                  <CardTitle>Feedback Global</CardTitle>
                  <CardDescription>Analyse complète de votre performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{overallFeedback.detailed_feedback}</p>
                </CardContent>
              </Card>
            ) : (
              <p>Aucun feedback global</p>
            )}
          </TabsContent>

          {/* --- Progression --- */}
          <TabsContent value="progress">
            <Card>
              <CardHeader>
                <CardTitle>Analyse de Progression</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Graphique dispo après plusieurs sessions...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
