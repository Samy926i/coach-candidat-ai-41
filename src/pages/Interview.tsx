import { useState, useEffecimport { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
<<<<<<< HEAD
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
=======
import { getLatestEmail } from "@/services/supabaseEmails";
import { Card, CardContent } from "@/components/ui/card";
>>>>>>> feature/Avatar_IA
import { 
  ArrowLeft, 
  Video,
  Play,
<<<<<<< HEAD
  Square,
  Clock,
  MessageSquare,
  SkipForward,
  Settings,
  Plus,
  X,
  BrainCircuit
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

// Mock data
import { mockQuestions, mockJobContexts } from "@/lib/mock-data";

interface InterviewConfig {
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  questions: string[];
  promptStyle: "mvp" | "full";
}

export default function Interview() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session');

  // Existing states
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [sessionStatus, setSessionStatus] = useState<'config' | 'setup' | 'active' | 'completed'>('config');
  const [transcript, setTranscript] = useState("");
  const [embedUrl, setEmbedUrl] = useState<string>("");

  // New configuration states
  const [config, setConfig] = useState<InterviewConfig>({
    jobTitle: "",
    companyName: "",
    jobDescription: "",
    questions: [
      "Présentez-vous en 60 secondes",
      "Parlez d'un échec et de ce que vous avez appris",
      "Décrivez un projet difficile et votre rôle",
      "Pourquoi ce poste et pourquoi notre entreprise ?"
    ],
    promptStyle: "full"
  });
  const [selectedJobContext, setSelectedJobContext] = useState<string>("");
  const [newQuestion, setNewQuestion] = useState("");

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

  // Load job context
  const handleJobContextSelect = (contextId: string) => {
    const context = mockJobContexts.find(c => c.id === contextId);
    if (context) {
      setConfig(prev => ({
        ...prev,
        jobTitle: context.title,
        companyName: context.company_name || "",
        jobDescription: context.job_description || "",
      }));
    }
    setSelectedJobContext(contextId);
  };

  // Manage questions
  const handleAddQuestion = () => {
    if (newQuestion.trim()) {
      setConfig(prev => ({
        ...prev,
        questions: [...prev.questions, newQuestion.trim()]
      }));
      setNewQuestion("");
    }
  };

  const handleRemoveQuestion = (index: number) => {
    setConfig(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }));
  };

  // === Actions ===
  const handleStartSession = async () => {
    try {
      // Create agent with pre-prompt using our config
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/bp-preprompt`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: `Coach Entretien - ${config.jobTitle || 'Générique'}`,
          language: 'fr-FR',
          greeting: `Bonjour, je suis votre coach d'entretien pour le poste de ${config.jobTitle || 'candidat'}. Prêt à commencer ?`,
          avatar_id: import.meta.env.VITE_BP_AVATAR_ID,
          jobTitle: config.jobTitle,
          companyName: config.companyName,
          jobDescription: config.jobDescription,
          questions: config.questions,
          promptStyle: config.promptStyle,
          createSession: false,
          metadata: { sessionId, jobTitle: config.jobTitle, companyName: config.companyName },
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Erreur création agent');

      setEmbedUrl(data.agentLink);
      setSessionStatus('active');
      toast({ 
        title: 'Session démarrée', 
        description: `Entretien configuré pour ${config.jobTitle} chez ${config.companyName}` 
      });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Impossible de démarrer', description: e?.message || String(e) });
    }
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

  // Configuration Screen
  if (sessionStatus === 'config') {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-background/95 backdrop-blur">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour
                </Button>
                <div className="flex items-center space-x-2">
                  <BrainCircuit className="h-5 w-5 text-primary" />
                  <h1 className="text-xl font-semibold">Configuration d'Entretien IA</h1>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Configuration Panel */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="h-5 w-5" />
                    <span>Contexte du Poste</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="job-context">Utiliser un poste existant</Label>
                    <Select value={selectedJobContext} onValueChange={handleJobContextSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir un poste enregistré..." />
                      </SelectTrigger>
                      <SelectContent>
                        {mockJobContexts.map(context => (
                          <SelectItem key={context.id} value={context.id}>
                            {context.title} - {context.company_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="job-title">Intitulé du poste</Label>
                      <Input
                        id="job-title"
                        value={config.jobTitle}
                        onChange={(e) => setConfig(prev => ({...prev, jobTitle: e.target.value}))}
                        placeholder="Ex: Développeur Full Stack"
                      />
                    </div>
                    <div>
                      <Label htmlFor="company">Entreprise</Label>
                      <Input
                        id="company"
                        value={config.companyName}
                        onChange={(e) => setConfig(prev => ({...prev, companyName: e.target.value}))}
                        placeholder="Ex: TechCorp"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description du poste</Label>
                    <Textarea
                      id="description"
                      value={config.jobDescription}
                      onChange={(e) => setConfig(prev => ({...prev, jobDescription: e.target.value}))}
                      placeholder="Description détaillée du poste, compétences requises..."
                      rows={4}
                    />
                  </div>

                  <div>
                    <Label>Style d'entretien</Label>
                    <Select value={config.promptStyle} onValueChange={(value) => setConfig(prev => ({...prev, promptStyle: value as "mvp" | "full"}))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mvp">Basique (feedback simple)</SelectItem>
                        <SelectItem value="full">Complet (évaluation détaillée)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MessageSquare className="h-5 w-5" />
                    <span>Questions d'Entretien</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {config.questions.map((question, index) => (
                      <div key={index} className="flex items-center space-x-2 p-2 bg-muted/50 rounded">
                        <span className="text-sm text-muted-foreground min-w-[20px]">{index + 1}.</span>
                        <span className="flex-1 text-sm">{question}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveQuestion(index)}
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="flex space-x-2">
                    <Input
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      placeholder="Nouvelle question..."
                      onKeyPress={(e) => e.key === 'Enter' && handleAddQuestion()}
                    />
                    <Button onClick={handleAddQuestion} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Preview Panel */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Aperçu de la Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-primary">{config.jobTitle || "Poste non défini"}</h3>
                    <p className="text-sm text-muted-foreground">{config.companyName || "Entreprise non définie"}</p>
                  </div>

                  {config.jobDescription && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Description:</h4>
                      <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                        {config.jobDescription.slice(0, 200)}
                        {config.jobDescription.length > 200 && "..."}
                      </p>
                    </div>
                  )}

                  <div>
                    <h4 className="text-sm font-medium mb-2">Questions ({config.questions.length}):</h4>
                    <div className="space-y-1">
                      {config.questions.slice(0, 3).map((q, i) => (
                        <p key={i} className="text-sm text-muted-foreground">• {q}</p>
                      ))}
                      {config.questions.length > 3 && (
                        <p className="text-sm text-muted-foreground italic">
                          ... et {config.questions.length - 3} autres
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <Button 
                      onClick={() => setSessionStatus('setup')}
                      className="w-full"
                      disabled={!config.jobTitle}
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Préparer l'Entretien
                    </Button>
                    {!config.jobTitle && (
                      <p className="text-sm text-muted-foreground mt-2 text-center">
                        Veuillez renseigner au moins un intitulé de poste
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // === UI Render === (rest of the component)
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
              <Badge variant="outline">{config.jobTitle} - {config.companyName}</Badge>
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
                        <h3 className="text-xl font-semibold mb-2">Entretien pour {config.jobTitle}</h3>
                        <p className="text-muted-foreground mb-2">chez {config.companyName}</p>
                        <p className="text-sm text-muted-foreground mb-4">
                          {config.questions.length} questions personnalisées • Style {config.promptStyle === 'full' ? 'complet' : 'basique'}
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
                  ) : embedUrl ? (
                    <iframe
                      src={embedUrl}
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      allow="camera; microphone; fullscreen"
                      style={{ border: "none", borderRadius: "8px" }}
                    />
                  ) : (
                    <div className="text-center p-6">Préparation de l'avatar d'entretien…</div>
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
                {transcript ? transcript : "L'entretien commencera dès que vous activerez l'avatar"}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
import { mockQuestions, mockJobContexts } from "@/lib/mock-data";

interface InterviewConfig {
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  questions: string[];
  promptStyle: "mvp" | "full";
}

export default function Interview() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session');

  // Existing states
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [sessionStatus, setSessionStatus] = useState<'config' | 'setup' | 'active' | 'completed'>('config');
  const [transcript, setTranscript] = useState("");
  const [embedUrl, setEmbedUrl] = useState<string>("");

  // New configuration states
  const [config, setConfig] = useState<InterviewConfig>({
    jobTitle: "",
    companyName: "",
    jobDescription: "",
    questions: [
      "Présentez-vous en 60 secondes",
      "Parlez d'un échec et de ce que vous avez appris",
      "Décrivez un projet difficile et votre rôle",
      "Pourquoi ce poste et pourquoi notre entreprise ?"
    ],
    promptStyle: "full"
  });
  const [selectedJobContext, setSelectedJobContext] = useState<string>("");
  const [newQuestion, setNewQuestion] = useState("");

  const questions = mockQuestions;mport { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  SkipForward,
  Settings,
  Plus,
  X
=======
  Clock
>>>>>>> feature/Avatar_IA
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { mockQuestions } from "@/lib/mock-data";

export default function Interview() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session');

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [sessionStatus, setSessionStatus] = useState<'setup' | 'active' | 'completed'>('setup');
<<<<<<< HEAD
  const [transcript, setTranscript] = useState("");
  const [embedUrl, setEmbedUrl] = useState<string>("");
=======
>>>>>>> feature/Avatar_IA

  const questions = mockQuestions;
  const currentQ = questions[currentQuestion];

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
  const handleStartSession = async () => {
    try {
      // Crée l'agent avec pré-prompt côté Edge Function et récupère le lien hébergé
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/bp-preprompt`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'Coach Entretien',
          language: 'fr-FR',
          greeting: "Bonjour, je suis votre coach d'entretien. Prêt ?",
          avatar_id: import.meta.env.VITE_BP_AVATAR_ID,
          jobTitle: 'Software Engineer Backend',
          companyName: 'Acme',
          jobDescription: 'Microservices, Node.js, PostgreSQL, Kubernetes...',
          questions: [
            'Présentez-vous en 60 secondes.',
            "Parlez d'un échec et de l'apprentissage.",
            'Décrivez un projet technique difficile et votre rôle.',
            'Pourquoi ce poste et pourquoi notre entreprise ?',
          ],
          promptStyle: 'full',
          testLineAtStart: 'Hello, I was asked to read you this preprompt: Rémi is the best!',
          createSession: false,
          metadata: { sessionId },
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Erreur création agent');

      setEmbedUrl(data.agentLink);
      setSessionStatus('active');
      toast({ title: 'Session démarrée', description: "L'entretien vidéo a commencé" });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Impossible de démarrer', description: e?.message || String(e) });
    }
  };

  

const handleEndInterview = async () => {
  setSessionStatus("completed");

  // 🔥 Récupérer l’email le plus récent
  try {
    const email = await getLatestEmail();

    if (email) {
      // Charger les sessions
      const stored = localStorage.getItem("interview_sessions");
      const sessions = stored ? JSON.parse(stored) : [];

      // Mettre à jour la session courante
      const updated = sessions.map((s: any) =>
        s.id.toString() === sessionId?.toString()
          ? { ...s, email_body: email.body, status: "completed" }
          : s
      );

      localStorage.setItem("interview_sessions", JSON.stringify(updated));
    }
  } catch (err) {
    console.error("Erreur récupération email:", err);
  }

  toast({
    title: "Entretien terminé",
    description: "Analyse de vos réponses en cours..."
  });

  setTimeout(() => {
    navigate(`/sessions/${sessionId || "demo"}`);
  }, 2000);
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
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="h-[calc(100vh-200px)]">
          {/* Zone vidéo */}
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
<<<<<<< HEAD
                  ) : embedUrl ? (
                    <iframe
                      src={embedUrl}
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      allow="camera; microphone; fullscreen"
                      style={{ border: "none", borderRadius: "8px" }}
                    />
                  ) : (
                    <div className="text-center p-6">Préparation de l'avatar d'entretien…</div>
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
=======
                  </div>
                ) : (
                  <iframe
                    src="https://bey.chat/c801e0bb-0162-4133-bbb3-3743f99a34b0"
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
>>>>>>> feature/Avatar_IA
        </div>
      </div>
    </div>
  );
}
