import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CVUploadDirect } from '@/components/cv/CVUploadDirect';
import { useAuth } from '@/hooks/useAuth';
import { FileText, Plus, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function CVManagement() {
  const navigate = useNavigate();
  const { userId, isAuthenticated, loading } = useAuth();
  const [showUpload, setShowUpload] = useState(false);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="grid gap-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Card>
          <CardHeader>
            <CardTitle>Authentification requise</CardTitle>
            <CardDescription>
              Veuillez vous connecter pour gérer vos CVs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/auth')}>
              Se connecter
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleUploadComplete = () => {
    setShowUpload(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Retour</span>
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Mes CVs</h1>
                <p className="text-muted-foreground">
                  Gérez vos CVs pour les utiliser avec les agents IA
                </p>
              </div>
            </div>
            {!showUpload && (
              <Button onClick={() => setShowUpload(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un CV
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Upload Section ou CV List */}
          {showUpload ? (
            <Card className="mb-8">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <FileText className="h-5 w-5 mr-2 text-primary" />
                      Nouveau CV
                    </CardTitle>
                    <CardDescription>
                      Uploadez un nouveau CV au format PDF
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowUpload(false)}
                  >
                    Annuler
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <CVUploadDirect 
                  userId={userId}
                  onUploadComplete={handleUploadComplete}
                />
              </CardContent>
            </Card>
          ) : (
            <CVUploadDirect 
              userId={userId}
              onUploadComplete={() => {}} // Pas besoin de callback ici car on affiche déjà la liste
            />
          )}

          {/* Help Card */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-lg">Comment ça marche ?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <div>
                  <p className="font-medium">Upload vos CVs</p>
                  <p className="text-sm text-muted-foreground">
                    Importez vos CVs au format PDF directement dans votre espace sécurisé
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <div>
                  <p className="font-medium">Aperçu et gestion</p>
                  <p className="text-sm text-muted-foreground">
                    Visualisez vos CVs avec l'aperçu intégré et gérez votre collection
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <div>
                  <p className="font-medium">Utilisation avec l'IA</p>
                  <p className="text-sm text-muted-foreground">
                    Les agents IA peuvent maintenant utiliser vos CVs pour des analyses, optimisations et recommandations personnalisées
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}