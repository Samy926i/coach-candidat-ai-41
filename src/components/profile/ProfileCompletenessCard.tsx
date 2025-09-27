import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Linkedin, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  TrendingUp
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProfileAggregation } from '@/hooks/useProfileAggregation';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface ProfileCompletenessCardProps {
  user: SupabaseUser | null;
}

export function ProfileCompletenessCard({ user }: ProfileCompletenessCardProps) {
  const navigate = useNavigate();
  const { aggregatedProfile, loading } = useProfileAggregation(user);

  if (loading || !aggregatedProfile) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  const { completeness } = aggregatedProfile;
  const overallScore = Math.round(completeness.overall);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return CheckCircle;
    if (score >= 60) return AlertCircle;
    return AlertCircle;
  };

  const ScoreIcon = getScoreIcon(overallScore);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <span>Complétude du Profil</span>
          <Badge variant={overallScore >= 80 ? 'default' : 'secondary'}>
            {overallScore}%
          </Badge>
        </CardTitle>
        <CardDescription>
          Enrichissez votre profil pour des questions plus personnalisées
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Overall Score */}
        <div className="flex items-center space-x-3">
          <ScoreIcon className={`h-6 w-6 ${getScoreColor(overallScore)}`} />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">Score Global</span>
              <span className={`text-sm font-bold ${getScoreColor(overallScore)}`}>
                {overallScore}%
              </span>
            </div>
            <Progress value={overallScore} className="h-2" />
          </div>
        </div>

        {/* Individual Scores */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Profil de base</span>
            </div>
            <div className="flex items-center space-x-2">
              <Progress value={completeness.profile} className="w-16 h-2" />
              <span className="text-xs text-muted-foreground w-8">
                {Math.round(completeness.profile)}%
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Linkedin className="h-4 w-4 text-[#0A66C2]" />
              <span className="text-sm">LinkedIn</span>
            </div>
            <div className="flex items-center space-x-2">
              <Progress value={completeness.linkedin} className="w-16 h-2" />
              <span className="text-xs text-muted-foreground w-8">
                {Math.round(completeness.linkedin)}%
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">CV importé</span>
            </div>
            <div className="flex items-center space-x-2">
              <Progress value={completeness.cv} className="w-16 h-2" />
              <span className="text-xs text-muted-foreground w-8">
                {Math.round(completeness.cv)}%
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 space-y-2">
          {completeness.profile < 100 && (
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start"
              onClick={() => navigate('/settings')}
            >
              <User className="h-4 w-4 mr-2" />
              Compléter le profil
            </Button>
          )}
          
          {completeness.linkedin === 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start"
              onClick={() => navigate('/settings?tab=linkedin')}
            >
              <Linkedin className="h-4 w-4 mr-2" />
              Connecter LinkedIn
            </Button>
          )}
          
          {completeness.cv === 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start"
              onClick={() => navigate('/onboarding/1')}
            >
              <FileText className="h-4 w-4 mr-2" />
              Importer un CV
            </Button>
          )}
        </div>

        {/* Summary */}
        {overallScore >= 80 && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800 dark:text-green-200">
                Profil complet !
              </span>
            </div>
            <p className="text-xs text-green-700 dark:text-green-300 mt-1">
              Votre profil est suffisamment détaillé pour générer des questions personnalisées.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}