import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import type { DirectUploadedCV } from '@/types/cv';

/**
 * Service pour que les agents IA interagissent avec les CVs uploadés
 */
export class CVAgentService {
  
  /**
   * Récupère tous les CVs actifs d'un utilisateur pour traitement par IA
   */
  static async getUserCVsForAI(userId: string): Promise<DirectUploadedCV[]> {
    const { data: cvs, error } = await supabase
      .from('cv_uploads')
      .select('id, filename, file_size, file_data, created_at, is_default, mime_type')
      .eq('user_id', userId)
      .eq('upload_type', 'direct')
      .eq('is_active', true)
      .not('file_data', 'is', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Erreur lors de la récupération des CVs: ${error.message}`);
    }

    return (cvs || []).map(cv => ({
      id: cv.id,
      filename: cv.filename || 'Unknown',
      file_size: cv.file_size || 0,
      file_url: cv.file_data || '', // Temporaire: utiliser file_data
      created_at: cv.created_at,
      is_default: cv.is_default || false,
      mime_type: cv.mime_type || 'application/pdf'
    }));
  }

  /**
   * Récupère le CV par défaut d'un utilisateur
   */
  static async getDefaultCV(userId: string): Promise<DirectUploadedCV | null> {
    const { data: cv, error } = await supabase
      .from('cv_uploads')
      .select('id, filename, file_size, file_data, created_at, is_default, mime_type')
      .eq('user_id', userId)
      .eq('upload_type', 'direct')
      .eq('is_active', true)
      .eq('is_default', true)
      .not('file_data', 'is', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        return null;
      }
      throw new Error(`Erreur lors de la récupération du CV par défaut: ${error.message}`);
    }

    return cv ? {
      id: cv.id,
      filename: cv.filename || 'Unknown',
      file_size: cv.file_size || 0,
      file_url: cv.file_data || '', // Temporaire: utiliser file_data
      created_at: cv.created_at,
      is_default: cv.is_default || false,
      mime_type: cv.mime_type || 'application/pdf'
    } : null;
  }

  /**
   * Télécharge le contenu d'un CV pour traitement
   */
  static async downloadCVContent(fileUrl: string): Promise<Blob> {
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Erreur lors du téléchargement du CV: ${response.statusText}`);
    }
    return response.blob();
  }

  /**
   * Exemple d'utilisation par un agent IA pour analyser un CV
   */
  static async analyzeCV(userId: string): Promise<{
    cvId: string;
    filename: string;
    analysisResult: string;
  }> {
    // 1. Récupérer le CV par défaut
    const defaultCV = await this.getDefaultCV(userId);
    if (!defaultCV) {
      throw new Error('Aucun CV par défaut trouvé');
    }

    // 2. Télécharger le contenu
    const cvBlob = await this.downloadCVContent(defaultCV.file_url);
    
    // 3. Ici vous pourriez :
    // - Envoyer le blob à un service d'OCR
    // - Utiliser une API d'IA pour analyser le contenu
    // - Extraire le texte avec pdf-parse ou similaire
    
    // Exemple simplifié :
    const analysisResult = `Analyse du CV ${defaultCV.filename}:
    - Taille: ${(defaultCV.file_size / 1024 / 1024).toFixed(2)} MB
    - Format: ${defaultCV.mime_type}
    - Créé: ${new Date(defaultCV.created_at).toLocaleDateString('fr-FR')}
    
    [Ici serait l'analyse détaillée par IA]`;

    return {
      cvId: defaultCV.id,
      filename: defaultCV.filename,
      analysisResult
    };
  }

  /**
   * Exemple d'utilisation pour matching avec une offre d'emploi
   */
  static async matchWithJobOffer(userId: string, jobDescription: string): Promise<{
    matchScore: number;
    recommendations: string[];
    cvUsed: DirectUploadedCV;
  }> {
    const defaultCV = await this.getDefaultCV(userId);
    if (!defaultCV) {
      throw new Error('Aucun CV par défaut trouvé');
    }

    // Ici vous pourriez implémenter :
    // 1. Extraction du texte du CV
    // 2. Analyse sémantique du CV vs offre d'emploi
    // 3. Score de matching
    // 4. Recommandations d'amélioration

    // Exemple simplifié :
    return {
      matchScore: Math.random() * 100, // Score fictif
      recommendations: [
        "Ajouter des compétences en JavaScript",
        "Mettre en avant l'expérience en gestion d'équipe",
        "Inclure des certifications pertinentes"
      ],
      cvUsed: defaultCV
    };
  }

  /**
   * Marquer un CV comme traité par un agent IA
   */
  static async markAsProcessedByAI(cvId: string, aiProcessingData: any): Promise<void> {
    // Vous pourriez ajouter une table pour tracker les traitements IA
    // ou ajouter des métadonnées au CV existant
    
    const { error } = await supabase
      .from('cv_uploads')
      .update({
        structured_data: {
          ...aiProcessingData,
          ai_processed_at: new Date().toISOString()
        }
      })
      .eq('id', cvId);

    if (error) {
      throw new Error(`Erreur lors de la mise à jour: ${error.message}`);
    }
  }
}

/**
 * Exemple d'utilisation dans un composant React
 */
export function useCVAnalysis(userId: string) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);

  const analyzeUserCV = async () => {
    setIsAnalyzing(true);
    try {
      const result = await CVAgentService.analyzeCV(userId);
      setAnalysis(result);
    } catch (error) {
      console.error('Erreur analyse CV:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return {
    analyzeUserCV,
    isAnalyzing,
    analysis
  };
}
