import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Upload, 
  Link, 
  FileText, 
  Brain, 
  Target, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Download
} from 'lucide-react';
import type { AnalysisResult, CVEntity } from '@/types/analysis';

export function CVUploadAnalyzer() {
  const { toast } = useToast();
  const [cvContent, setCvContent] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [currentStep, setCurrentStep] = useState<string>('');

  const handleFileUpload = () => {
    toast({
      title: "Import de CV",
      description: "Copiez-collez le contenu de votre CV dans le champ ci-dessus"
    });
  };

  const runCompleteAnalysis = async () => {
    if (!cvContent.trim() || !jobUrl.trim()) {
      toast({
        title: "Données manquantes",
        description: "Veuillez fournir le CV et l'URL de l'offre d'emploi",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      // Step 1: Use CV content directly (assuming it's already text)
      setCurrentStep('Préparation du CV...');
      const cv_analysis: CVEntity = {
        skills: [], // Will be extracted from text
        experiences: [],
        education: [],
        certifications: [],
        languages: []
      };

      // Step 2: Fetch and parse job description
      setCurrentStep('Récupération de l\'offre d\'emploi...');
      const jdResponse = await supabase.functions.invoke('jd-fetcher', {
        body: { jobUrl }
      });

      if (jdResponse.error) {
        throw new Error('Erreur lors de la récupération de l\'offre');
      }

      const { jd_requirements } = jdResponse.data;

      // Step 3: Skill gap analysis
      setCurrentStep('Analyse des compétences...');
      const skillResponse = await supabase.functions.invoke('skill-analyzer', {
        body: { 
          cvAnalysis: cv_analysis, 
          jdRequirements: jd_requirements 
        }
      });

      if (skillResponse.error) {
        throw new Error('Erreur lors de l\'analyse des compétences');
      }

      const gapAnalysis = skillResponse.data;

      // Step 4: Generate interview questions
      setCurrentStep('Génération des questions...');
      const questionResponse = await supabase.functions.invoke('question-generator', {
        body: { 
          cvAnalysis: cv_analysis,
          jdRequirements: jd_requirements,
          gapAnalysis: gapAnalysis
        }
      });

      if (questionResponse.error) {
        throw new Error('Erreur lors de la génération des questions');
      }

      const { interview_questions } = questionResponse.data;

      // Compile final result
      const result: AnalysisResult = {
        cv_analysis,
        jd_requirements,
        skill_mapping: [
          ...gapAnalysis.strengths,
          ...gapAnalysis.gaps,
          ...gapAnalysis.partial_matches
        ],
        gap_analysis: gapAnalysis,
        interview_questions,
        generated_at: new Date().toISOString(),
        confidence_score: gapAnalysis.overall_match_percentage || 0
      };

      setAnalysisResult(result);
      
      toast({
        title: "Analyse terminée",
        description: `${interview_questions.length} questions générées avec ${result.confidence_score}% de correspondance`
      });

    } catch (error: any) {
      console.error('Analysis error:', error);
      toast({
        title: "Erreur d'analyse",
        description: error.message || "Une erreur s'est produite lors de l'analyse",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
      setCurrentStep('');
    }
  };

  const downloadResults = () => {
    if (!analysisResult) return;

    const dataStr = JSON.stringify(analysisResult, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `cv-analysis-${Date.now()}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-primary" />
            <span>Analyseur CV & Offre d'Emploi</span>
          </CardTitle>
          <CardDescription>
            Analysez votre CV face à une offre d'emploi et générez des questions d'entretien personnalisées
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* CV Content */}
          <div className="space-y-2">
            <Label htmlFor="cv-content">Contenu du CV</Label>
            <div className="flex items-center space-x-2 mb-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleFileUpload}
              >
                <Upload className="h-4 w-4 mr-2" />
                Importer un CV
              </Button>
              <span className="text-sm text-muted-foreground">
                ou collez le contenu ci-dessous
              </span>
            </div>
            <Textarea
              id="cv-content"
              placeholder="Collez le contenu de votre CV ici, ou utilisez le bouton 'Importer un CV' pour charger un fichier..."
              value={cvContent}
              onChange={(e) => {
                let content = e.target.value;
                // Apply Unicode normalization for pasted content
                if (content && typeof content.normalize === 'function') {
                  content = content.normalize('NFC');
                }
                setCvContent(content);
              }}
              rows={6}
              className="mt-2"
            />
          </div>

          {/* Job URL */}
          <div className="space-y-2">
            <Label htmlFor="job-url">URL de l'Offre d'Emploi</Label>
            <div className="flex items-center space-x-2">
              <Link className="h-4 w-4 text-muted-foreground" />
              <Input
                id="job-url"
                type="url"
                placeholder="https://www.linkedin.com/jobs/view/..."
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>

          {/* Action Button */}
          <Button
            onClick={runCompleteAnalysis}
            disabled={isAnalyzing || !cvContent.trim() || !jobUrl.trim()}
            className="w-full"
            size="lg"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {currentStep || 'Analyse en cours...'}
              </>
            ) : (
              <>
                <Target className="h-4 w-4 mr-2" />
                Lancer l'Analyse Complète
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results Section */}
      {analysisResult && (
        <div className="space-y-6">
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Résultats de l'Analyse</span>
                </CardTitle>
                <Button onClick={downloadResults} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger JSON
                </Button>
              </div>
              <CardDescription>
                Correspondance globale : {analysisResult.confidence_score}% | 
                {analysisResult.interview_questions.length} questions générées
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {analysisResult.gap_analysis.strengths.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Forces</div>
                </div>
                
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {analysisResult.gap_analysis.partial_matches.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Partielles</div>
                </div>
                
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {analysisResult.gap_analysis.gaps.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Lacunes</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Job Requirements */}
          <Card>
            <CardHeader>
              <CardTitle>Exigences du Poste</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">{analysisResult.jd_requirements.title}</h4>
                  <p className="text-sm text-muted-foreground">{analysisResult.jd_requirements.company}</p>
                </div>
                
                <div>
                  <h5 className="font-medium mb-2">Compétences Requises</h5>
                  <div className="flex flex-wrap gap-2">
                    {analysisResult.jd_requirements.skills_required.map((skill, idx) => (
                      <Badge key={idx} variant="secondary">{skill}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gap Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Analyse des Écarts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Strengths */}
              <div>
                <h5 className="font-medium mb-2 text-green-600">✓ Forces</h5>
                <div className="space-y-2">
                  {analysisResult.gap_analysis.strengths.map((strength, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-green-50 rounded">
                      <span className="font-medium">{strength.skill}</span>
                      <Badge variant={strength.importance === 'critical' ? 'destructive' : 'secondary'}>
                        {strength.importance}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gaps */}
              {analysisResult.gap_analysis.gaps.length > 0 && (
                <div>
                  <h5 className="font-medium mb-2 text-red-600">⚠ Lacunes</h5>
                  <div className="space-y-2">
                    {analysisResult.gap_analysis.gaps.map((gap, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-red-50 rounded">
                        <span className="font-medium">{gap.skill}</span>
                        <Badge variant={gap.importance === 'critical' ? 'destructive' : 'secondary'}>
                          {gap.importance}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              <div>
                <h5 className="font-medium mb-2">Recommandations</h5>
                <ul className="space-y-1">
                  {analysisResult.gap_analysis.recommendations.map((rec, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground flex items-start space-x-2">
                      <AlertCircle className="h-4 w-4 mt-0.5 text-blue-500" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Interview Questions */}
          <Card>
            <CardHeader>
              <CardTitle>Questions d'Entretien Générées</CardTitle>
              <CardDescription>
                {analysisResult.interview_questions.length} questions personnalisées basées sur l'analyse
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analysisResult.interview_questions.map((question, idx) => (
                  <div key={idx} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant={
                        question.type === 'technical' ? 'default' :
                        question.type === 'behavioral' ? 'secondary' : 'outline'
                      }>
                        {question.type}
                      </Badge>
                      <Badge variant="outline">{question.difficulty}</Badge>
                    </div>
                    
                    <h6 className="font-medium mb-2">{question.question}</h6>
                    <p className="text-sm text-muted-foreground mb-2">
                      Focus: {question.skill_focus}
                    </p>
                    
                    <Separator className="my-2" />
                    
                    <div>
                      <p className="text-sm font-medium mb-1">Points clés attendus:</p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {question.expected_answer_points.map((point, pointIdx) => (
                          <li key={pointIdx} className="flex items-start space-x-2">
                            <span>•</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}