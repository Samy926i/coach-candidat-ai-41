import { useState } from 'react';
import { ResearchForm } from '@/components/research/ResearchForm';
import { ResearchResult } from '@/components/research/ResearchResult';
import type { ResearchResponse } from '@/lib/schemas/job';

export default function Research() {
  const [result, setResult] = useState<ResearchResponse | null>(null);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Lightpanda Research</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Analysez n'importe quelle offre d'emploi en quelques secondes. 
            Obtenez un résumé détaillé, des questions d'entretien personnalisées et des insights sur la culture d'entreprise.
          </p>
        </div>

        <ResearchForm onResult={setResult} />

        {result && <ResearchResult result={result} />}
      </div>
    </div>
  );
}