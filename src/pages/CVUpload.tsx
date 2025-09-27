import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Upload, 
  FileText, 
  Check,
  X,
  User,
  Briefcase,
  GraduationCap,
  Loader2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export default function CVUpload() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedCV, setParsedCV] = useState<any>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && (selectedFile.type === 'application/pdf' || selectedFile.type === 'application/msword' || selectedFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
      setFile(selectedFile);
    } else {
      toast({
        title: "Format invalide",
        description: "Veuillez sélectionner un fichier PDF ou Word",
        variant: "destructive"
      });
    }
  };

  const handleParseCV = async () => {
    if (!file) return;

    setLoading(true);
    try {
      // Simulate CV parsing
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const mockParsedData = {
        personalInfo: {
          name: "Jean Dupont",
          email: "jean.dupont@email.com",
          phone: "06 12 34 56 78",
          location: "Paris, France"
        },
        skills: [
          "React", "TypeScript", "JavaScript", "Node.js", "Python", 
          "MongoDB", "PostgreSQL", "AWS", "Docker", "Git"
        ],
        experience: [
          {
            title: "Développeur Frontend Senior",
            company: "TechCorp",
            period: "2021 - Présent",
            description: "Développement d'applications React complexes, mentorat d'équipe"
          },
          {
            title: "Développeur Full Stack",
            company: "StartupX",
            period: "2019 - 2021",
            description: "Stack MERN, développement d'API REST, déploiement cloud"
          }
        ],
        education: [
          {
            degree: "Master en Informatique",
            school: "École Polytechnique",
            year: "2019"
          },
          {
            degree: "Licence en Informatique",
            school: "Université Paris-Saclay",
            year: "2017"
          }
        ]
      };

      setParsedCV(mockParsedData);
      toast({
        title: "CV analysé avec succès",
        description: "Vos informations ont été extraites et analysées"
      });
    } catch (error) {
      toast({
        title: "Erreur d'analyse",
        description: "Une erreur s'est produite lors de l'analyse du CV",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCV = async () => {
    // Here we would save to Supabase
    toast({
      title: "CV sauvegardé",
      description: "Vos informations CV ont été mises à jour"
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
              <h1 className="text-xl font-semibold">Importer mon CV</h1>
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
                <FileText className="h-5 w-5 text-primary" />
                <span>Analysez votre CV</span>
              </CardTitle>
              <CardDescription>
                Téléchargez votre CV pour personnaliser vos questions d'entretien 
                et recevoir des recommandations basées sur votre profil
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4 text-center">
                <div>
                  <Upload className="h-8 w-8 text-primary mx-auto mb-2" />
                  <h3 className="font-medium">Téléchargez</h3>
                  <p className="text-sm text-muted-foreground">PDF ou Word acceptés</p>
                </div>
                <div>
                  <FileText className="h-8 w-8 text-accent mx-auto mb-2" />
                  <h3 className="font-medium">Analysez</h3>
                  <p className="text-sm text-muted-foreground">Extraction automatique</p>
                </div>
                <div>
                  <Check className="h-8 w-8 text-coaching-score-good mx-auto mb-2" />
                  <h3 className="font-medium">Personnalisez</h3>
                  <p className="text-sm text-muted-foreground">Questions adaptées</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* File Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Télécharger votre CV</CardTitle>
              <CardDescription>
                Formats acceptés: PDF, DOC, DOCX (Max. 10MB)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-center w-full">
                  <label
                    htmlFor="cv-upload"
                    className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-12 h-12 mb-4 text-muted-foreground" />
                      <p className="mb-2 text-sm text-muted-foreground">
                        <span className="font-semibold">Cliquez pour télécharger votre CV</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PDF, DOC, DOCX (MAX. 10MB)
                      </p>
                    </div>
                    <input
                      id="cv-upload"
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileUpload}
                    />
                  </label>
                </div>
                
                {file && (
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-6 w-6 text-primary" />
                      <div>
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={handleParseCV}
                        disabled={loading}
                        className="bg-primary hover:bg-primary/90"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Analyse...
                          </>
                        ) : (
                          <>
                            <Check className="mr-2 h-4 w-4" />
                            Analyser
                          </>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setFile(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Parsed Results */}
          {parsedCV && (
            <div className="space-y-6">
              {/* Personal Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="h-5 w-5 text-primary" />
                    <span>Informations Personnelles</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Nom</label>
                      <p className="text-lg">{parsedCV.personalInfo.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Email</label>
                      <p className="text-lg">{parsedCV.personalInfo.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Téléphone</label>
                      <p className="text-lg">{parsedCV.personalInfo.phone}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Localisation</label>
                      <p className="text-lg">{parsedCV.personalInfo.location}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Skills */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Check className="h-5 w-5 text-accent" />
                    <span>Compétences Identifiées</span>
                  </CardTitle>
                  <CardDescription>
                    {parsedCV.skills.length} compétences extraites de votre CV
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {parsedCV.skills.map((skill: string, index: number) => (
                      <Badge key={index} className="score-good border">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Experience */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Briefcase className="h-5 w-5 text-coaching-score-good" />
                    <span>Expérience Professionnelle</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {parsedCV.experience.map((exp: any, index: number) => (
                      <div key={index} className="border-l-2 border-primary pl-4">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-medium">{exp.title}</h3>
                          <Badge variant="outline">{exp.period}</Badge>
                        </div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">
                          {exp.company}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {exp.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Education */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <GraduationCap className="h-5 w-5 text-coaching-score-average" />
                    <span>Formation</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {parsedCV.education.map((edu: any, index: number) => (
                      <div key={index} className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">{edu.degree}</h3>
                          <p className="text-sm text-muted-foreground">{edu.school}</p>
                        </div>
                        <Badge variant="outline">{edu.year}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Save Button */}
              <div className="flex justify-center">
                <Button
                  onClick={handleSaveCV}
                  size="lg"
                  className="bg-primary hover:bg-primary/90"
                >
                  <Check className="mr-2 h-4 w-4" />
                  Sauvegarder mon Profil
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}