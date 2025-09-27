import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Video,
  Mic,
  MicOff,
  VideoOff,
  Play,
  Square,
  Clock,
  MessageSquare,
  SkipForward
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

// tu peux garder tes questions mockées pour l’instant
import { mockQuestions } from "@/lib/mock-data";

export default function Interview() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session');

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [sessionStatus, setSessionStatus] = useState<'setup' | 'active' | 'completed'>('setup');
  const [transcript, setTranscript] = useState("");

  const questions = mockQuestions;
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

  // === Actions ===
  const handleStartSession = () => {
    setSessionStatus("active");
    toast({
      title: "Session démarrée",
      description: "L'entretien vidéo a commencé"
    });
  };

  const handleEndInterview = () => {
    setSessionStatus('completed');
    toast({
      title: "Entretien terminé",
      description: "Analyse de vos réponses en cours..."
    });
    setTimeout(() => {
      navigate(`/sessions/${sessionId || 'demo'}`);
    }, 2000);
  };

  const handleToggleRecording = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      setTranscript("Enregistrement en cours...");
    } else {
      setTranscript(`Voici ma réponse à la question "${currentQ?.question_text}". Je pense que la meilleure approche serait de...`);
    }
  };

  // === UI Render ===
  if (sessionStatus === 'completed') {
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
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {sessionStatus === 'active' ? 'En cours...' : 'Retour'}
              </Button>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono text-sm">{formatTime(timeElapsed)}</span>
              </div>
            </div>

            <div className="flex items-center space-x-4">
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
                  {sessionStatus === 'setup' ? (
                    <div className="text-center space-y-4">
                      <Video className="h-16 w-16 text-primary mx-auto" />
                      <div>
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
                    </div>
                  ) : (
                    <iframe
                      src="https://bey.chat/c801e0bb-0162-4133-bbb3-3743f99a34b0" //A modifier
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      allow="camera; microphone; fullscreen"
                      style={{ border: "none", borderRadius: "8px" }}
                    />
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
                {transcript ? transcript : "Commencez à parler pour voir la transcription"}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
