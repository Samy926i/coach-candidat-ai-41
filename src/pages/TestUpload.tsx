import { CVUploadDirect } from '@/components/cv/CVUploadDirect';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function TestUpload() {
  const { userId, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return <div>Chargement...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Card>
          <CardHeader>
            <CardTitle>Authentification requise</CardTitle>
            <CardDescription>
              Veuillez vous connecter pour tester l'upload de CV
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

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Test Upload CV</h1>
        <p className="text-gray-600">Page de test pour le nouveau système d'upload direct</p>
      </div>
      
      <CVUploadDirect 
        userId={userId}
        onUploadComplete={(cv) => {
          console.log('CV uploadé:', cv);
        }}
      />
    </div>
  );
}
