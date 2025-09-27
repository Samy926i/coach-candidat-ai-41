import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Link, 
  Upload, 
  Check, 
  X, 
  Loader2,
  Building,
  FileText,
  Globe
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { mockLightpandaService } from "@/lib/mock-data";
import { retrieveJobData } from "@/services/jobRetrieverCloud";

export default function JobContext() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [urls, setUrls] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [parsedData, setParsedData] = useState<any>(null);
  const [jobJson, setJobJson] = useState<any>(null);
  const [jobJsonError, setJobJsonError] = useState<string>("");

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
    } else {
      toast({
        title: "Format invalide",
        description: "Veuillez sélectionner un fichier PDF",
        variant: "destructive"
      });
    }
  };

  const handleParseContext = async () => {
    if (!urls.trim() && !pdfFile) {
      toast({
        title: "Informations manquantes",
        description: "Veuillez fournir au moins une URL ou un fichier PDF",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setJobJson(null);
    setJobJsonError("");
    try {
      const urlList = urls.split('\n').map(u => u.trim()).filter(url => url);

      // 1) Appel fonction edge pour récupérer le JSON du job (même session, pas de stockage)
      if (urlList.length > 0) {
        try {
          const jobData = await retrieveJobData(urlList[0]);
          setJobJson(jobData);
        } catch (e: any) {
          setJobJsonError(e?.message || 'Erreur lors de la récupération du JSON du job');
        }
      }

      // 2) Conserver l'ancien mock pour l'UI actuelle (exigences/skills)
      const mockResult = await mockLightpandaService.fetchJobContext({
        urls: urlList,
        pdf: pdfFile || undefined,
      });
      setParsedData(mockResult);
      toast({
        title: "Analyse terminée",
        description: "Le contexte de l'emploi a été analysé avec succès"
      });
    } catch (error) {
      toast({
        title: "Erreur d'analyse",
        description: "Une erreur s'est produite lors de l'analyse",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveContext = async () => {
    if (!jobTitle.trim()) {
      toast({
        title: "Titre manquant",
        description: "Veuillez saisir un titre pour ce contexte",
        variant: "destructive"
      });
      return;
    }

    // Here we would save to Supabase
    toast({
      title: "Contexte sauvegardé",
      description: "Le contexte d'emploi a été ajouté avec succès"
    });
    
    navigate('/dashboard');
  };

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
              <h1 className="text-xl font-semibold">Nouveau Contexte d'Emploi</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-8">
          {/* Introduction */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="h-5 w-5 text-primary" />
                <span>Informations sur le Poste</span>
              </CardTitle>
              <CardDescription>
                Fournissez des informations sur l'offre d'emploi pour personnaliser vos questions d'entretien
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="job-title">Titre du poste *</Label>
                  <Input
                    id="job-title"
                    placeholder="ex: Développeur Frontend Senior"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-name">Nom de l'entreprise</Label>
                  <Input
                    id="company-name"
                    placeholder="ex: TechCorp"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* URL Input */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Link className="h-5 w-5 text-primary" />
                <span>URLs de l'Offre d'Emploi</span>
              </CardTitle>
              <CardDescription>
                Collez les liens vers l'offre d'emploi (LinkedIn, site de l'entreprise, etc.)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="urls">URLs (une par ligne)</Label>
                <Textarea
                  id="urls"
                  placeholder="https://linkedin.com/jobs/12345
https://company.com/careers/frontend-dev"
                  value={urls}
                  onChange={(e) => setUrls(e.target.value)}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* PDF Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Upload className="h-5 w-5 text-primary" />
                <span>Description de Poste (PDF)</span>
              </CardTitle>
              <CardDescription>
                Optionnel : Téléchargez la description de poste au format PDF
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-center w-full">
                  <label
                    htmlFor="pdf-upload"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                      <p className="mb-2 text-sm text-muted-foreground">
                        <span className="font-semibold">Cliquez pour télécharger</span>
                      </p>
                      <p className="text-xs text-muted-foreground">PDF uniquement (MAX. 10MB)</p>
                    </div>
                    <input
                      id="pdf-upload"
                      type="file"
                      className="hidden"
                      accept=".pdf"
                      onChange={handleFileUpload}
                    />
                  </label>
                </div>
                
                {pdfFile && (
                  <div className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{pdfFile.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPdfFile(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Parse Button */}
          <div className="flex justify-center">
            <Button
              onClick={handleParseContext}
              disabled={loading || (!urls.trim() && !pdfFile)}
              size="lg"
              className="bg-primary hover:bg-primary/90"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyse en cours...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Analyser le Contexte
                </>
              )}
            </Button>
          </div>

          {/* Parsed Results */}
          {/* JSON extrait (session uniquement) */}
          {(jobJson || jobJsonError) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-accent" />
                  <span>Données JSON extraites</span>
                </CardTitle>
                <CardDescription>
                  Généré à partir de la première URL. Non stocké, disponible dans cette session.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {jobJsonError ? (
                  <div className="text-sm text-red-600">{jobJsonError}</div>
                ) : (
                  <>
                    <div className="rounded-md bg-muted p-4 overflow-auto max-h-96">
                      <pre className="text-xs whitespace-pre-wrap break-words">{JSON.stringify(jobJson, null, 2)}</pre>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        variant="secondary"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(JSON.stringify(jobJson, null, 2));
                            toast({ title: 'Copié', description: 'JSON copié dans le presse-papiers' });
                          } catch {
                            toast({ title: 'Erreur', description: 'Impossible de copier', variant: 'destructive' });
                          }
                        }}
                      >
                        Copier le JSON
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {parsedData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building className="h-5 w-5 text-accent" />
                  <span>Analyse du Contexte</span>
                </CardTitle>
                <CardDescription>
                  Vérifiez et modifiez les informations extraites si nécessaire
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Requirements */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Exigences du Poste</Label>
                  <div className="flex flex-wrap gap-2">
                    {parsedData.requirements.map((req: string, index: number) => (
                      <Badge key={index} variant="outline">
                        {req}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Skills */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Compétences Requises</Label>
                  <div className="flex flex-wrap gap-2">
                    {parsedData.skills.map((skill: string, index: number) => (
                      <Badge key={index} className="score-good border">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Keywords */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Mots-clés Importants</Label>
                  <div className="flex flex-wrap gap-2">
                    {parsedData.keywords.map((keyword: string, index: number) => (
                      <Badge key={index} variant="secondary">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Company Signals */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Signaux de l'Entreprise</Label>
                  <div className="flex flex-wrap gap-2">
                    {parsedData.companySignals.map((signal: string, index: number) => (
                      <Badge key={index} className="score-average border">
                        {signal}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Save Button */}
                <div className="pt-4 border-t">
                  <Button
                    onClick={handleSaveContext}
                    size="lg"
                    className="w-full bg-primary hover:bg-primary/90"
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Sauvegarder ce Contexte
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
