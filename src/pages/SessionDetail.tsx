import { useState } from "react";
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
import { mockSessions } from "@/lib/mock-data";

export default function SessionDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState("overview");

  // Find session by ID (in real app, this would be from API/Supabase)
  const session = mockSessions.find(s => s.id === id) || mockSessions[0];
  const answers = session.answers || [];
  const feedbacks = session.feedbacks || [];
  const questions = session.questions || [];

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const overallFeedback = feedbacks.find(f => f.feedback_type === 'overall');
  const questionFeedbacks = feedbacks.filter(f => f.feedback_type === 'question');

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
                Retour
              </Button>
              <div>
                <h1 className="text-xl font-semibold">{session.title}</h1>
                <p className="text-sm text-muted-foreground">
                  {session.job_context?.company_name} • {formatDate(session.created_at)}
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

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Session Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Résumé de la Session</span>
                  <Badge className={`capitalize ${
                    session.status === 'completed' ? 'score-excellent border' : ''
                  }`}>
                    {session.status === 'completed' ? 'Terminé' : session.status}
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
                      {session.overall_score?.toFixed(1) || '0.0'}/10
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

            {/* Scores */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Scores par Compétence</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ScoreBadge 
                    score={session.communication_score || 0} 
                    label="Communication" 
                    size="lg" 
                  />
                  <ScoreBadge 
                    score={session.technical_score || 0} 
                    label="Technique" 
                    size="lg" 
                  />
                  <ScoreBadge 
                    score={session.confidence_score || 0} 
                    label="Confiance" 
                    size="lg" 
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-accent" />
                    <span>Points Forts</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {overallFeedback?.highlights?.slice(0, 3).map((highlight, index) => (
                      <li key={index} className="flex items-start space-x-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="h-5 w-5 text-coaching-score-average" />
                    <span>À Améliorer</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {overallFeedback?.improvements?.slice(0, 3).map((improvement, index) => (
                      <li key={index} className="flex items-start space-x-2 text-sm">
                        <AlertCircle className="h-4 w-4 text-coaching-score-average mt-0.5 flex-shrink-0" />
                        <span>{improvement}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Questions & Answers Tab */}
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
                        <Badge className={`capitalize ${
                          question.question_type === 'technical' ? 'score-good border' :
                          question.question_type === 'behavioral' ? 'score-average border' :
                          'score-excellent border'
                        }`}>
                          {question.question_type}
                        </Badge>
                        <Badge variant="outline">{question.difficulty}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Question:</h4>
                      <p className="text-muted-foreground">{question.question_text}</p>
                    </div>

                    {answer && (
                      <>
                        <div>
                          <h4 className="font-medium mb-2">Votre réponse:</h4>
                          <div className="bg-muted p-4 rounded-lg">
                            <p className="text-sm leading-relaxed">{answer.transcript}</p>
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
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {answer.communication_score && (
                            <ScoreBadge score={answer.communication_score} label="Communication" size="sm" />
                          )}
                          {answer.technical_score && (
                            <ScoreBadge score={answer.technical_score} label="Technique" size="sm" />
                          )}
                          {answer.confidence_score && (
                            <ScoreBadge score={answer.confidence_score} label="Confiance" size="sm" />
                          )}
                          {answer.clarity_score && (
                            <ScoreBadge score={answer.clarity_score} label="Clarté" size="sm" />
                          )}
                        </div>
                      </>
                    )}

                    {questionFeedback && (
                      <div className="feedback-panel">
                        <h4 className="font-medium mb-2">Feedback:</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          {questionFeedback.detailed_feedback}
                        </p>
                        
                        {questionFeedback.highlights && questionFeedback.highlights.length > 0 && (
                          <div className="mb-3">
                            <h5 className="text-sm font-medium text-accent mb-1">Points forts:</h5>
                            <ul className="text-sm space-y-1">
                              {questionFeedback.highlights.map((highlight, idx) => (
                                <li key={idx} className="flex items-start space-x-2">
                                  <CheckCircle className="h-3 w-3 text-accent mt-0.5 flex-shrink-0" />
                                  <span>{highlight}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {questionFeedback.improvements && questionFeedback.improvements.length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium text-coaching-score-average mb-1">À améliorer:</h5>
                            <ul className="text-sm space-y-1">
                              {questionFeedback.improvements.map((improvement, idx) => (
                                <li key={idx} className="flex items-start space-x-2">
                                  <AlertCircle className="h-3 w-3 text-coaching-score-average mt-0.5 flex-shrink-0" />
                                  <span>{improvement}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* Detailed Feedback Tab */}
          <TabsContent value="feedback" className="space-y-6">
            {overallFeedback && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    <span>Feedback Global</span>
                  </CardTitle>
                  <CardDescription>
                    Analyse complète de votre performance d'entretien
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-3">Résumé:</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {overallFeedback.detailed_feedback}
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-accent" />
                        <span>Points Forts</span>
                      </h3>
                      <ul className="space-y-2">
                        {overallFeedback.highlights?.map((highlight, index) => (
                          <li key={index} className="flex items-start space-x-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                            <span>{highlight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-3 flex items-center space-x-2">
                        <Target className="h-4 w-4 text-coaching-score-average" />
                        <span>Axes d'Amélioration</span>
                      </h3>
                      <ul className="space-y-2">
                        {overallFeedback.improvements?.map((improvement, index) => (
                          <li key={index} className="flex items-start space-x-2 text-sm">
                            <AlertCircle className="h-4 w-4 text-coaching-score-average mt-0.5 flex-shrink-0" />
                            <span>{improvement}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {overallFeedback.action_items && overallFeedback.action_items.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center space-x-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <span>Plan d'Action</span>
                      </h3>
                      <ul className="space-y-2">
                        {overallFeedback.action_items.map((action, index) => (
                          <li key={index} className="flex items-start space-x-2 text-sm">
                            <div className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center mt-0.5 flex-shrink-0">
                              {index + 1}
                            </div>
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Progress Tab */}
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

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Prochaines Étapes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Button 
                      className="w-full justify-start" 
                      variant="outline"
                      onClick={() => navigate('/interview')}
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Nouvel Entretien de Pratique
                    </Button>
                    <Button 
                      className="w-full justify-start" 
                      variant="outline"
                      onClick={() => navigate('/job-context')}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Ajouter un Nouveau Contexte
                    </Button>
                    <Button 
                      className="w-full justify-start" 
                      variant="outline"
                      onClick={() => navigate('/cv')}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Mettre à Jour mon CV
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recommandations</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-start space-x-2">
                      <Target className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                      <span>Pratiquez les questions comportementales avec la méthode STAR</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <Target className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                      <span>Travaillez sur des exemples concrets avec des métriques</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <Target className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                      <span>Répétez vos réponses pour améliorer la fluidité</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}