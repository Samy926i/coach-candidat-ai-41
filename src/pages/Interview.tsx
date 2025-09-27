import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { createAgent, createSession } from "@/services/beyondPresence";
import { 
  ArrowLeft, 
  Video,
  Play,
  Clock,
  MessageSquare,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client"; // ⚡ import Supabase
import { mockQuestions } from "@/lib/mock-data";

export default function Interview() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erreur",
          description: "Aucun utilisateur connecté",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }
      setUser(user);
    };
    fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const userId = user?.id; // ✅ c’est ce qu’attend la DB

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [bpUrl, setBpUrl] = useState<string | null>(null); // ✅ nouvel état pour l’URL dynamique
  const [questions, setQuestions] = useState<any[]>(mockQuestions);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [sessionStatus, setSessionStatus] = useState<'setup' | 'active' | 'completed'>('setup');
  const [transcript, setTranscript] = useState("");

  const currentQ = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  // Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (sessionStatus === 'active') {
      interval = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [sessionStatus]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // === START SESSION ===
  const handleStartSession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erreur",
          description: "Aucun utilisateur connecté",
          variant: "destructive",
        });
        return;
      }

      // 1. Créer un agent et une session côté BeyondPresence
      const agent = await createAgent();
      const bpSession = await createSession(agent.id);

      // ✅ Sauvegarde l’URL de la session
      setBpUrl(`https://bey.chat/${bpSession.id}`);

      // 2. Créer une session côté Supabase
      const { data: session, error: sessionError } = await supabase
        .from("interview_sessions")
        .insert({
          user_id: user.id,
          title: "Frontend Developer Interview",
          status: "in_progress",
          session_type: "mixed",
          duration_minutes: 30,
          beyond_presence_session_id: bpSession.id,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      setSessionId(session.id);

      // 3. Ajouter les questions
      const { error: qError } = await supabase.from("questions").insert(
        mockQuestions.map((q, index) => ({
          session_id: session.id,
          question_text: q.question_text,
          question_type: q.question_type || "technical",
          difficulty: q.difficulty || "medium",
          order_index: index,
        }))
      );
      if (qError) throw qError;

      // 4. Mettre en "active"
      setSessionStatus("active");
      toast({
        title: "Session démarrée",
        description: "L'entretien vidéo a commencé",
      });
    } catch (err) {
      console.error("❌ Erreur handleStartSession:", err);
      toast({
        title: "Erreur",
        description: "Impossible de démarrer la session",
        variant: "destructive",
      });
    }
  };

  // === SAVE ANSWER ===
  const handleToggleRecording = async () => {
    setIsRecording(!isRecording);

    if (!isRecording) {
      setTranscript("Enregistrement en cours...");
    } else {
      const finalTranscript = `Voici ma réponse à la question "${currentQ?.question_text}".`;
      setTranscript(finalTranscript);

      if (!sessionId) return;

      try {
        // Récupérer l’id de la question en DB
        const { data: question } = await supabase
          .from("questions")
          .select("id")
          .eq("session_id", sessionId)
          .eq("order_index", currentQuestion)
          .single();

        if (!question) return;

        // Insérer la réponse
        const { error } = await supabase.from("answers").insert({
          session_id: sessionId,
          question_id: question.id,
          transcript: finalTranscript,
          duration_seconds: 120,
          communication_score: 8.5,
          technical_score: 8.7,
          confidence_score: 8.0,
          clarity_score: 8.0,
          structure_score: 7.5,
        });

        if (error) throw error;
        console.log("✅ Réponse sauvegardée !");
      } catch (err) {
        console.error("❌ Erreur d’enregistrement:", err);
      }
    }
  };

  // === END SESSION ===
  const handleEndInterview = async () => {
    if (!sessionId) return;

    try {
      await supabase
        .from("interview_sessions")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          overall_score: 8.4,
          communication_score: 8.5,
          technical_score: 8.7,
          confidence_score: 8.0,
        })
        .eq("id", sessionId);

      setSessionStatus("completed");
      toast({
        title: "Entretien terminé",
        description: "Analyse de vos réponses en cours...",
      });
      setTimeout(() => {
        navigate(`/sessions/${sessionId}`);
      }, 2000);
    } catch (err) {
      console.error(err);
      toast({
        title: "Erreur",
        description: "Erreur lors de la finalisation",
        variant: "destructive",
      });
    }
  };

  // === UI ===
  if (sessionStatus === "completed") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md text-center">
          <CardContent className="py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold mb-2">Analyse en cours...</h2>
            <p className="text-muted-foreground">
              Génération de votre feedback personnalisé
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {sessionStatus === "active" ? "En cours..." : "Retour"}
            </Button>

            <div className="flex items-center space-x-4">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono text-sm">{formatTime(timeElapsed)}</span>
              <Progress value={progress} className="w-32" />
              <Badge variant="outline">
                {currentQuestion + 1} / {questions.length}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
          {/* Zone vidéo */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="h-[700px]">
              <CardContent className="p-0 h-full">
                <div className="video-container h-full flex items-center justify-center relative">
                  {sessionStatus === "setup" ? (
                    <div className="text-center space-y-4">
                      <Video className="h-16 w-16 text-primary mx-auto" />
                      <h3 className="text-xl font-semibold mb-2">Prêt à commencer ?</h3>
                      <p className="text-muted-foreground mb-4">
                        Vérifiez votre caméra et micro avant de démarrer
                      </p>
                      <Button
                        onClick={handleStartSession}
                        size="lg"
                        className="bg-primary hover:bg-primary/90"
                      >
                        <Play className="mr-2 h-5 w-5" />
                        Démarrer l'entretien
                      </Button>
                    </div>
                  ) : (
                    bpUrl && (
                      <iframe
                        src={bpUrl}   // ✅ dynamique
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        allow="camera; microphone; fullscreen"
                        style={{ border: "none", borderRadius: "8px" }}
                      />
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Panneau transcription */}
          <div className="space-y-4">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5" />
                  <span>Transcription</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {transcript || "Commencez à parler pour voir la transcription"}
                <div className="mt-4 space-x-2">
                  <Button onClick={handleToggleRecording}>
                    {isRecording ? "Arrêter" : "Répondre"}
                  </Button>
                  <Button variant="secondary" onClick={handleEndInterview}>
                    Terminer l’entretien
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
