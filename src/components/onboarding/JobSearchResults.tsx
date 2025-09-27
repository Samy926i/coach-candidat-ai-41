import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Building2, ExternalLink } from 'lucide-react';

interface JobOffer {
  title: string;
  company: string;
  url: string;
  description: string;
  location: string;
}

interface JobSearchResultsProps {
  jobs: JobOffer[];
  onSelectJob: (url: string) => void;
  isAnalyzing: boolean;
}

export function JobSearchResults({ jobs, onSelectJob, isAnalyzing }: JobSearchResultsProps) {
  if (jobs.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Offres trouvées</h3>
        <span className="text-sm text-muted-foreground">{jobs.length} résultats</span>
      </div>
      
      <div className="grid gap-4">
        {jobs.map((job, index) => (
          <Card key={index} className="transition-all hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base line-clamp-2">{job.title}</CardTitle>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Building2 className="h-4 w-4" />
                      <span>{job.company}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{job.location}</span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(job.url, '_blank')}
                  className="shrink-0"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <CardDescription className="line-clamp-3 mb-4">
                {job.description}
              </CardDescription>
              
              <Button 
                onClick={() => onSelectJob(job.url)}
                disabled={isAnalyzing}
                className="w-full"
              >
                {isAnalyzing ? 'Analyse en cours...' : 'Analyser cette offre'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}