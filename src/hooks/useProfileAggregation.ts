import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

interface CVData {
  skills: string[];
  experiences: Array<{
    title: string;
    company: string;
    duration: string;
    responsibilities: string[];
    technologies?: string[];
  }>;
  education: Array<{
    degree: string;
    institution: string;
    year: string;
    field?: string;
  }>;
  certifications?: string[];
  languages?: string[];
}

interface LinkedInData {
  linkedin_id?: string;
  linkedin_headline?: string;
  linkedin_location?: string;
  linkedin_industry?: string;
  linkedin_summary?: string;
  linkedin_data?: any;
}

interface ProfileData {
  full_name?: string;
  email?: string;
  experience_level?: string;
  target_roles?: string[];
  skills?: string[];
}

interface AggregatedProfile {
  profile: ProfileData;
  linkedin: LinkedInData | null;
  cvData: CVData | null;
  aggregatedSkills: string[];
  aggregatedExperience: Array<{
    title: string;
    company: string;
    duration?: string;
    responsibilities?: string[];
    technologies?: string[];
    source: 'cv' | 'linkedin' | 'manual';
  }>;
  aggregatedEducation: Array<{
    degree: string;
    institution: string;
    year?: string;
    field?: string;
    source: 'cv' | 'linkedin';
  }>;
  completeness: {
    profile: number;
    linkedin: number;
    cv: number;
    overall: number;
  };
}

export function useProfileAggregation(user: User | null) {
  const [aggregatedProfile, setAggregatedProfile] = useState<AggregatedProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchAndAggregateProfile();
    }
  }, [user]);

  const fetchAndAggregateProfile = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      // Fetch latest CV data
      const { data: cvDocuments, error: cvError } = await supabase
        .from('cv_documents')
        .select('parsed_content, extracted_skills, extracted_experience, extracted_education')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (cvError && cvError.code !== 'PGRST116') {
        throw cvError;
      }

      // Aggregate the data
      const profile: ProfileData = {
        full_name: profileData?.full_name,
        email: profileData?.email,
        experience_level: profileData?.experience_level,
        target_roles: profileData?.target_roles,
        skills: profileData?.skills
      };

      const linkedin: LinkedInData | null = profileData ? {
        linkedin_id: profileData.linkedin_id,
        linkedin_headline: profileData.linkedin_headline,
        linkedin_location: profileData.linkedin_location,
        linkedin_industry: profileData.linkedin_industry,
        linkedin_summary: profileData.linkedin_summary,
        linkedin_data: profileData.linkedin_data
      } : null;

      const cvData: CVData | null = cvDocuments?.[0] ? {
        skills: Array.isArray(cvDocuments[0].extracted_skills) 
          ? cvDocuments[0].extracted_skills 
          : [],
        experiences: Array.isArray(cvDocuments[0].extracted_experience) 
          ? cvDocuments[0].extracted_experience.map((exp: any) => ({
              title: exp.title || '',
              company: exp.company || '',
              duration: exp.duration || '',
              responsibilities: Array.isArray(exp.responsibilities) ? exp.responsibilities : [],
              technologies: Array.isArray(exp.technologies) ? exp.technologies : undefined
            }))
          : [],
        education: Array.isArray(cvDocuments[0].extracted_education) 
          ? cvDocuments[0].extracted_education.map((edu: any) => ({
              degree: edu.degree || '',
              institution: edu.institution || '',
              year: edu.year || '',
              field: edu.field || undefined
            }))
          : [],
        certifications: [],
        languages: []
      } : null;

      // Aggregate skills from all sources
      const aggregatedSkills = [
        ...(profile.skills || []),
        ...(cvData?.skills || []),
        // LinkedIn skills would be extracted from linkedin_data if available
      ].filter((skill, index, array) => 
        array.findIndex(s => s.toLowerCase() === skill.toLowerCase()) === index
      );

      // Aggregate experience
      const aggregatedExperience = [
        ...(cvData?.experiences?.map(exp => ({ ...exp, source: 'cv' as const })) || []),
        // LinkedIn experience would be extracted from linkedin_data if available
      ];

      // Aggregate education
      const aggregatedEducation = [
        ...(cvData?.education?.map(edu => ({ ...edu, source: 'cv' as const })) || []),
        // LinkedIn education would be extracted from linkedin_data if available
      ];

      // Calculate completeness scores
      const profileCompleteness = calculateProfileCompleteness(profile);
      const linkedinCompleteness = calculateLinkedInCompleteness(linkedin);
      const cvCompleteness = calculateCVCompleteness(cvData);
      const overallCompleteness = (profileCompleteness + linkedinCompleteness + cvCompleteness) / 3;

      const aggregated: AggregatedProfile = {
        profile,
        linkedin: linkedin?.linkedin_id ? linkedin : null,
        cvData,
        aggregatedSkills,
        aggregatedExperience,
        aggregatedEducation,
        completeness: {
          profile: profileCompleteness,
          linkedin: linkedinCompleteness,
          cv: cvCompleteness,
          overall: overallCompleteness
        }
      };

      setAggregatedProfile(aggregated);
    } catch (error: any) {
      console.error('Error aggregating profile:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateProfileCompleteness = (profile: ProfileData): number => {
    const fields = ['full_name', 'email', 'experience_level', 'target_roles'];
    const completedFields = fields.filter(field => {
      const value = profile[field as keyof ProfileData];
      return value && (Array.isArray(value) ? value.length > 0 : true);
    });
    return (completedFields.length / fields.length) * 100;
  };

  const calculateLinkedInCompleteness = (linkedin: LinkedInData | null): number => {
    if (!linkedin?.linkedin_id) return 0;
    
    const fields = ['linkedin_headline', 'linkedin_location', 'linkedin_industry', 'linkedin_summary'];
    const completedFields = fields.filter(field => linkedin[field as keyof LinkedInData]);
    return (completedFields.length / fields.length) * 100;
  };

  const calculateCVCompleteness = (cvData: CVData | null): number => {
    if (!cvData) return 0;
    
    let score = 0;
    if (cvData.skills?.length > 0) score += 25;
    if (cvData.experiences?.length > 0) score += 25;
    if (cvData.education?.length > 0) score += 25;
    if (cvData.certifications?.length > 0 || cvData.languages?.length > 0) score += 25;
    
    return score;
  };

  const refreshProfile = () => {
    fetchAndAggregateProfile();
  };

  return {
    aggregatedProfile,
    loading,
    error,
    refreshProfile
  };
}