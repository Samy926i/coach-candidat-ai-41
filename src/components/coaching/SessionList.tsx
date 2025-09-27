import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InterviewSession } from "@/types/coaching";
import { Calendar, Clock, Play, FileText, ArrowRight } from "lucide-react";
import { ScoreBadge } from "./ScoreBadge";
import { useNavigate } from "react-router-dom";

interface SessionListProps {
  sessions: InterviewSession[];
  limit?: number;
  showActions?: boolean;
}

export function SessionList({ sessions, limit, showActions = true }: SessionListProps) {
  const navigate = useNavigate();
  const displaySessions = limit ? sessions.slice(0, limit) : sessions;

  const getStatusColor = (status: InterviewSession['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-success/10 text-success hover:bg-success/20';
      case 'in_progress':
        return 'bg-primary/10 text-primary hover:bg-primary/20';
      case 'planned':
        return 'bg-muted-foreground/10 text-muted-foreground hover:bg-muted-foreground/20';
      case 'cancelled':
        return 'bg-destructive/10 text-destructive hover:bg-destructive/20';
      default:
        return '';
    }
  };

  const getStatusText = (status: InterviewSession['status']) => {
    switch (status) {
      case 'completed':
        return 'Terminé';
      case 'in_progress':
        return 'En cours';
      case 'planned':
        return 'Planifié';
      case 'cancelled':
        return 'Annulé';
      default:
        return status;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-4">
      {displaySessions.map((session) => (
        <Card key={session.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg font-semibold">{session.title}</CardTitle>
                {session.job_context && (
                  <p className="text-sm text-muted-foreground">
                    {session.job_context.company_name} • {session.job_context.title}
                  </p>
                )}
              </div>
              <Badge className={getStatusColor(session.status)}>
                {getStatusText(session.status)}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="flex items-center justify-between">
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
                  <span className="capitalize">{session.session_type}</span>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {session.overall_score && (
                  <ScoreBadge 
                    score={session.overall_score} 
                    label="Score" 
                    size="sm" 
                  />
                )}
                
                {showActions && (
                  <div className="flex space-x-2">
                    {session.status === 'planned' && (
                      <Button
                        size="sm"
                        onClick={() => navigate(`/interview?session=${session.id}`)}
                        className="bg-primary hover:bg-primary/90"
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Démarrer
                      </Button>
                    )}
                    
                    {session.status === 'completed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/sessions/${session.id}`)}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Voir résultats
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {session.status === 'completed' && session.overall_score && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex space-x-4">
                  <ScoreBadge score={session.communication_score || 0} label="Communication" size="sm" />
                  <ScoreBadge score={session.technical_score || 0} label="Technique" size="sm" />
                  <ScoreBadge score={session.confidence_score || 0} label="Confiance" size="sm" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
      
      {displaySessions.length === 0 && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune session d'entretien trouvée</p>
              <p className="text-sm mt-1">Créez votre première simulation d'entretien</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}