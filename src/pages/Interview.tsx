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
  Pause,
  Square,
  Clock,
  MessageSquare,
  SkipForward
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { mockQuestions, mockBeyondPresenceService } from "@/lib/mock-data";

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
  const [beyondPresenceSession, setBeyondPresenceSession] = useState<string | null>(null);

  const questions = mockQuestions;
  const currentQ = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (sessionStatus === 'active') {
      interval = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sessionStatus]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartSession = async () => {
    try {
      const result = await mockBeyondPresenceService.startInterview({
        role: "Frontend Developer"
      });
      setBeyondPresenceSession(result.sessionId);
      setSessionStatus('active');
      toast({
        title: "Session démarrée",
        description: "L'entretien vidéo a commencé"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de démarrer la session",
        variant: "destructive"
      });
    }
  };

  const handleToggleRecording = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      // Start recording
      setTranscript("Enregistrement en cours...");
    } else {
      // Stop recording and simulate transcript
      setTranscript(`Voici ma réponse à la question "${currentQ?.question_text}". Je pense que la meilleure approche serait de...`);
    }
  };

  const handleNextQuestion = async () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setTranscript("");
      setIsRecording(false);
      
      // Get next question from Beyond Presence
      try {
        await mockBeyondPresenceService.askNext();
      } catch (error) {
        console.error("Error getting next question:", error);
      }
    } else {
      // End interview
      await handleEndInterview();
    }
  };

  const handleEndInterview = async () => {
    try {
      await mockBeyondPresenceService.endInterview();
      setSessionStatus('completed');
      toast({
        title: "Entretien terminé",
        description: "Analyse de vos réponses en cours..."
      });
      
      // Redirect to results after a delay
      setTimeout(() => {
        navigate(`/sessions/${sessionId || 'demo'}`);
      }, 2000);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la finalisation",
        variant: "destructive"
      });
    }
  };

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
                disabled={sessionStatus === 'active'}
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
          
          {/* Main Video Area */}
          <div className="lg:col-span-2 space-y-4">
            {/* Video Container */}
            <Card className="h-96">
              <CardContent className="p-0 h-full">
                <div className="video-container h-full flex items-center justify-center relative">
                  {sessionStatus === 'setup' ? (
                    <div className="text-center space-y-4">
                      <Video className="h-16 w-16 text-primary mx-auto" />
                      <div>
                        <h3 className="text-xl font-semibold mb-2">Prêt à commencer ?</h3>
                        <p className="text-muted-foreground mb-4">
                          Vérifiez votre caméra et microphone avant de démarrer
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
                    <div className="w-full h-full bg-coaching-video/10 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-32 h-32 bg-primary/20 rounded-full flex items-center justify-center mb-4 mx-auto">
                          <Video className="h-12 w-12 text-primary" />
                        </div>
                        <p className="text-sm text-muted-foreground">Simulation vidéo active</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Recording indicator */}
                  {isRecording && sessionStatus === 'active' && (
                    <div className="absolute top-4 left-4 flex items-center space-x-2 bg-red-500 text-white px-3 py-1 rounded-full text-sm">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      <span>REC</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Current Question */}
            {sessionStatus === 'active' && currentQ && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Question {currentQuestion + 1}</CardTitle>
                    <Badge className={`capitalize ${
                      currentQ.question_type === 'technical' ? 'score-good border' :
                      currentQ.question_type === 'behavioral' ? 'score-average border' :
                      'score-excellent border'
                    }`}>
                      {currentQ.question_type}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-lg leading-relaxed mb-4">
                    {currentQ.question_text}
                  </p>
                  <div className="text-sm text-muted-foreground">
                    Temps recommandé: {Math.floor(currentQ.expected_duration_seconds / 60)} minutes
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Controls */}
            {sessionStatus === 'active' && (
              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center justify-center space-x-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAudioOn(!isAudioOn)}
                    >
                      {isAudioOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4 text-destructive" />}
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsVideoOn(!isVideoOn)}
                    >
                      {isVideoOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4 text-destructive" />}
                    </Button>

                    <Button
                      onClick={handleToggleRecording}
                      size="lg"
                      className={isRecording ? "bg-destructive hover:bg-destructive/90" : "bg-primary hover:bg-primary/90"}
                    >
                      {isRecording ? (
                        <>
                          <Square className="mr-2 h-5 w-5" />
                          Arrêter
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-5 w-5" />
                          Répondre
                        </>
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={handleNextQuestion}
                      disabled={!transcript}
                    >
                      {currentQuestion < questions.length - 1 ? (
                        <>
                          <SkipForward className="mr-2 h-4 w-4" />
                          Suivant
                        </>
                      ) : (
                        <>
                          <Square className="mr-2 h-4 w-4" />
                          Terminer
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Transcript Panel */}
          <div className="space-y-4">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5" />
                  <span>Transcription</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="transcript-panel min-h-[200px]">
                {sessionStatus === 'setup' ? (
                  <div className="text-center text-muted-foreground py-8">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>La transcription apparaîtra ici pendant l'entretien</p>
                  </div>
                ) : transcript ? (
                  <div className="space-y-2">
                    <p className="text-sm leading-relaxed">{transcript}</p>
                    {isRecording && (
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        <span>Enregistrement en cours...</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <p>Commencez à parler pour voir la transcription</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}