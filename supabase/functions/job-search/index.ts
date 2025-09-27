import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface JobSearchRequest {
  keywords: string;
  location?: string;
  experienceLevel?: 'internship' | 'junior' | 'mid' | 'senior';
}

interface JobOffer {
  title: string;
  company: string;
  url: string;
  description: string;
  location: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { keywords, location = 'France', experienceLevel = 'junior' }: JobSearchRequest = await req.json();
    
    console.log(`[job-search] Searching for: ${keywords} in ${location} (${experienceLevel})`);

    // Pour le prototype, utiliser des résultats mockés mais réalistes
    // Dans une version production, ici on ferait du scraping de job boards
    const mockJobs: JobOffer[] = [
      {
        title: `${experienceLevel === 'internship' ? 'Stage' : 'Poste'} - ${keywords} - ${company_names[0]}`,
        company: company_names[0],
        url: "https://www.welcometothejungle.com/fr/jobs/123456",
        description: `Rejoignez notre équipe pour un poste de ${keywords}. Vous travaillerez sur des projets innovants avec les dernières technologies. Excellente opportunité d'apprentissage et de développement.`,
        location: location
      },
      {
        title: `${keywords} ${experienceLevel === 'internship' ? '(Stage)' : '- Poste junior'}`,
        company: company_names[1],
        url: "https://www.linkedin.com/jobs/view/3789456123",
        description: `Nous recherchons un(e) ${keywords} motivé(e) pour rejoindre notre équipe dynamique. Formation et accompagnement personnalisé. Environnement de travail collaboratif.`,
        location: location
      },
      {
        title: `Développeur ${keywords} ${experienceLevel === 'internship' ? '- Stage' : 'Junior'}`,
        company: company_names[2],
        url: "https://www.indeed.fr/viewjob?jk=abc123def456",
        description: `Opportunité unique de travailler sur des projets ${keywords} d'envergure. Equipe expérimentée, technologies modernes, possibilité de télétravail partiel.`,
        location: location
      }
    ];

    // Simuler un délai de recherche réaliste
    await new Promise(resolve => setTimeout(resolve, 1500));

    console.log(`[job-search] Found ${mockJobs.length} jobs for ${keywords}`);

    return new Response(JSON.stringify({ 
      success: true,
      jobs: mockJobs 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[job-search] Error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Noms d'entreprises pour les exemples
const company_names = [
  "TechNova Solutions",
  "Digital Innovations Lab",
  "FutureTech Systems",
  "Smart Analytics Corp",
  "NextGen Software",
  "AI Dynamics",
  "CloudFirst Technologies",
  "DataStream Solutions"
];