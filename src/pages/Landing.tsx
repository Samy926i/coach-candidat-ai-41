import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Video, BarChart3, TrendingUp, ArrowRight, Play, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Landing() {
  const navigate = useNavigate();

  const features = [
    {
      icon: Video,
      title: "Simuler",
      description: "Entretiens vidéo réalistes avec IA pour pratiquer dans des conditions réelles",
      color: "text-primary"
    },
    {
      icon: BarChart3,
      title: "Analyser", 
      description: "Feedback détaillé et scores précis basés sur vos performances réelles",
      color: "text-accent"
    },
    {
      icon: TrendingUp,
      title: "Progresser",
      description: "Suivi de vos améliorations et recommandations personnalisées",
      color: "text-coaching-score-good"
    }
  ];

  const benefits = [
    "Simulations d'entretiens vidéo personnalisées",
    "Analyse IA de votre communication et confiance",
    "Feedback actionnable et evidence-based",
    "Suivi de progression avec métriques détaillées",
    "Préparation basée sur de vraies offres d'emploi"
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Video className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">Coach Candidat IA</span>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/auth')}
              >
                Connexion
              </Button>
              <Button 
                onClick={() => navigate('/auth')}
                className="bg-primary hover:bg-primary/90"
              >
                Commencer
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
                Maîtrisez vos
                <span className="block text-primary">entretiens vidéo</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Pratiquez avec notre IA, recevez des feedbacks précis et progressez rapidement 
                pour décrocher le poste de vos rêves.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={() => navigate('/auth')}
                className="bg-primary hover:bg-primary/90 text-lg px-8 py-3"
              >
                <Play className="mr-2 h-5 w-5" />
                Essayer la démo
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="text-lg px-8 py-3"
                onClick={() => navigate('/cv-import')}
              >
                Importer mon CV
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Votre coach IA personnel
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Une approche complète pour transformer vos entretiens en succès
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-all duration-300 coaching-fade-in">
                <CardHeader>
                  <div className="mx-auto mb-4 p-3 bg-background rounded-full w-fit">
                    <feature.icon className={`h-8 w-8 ${feature.color}`} />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold">
                Pourquoi choisir Coach Candidat IA ?
              </h2>
              <p className="text-lg text-muted-foreground">
                Notre plateforme combine intelligence artificielle avancée et expertise 
                en recrutement pour vous offrir une préparation sur mesure.
              </p>
              <ul className="space-y-4">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <CheckCircle className="h-6 w-6 text-accent flex-shrink-0 mt-0.5" />
                    <span className="text-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
              <Button 
                size="lg" 
                onClick={() => navigate('/auth')}
                className="bg-primary hover:bg-primary/90"
              >
                Commencer maintenant
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
            
            <div className="relative">
              <Card className="p-8 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
                <div className="space-y-6">
                  <div className="text-center">
                    <Video className="h-16 w-16 text-primary mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Simulation en temps réel</h3>
                    <p className="text-sm text-muted-foreground">
                      Interface vidéo professionnelle avec questions personnalisées
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-accent">8.4/10</div>
                      <div className="text-xs text-muted-foreground">Score moyen</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-coaching-score-good">+24%</div>
                      <div className="text-xs text-muted-foreground">Amélioration</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-primary">45min</div>
                      <div className="text-xs text-muted-foreground">Session type</div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-primary/5">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Prêt à transformer vos entretiens ?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Rejoignez des milliers de candidats qui ont déjà amélioré leurs performances 
            grâce à Coach Candidat IA.
          </p>
          <Button 
            size="lg" 
            onClick={() => navigate('/auth')}
            className="bg-primary hover:bg-primary/90 text-lg px-12 py-4"
          >
            <Play className="mr-2 h-6 w-6" />
            Démarrer ma préparation
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t bg-muted/20">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Video className="h-6 w-6 text-primary" />
              <span className="font-semibold">Coach Candidat IA</span>
            </div>
            <div className="text-sm text-muted-foreground">
              © 2024 Coach Candidat IA. Tous droits réservés.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}