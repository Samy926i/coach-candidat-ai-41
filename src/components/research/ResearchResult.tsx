import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  MapPin, 
  DollarSign, 
  Users, 
  Brain, 
  CheckCircle, 
  AlertCircle,
  ExternalLink,
  Download,
  Star
} from 'lucide-react';
import type { ResearchResponse } from '@/lib/schemas/job';

interface ResearchResultProps {
  result: ResearchResponse;
}

export function ResearchResult({ result }: ResearchResultProps) {
  const { job, company, interviewPack, sources } = result;

  const downloadResults = () => {
    const dataStr = JSON.stringify(result, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `research-${job.company_name}-${Date.now()}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  };

  const SourcesList = ({ sources: sourceList }: { sources: string[] }) => (
    <div className="mt-4 p-3 bg-muted/30 rounded-lg">
      <h5 className="text-sm font-medium mb-2 flex items-center">
        <ExternalLink className="h-3 w-3 mr-1" />
        Sources
      </h5>
      <div className="space-y-1">
        {sourceList.map((source, idx) => (
          <a
            key={idx}
            href={source}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:text-blue-800 underline block truncate"
          >
            {source}
          </a>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Building2 className="h-5 w-5 text-primary" />
              <span>{job.role_title}</span>
            </CardTitle>
            <Button onClick={downloadResults} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export JSON
            </Button>
          </div>
          <CardDescription className="flex items-center space-x-4">
            <span className="font-medium">{job.company_name}</span>
            {job.location && (
              <>
                <span>•</span>
                <span className="flex items-center">
                  <MapPin className="h-3 w-3 mr-1" />
                  {job.location}
                </span>
              </>
            )}
            {job.salary && (
              <>
                <span>•</span>
                <span className="flex items-center">
                  <DollarSign className="h-3 w-3 mr-1" />
                  {job.salary}
                </span>
              </>
            )}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Main Tabs */}
      <Tabs defaultValue="resume" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="resume">Résumé</TabsTrigger>
          <TabsTrigger value="rh">RH ({interviewPack.rh_questions.length})</TabsTrigger>
          <TabsTrigger value="tech">Tech ({interviewPack.tech_questions.length})</TabsTrigger>
        </TabsList>

        {/* Resume Tab */}
        <TabsContent value="resume" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Must Have */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                  Indispensables
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {job.must_have.map((skill, idx) => (
                    <Badge key={idx} variant="default" className="mr-2 mb-1">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Nice to Have */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Star className="h-4 w-4 mr-2 text-yellow-600" />
                  Souhaités
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {job.nice_to_have.map((skill, idx) => (
                    <Badge key={idx} variant="secondary" className="mr-2 mb-1">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Responsibilities */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Responsabilités</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {job.responsibilities.map((resp, idx) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <span className="text-primary">•</span>
                    <span className="text-sm">{resp}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Culture & Soft Skills */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Users className="h-4 w-4 mr-2 text-blue-600" />
                  Soft Skills
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {job.soft_skills.map((skill, idx) => (
                    <Badge key={idx} variant="outline" className="mr-2 mb-1">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Building2 className="h-4 w-4 mr-2 text-purple-600" />
                  Culture
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {job.culture_signals.map((signal, idx) => (
                    <Badge key={idx} variant="outline" className="mr-2 mb-1">
                      {signal}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <SourcesList sources={sources} />
        </TabsContent>

        {/* RH Tab */}
        <TabsContent value="rh" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2 text-blue-600" />
                Questions Comportementales (Méthode STAR)
              </CardTitle>
              <CardDescription>
                Questions RH avec grilles d'évaluation et signaux d'alerte
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {interviewPack.rh_questions.map((item, idx) => (
                <div key={idx} className="border rounded-lg p-4">
                  <h4 className="font-medium mb-3">{item.q}</h4>
                  
                  <div className="space-y-3">
                    <div>
                      <h5 className="text-sm font-medium mb-2">Critères d'évaluation :</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {item.rubric.criteria.map((criterion, cIdx) => (
                          <div key={cIdx} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                            <span className="text-sm font-medium">{criterion.name}</span>
                            <Badge variant="outline">{Math.round(criterion.weight * 100)}%</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {item.rubric.red_flags.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium mb-2 text-red-600 flex items-center">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Signaux d'alerte :
                        </h5>
                        <ul className="text-sm text-red-600 space-y-1">
                          {item.rubric.red_flags.map((flag, fIdx) => (
                            <li key={fIdx} className="flex items-start space-x-2">
                              <span>•</span>
                              <span>{flag}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <SourcesList sources={sources} />
        </TabsContent>

        {/* Tech Tab */}
        <TabsContent value="tech" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Brain className="h-5 w-5 mr-2 text-green-600" />
                Questions Techniques
              </CardTitle>
              <CardDescription>
                Questions par niveau de difficulté avec exercices pratiques
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Scoring Model */}
              <div className="p-3 bg-muted/30 rounded-lg">
                <h4 className="font-medium mb-2">Modèle de notation :</h4>
                <div className="flex space-x-4">
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-1 text-blue-600" />
                    <span className="text-sm">RH: {Math.round(interviewPack.scoring_model.weights.rh * 100)}%</span>
                  </div>
                  <div className="flex items-center">
                    <Brain className="h-4 w-4 mr-1 text-green-600" />
                    <span className="text-sm">Tech: {Math.round(interviewPack.scoring_model.weights.tech * 100)}%</span>
                  </div>
                </div>
              </div>

              {/* Tech Questions */}
              {interviewPack.tech_questions.map((item, idx) => (
                <div key={idx} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-medium flex-1">{item.q}</h4>
                    <Badge variant={
                      item.level === 1 ? 'secondary' :
                      item.level === 2 ? 'default' : 'destructive'
                    }>
                      Niveau {item.level}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium">Sujets : </span>
                      <div className="inline-flex flex-wrap gap-1">
                        {item.topics.map((topic, tIdx) => (
                          <Badge key={tIdx} variant="outline" className="text-xs">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    {item.answers_hint && (
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">Indice : </span>
                        {item.answers_hint}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Live Tasks */}
              {interviewPack.live_tasks.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Exercices Pratiques :</h4>
                  <div className="space-y-4">
                    {interviewPack.live_tasks.map((task, idx) => (
                      <div key={idx} className="border rounded-lg p-4 bg-blue-50">
                        <h5 className="font-medium mb-2">Exercice {idx + 1}</h5>
                        <p className="text-sm mb-2">{task.prompt}</p>
                        <div className="text-xs text-muted-foreground">
                          <span className="font-medium">Format : </span>{task.input_format}
                          {task.expected_dimensions && (
                            <>
                              <span className="ml-3 font-medium">Durée : </span>{task.expected_dimensions}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <SourcesList sources={sources} />
        </TabsContent>
      </Tabs>
    </div>
  );
}