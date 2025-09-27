import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Search, 
  FileText, 
  Loader2, 
  Clock,
  User,
  Brain
} from 'lucide-react';

interface SearchResult {
  id: string;
  filename: string;
  raw_text: string;
  structured_data: any;
  processing_method: string;
  confidence_score: number;
  file_format: string;
  created_at: string;
  similarity?: number;
}

export function CVSearch() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchType, setSearchType] = useState<'semantic' | 'text'>('semantic');

  const performSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Requête vide",
        description: "Veuillez saisir une requête de recherche",
        variant: "destructive"
      });
      return;
    }

    setIsSearching(true);
    
    try {
      const response = await supabase.functions.invoke('cv-search', {
        body: { 
          query: searchQuery.trim(),
          search_type: searchType,
          limit: 10
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erreur lors de la recherche');
      }

      const searchResults = response.data as SearchResult[];
      setResults(searchResults);

      toast({
        title: "Recherche terminée",
        description: `${searchResults.length} CV trouvé(s) pour "${searchQuery}"`
      });

    } catch (error: any) {
      console.error('CV search error:', error);
      
      toast({
        title: "Erreur de recherche",
        description: error.message || "Une erreur s'est produite lors de la recherche",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSearching) {
      performSearch();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const highlightText = (text: string, query: string) => {
    if (!query || searchType === 'semantic') return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, i) => 
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-200 px-1 rounded">
          {part}
        </mark>
      ) : part
    );
  };

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-primary" />
            <span>Recherche de CV Intelligente</span>
          </CardTitle>
          <CardDescription>
            Recherchez parmi tous les CVs uploadés avec la recherche sémantique IA ou textuelle
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Search Type Toggle */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Type de recherche:</span>
            <Button
              variant={searchType === 'semantic' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSearchType('semantic')}
            >
              <Brain className="h-4 w-4 mr-1" />
              Sémantique (IA)
            </Button>
            <Button
              variant={searchType === 'text' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSearchType('text')}
            >
              <FileText className="h-4 w-4 mr-1" />
              Textuelle
            </Button>
          </div>

          {/* Search Input */}
          <div className="flex space-x-2">
            <Input
              placeholder={
                searchType === 'semantic' 
                  ? "Ex: développeur Python avec expérience Machine Learning"
                  : "Ex: React, développeur, ingénieur"
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isSearching}
              className="flex-1"
            />
            <Button
              onClick={performSearch}
              disabled={isSearching || !searchQuery.trim()}
            >
              {isSearching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Recherche...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Rechercher
                </>
              )}
            </Button>
          </div>

          {/* Help Text */}
          <div className="text-sm text-muted-foreground">
            {searchType === 'semantic' ? (
              <p>
                <strong>Recherche sémantique:</strong> Utilisez des phrases complètes pour trouver des CVs par sens et contexte. 
                Ex: "développeur frontend avec expertise React et design UX"
              </p>
            ) : (
              <p>
                <strong>Recherche textuelle:</strong> Recherche par mots-clés exacts dans le contenu. 
                Ex: "Python", "ingénieur", "Paris"
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results Section */}
      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              Résultats de recherche ({results.length})
            </h3>
            {searchType === 'semantic' && (
              <Badge variant="secondary" className="flex items-center space-x-1">
                <Brain className="h-3 w-3" />
                <span>Classés par pertinence IA</span>
              </Badge>
            )}
          </div>

          {results.map((result, index) => (
            <Card key={result.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center text-base">
                    <FileText className="h-4 w-4 mr-2 text-blue-600" />
                    <span>{result.filename || `CV ${index + 1}`}</span>
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    {searchType === 'semantic' && result.similarity && (
                      <Badge variant="outline">
                        {Math.round(result.similarity * 100)}% pertinence
                      </Badge>
                    )}
                    <Badge variant="secondary">
                      {result.file_format?.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatDate(result.created_at)}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {result.processing_method}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {Math.round(result.confidence_score * 100)}% confiance
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent>
                {/* Personal Info */}
                {result.structured_data?.personal_info && (
                  <div className="mb-3 p-2 bg-muted/50 rounded">
                    <div className="flex items-center space-x-1 mb-1">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">Informations personnelles</span>
                    </div>
                    <div className="text-sm">
                      {result.structured_data.personal_info.name && (
                        <span className="font-medium">{result.structured_data.personal_info.name}</span>
                      )}
                      {result.structured_data.personal_info.email && (
                        <span className="text-muted-foreground ml-2">• {result.structured_data.personal_info.email}</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Text Preview */}
                <div className="text-sm">
                  <p className="line-clamp-3">
                    {highlightText(result.raw_text.slice(0, 300) + (result.raw_text.length > 300 ? '...' : ''), searchQuery)}
                  </p>
                </div>

                {/* Skills Preview */}
                {result.structured_data?.skills && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {result.structured_data.skills.technical?.slice(0, 5).map((skill: string, idx: number) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {highlightText(skill, searchQuery)}
                      </Badge>
                    ))}
                    {(result.structured_data.skills.technical?.length || 0) > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{(result.structured_data.skills.technical?.length || 0) - 5} autres
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* No Results */}
      {!isSearching && results.length === 0 && searchQuery && (
        <Card>
          <CardContent className="text-center py-8">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucun résultat trouvé</h3>
            <p className="text-muted-foreground">
              Essayez de modifier votre requête ou utilisez la recherche {searchType === 'semantic' ? 'textuelle' : 'sémantique'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}