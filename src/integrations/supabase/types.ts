export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      answers: {
        Row: {
          audio_url: string | null
          clarity_score: number | null
          communication_score: number | null
          confidence_score: number | null
          created_at: string
          duration_seconds: number | null
          id: string
          question_id: string
          session_id: string
          structure_score: number | null
          submitted_at: string
          technical_score: number | null
          transcript: string | null
          video_url: string | null
        }
        Insert: {
          audio_url?: string | null
          clarity_score?: number | null
          communication_score?: number | null
          confidence_score?: number | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          question_id: string
          session_id: string
          structure_score?: number | null
          submitted_at?: string
          technical_score?: number | null
          transcript?: string | null
          video_url?: string | null
        }
        Update: {
          audio_url?: string | null
          clarity_score?: number | null
          communication_score?: number | null
          confidence_score?: number | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          question_id?: string
          session_id?: string
          structure_score?: number | null
          submitted_at?: string
          technical_score?: number | null
          transcript?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      cv_documents: {
        Row: {
          created_at: string
          extracted_education: string[] | null
          extracted_experience: string[] | null
          extracted_skills: string[] | null
          file_size: number | null
          file_url: string
          filename: string
          id: string
          mime_type: string | null
          parsed_content: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          extracted_education?: string[] | null
          extracted_experience?: string[] | null
          extracted_skills?: string[] | null
          file_size?: number | null
          file_url: string
          filename: string
          id?: string
          mime_type?: string | null
          parsed_content?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          extracted_education?: string[] | null
          extracted_experience?: string[] | null
          extracted_skills?: string[] | null
          file_size?: number | null
          file_url?: string
          filename?: string
          id?: string
          mime_type?: string | null
          parsed_content?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      feedbacks: {
        Row: {
          action_items: string[] | null
          answer_id: string | null
          created_at: string
          detailed_feedback: string | null
          evidence_points: string[] | null
          feedback_type: string
          highlights: string[] | null
          id: string
          improvements: string[] | null
          session_id: string
          skill_category: string | null
        }
        Insert: {
          action_items?: string[] | null
          answer_id?: string | null
          created_at?: string
          detailed_feedback?: string | null
          evidence_points?: string[] | null
          feedback_type?: string
          highlights?: string[] | null
          id?: string
          improvements?: string[] | null
          session_id: string
          skill_category?: string | null
        }
        Update: {
          action_items?: string[] | null
          answer_id?: string | null
          created_at?: string
          detailed_feedback?: string | null
          evidence_points?: string[] | null
          feedback_type?: string
          highlights?: string[] | null
          id?: string
          improvements?: string[] | null
          session_id?: string
          skill_category?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedbacks_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedbacks_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_sessions: {
        Row: {
          beyond_presence_session_id: string | null
          communication_score: number | null
          completed_at: string | null
          confidence_score: number | null
          created_at: string
          duration_minutes: number | null
          id: string
          job_context_id: string | null
          overall_score: number | null
          session_type: string
          started_at: string | null
          status: string
          technical_score: number | null
          title: string
          updated_at: string
          user_id: string
          video_recording_url: string | null
        }
        Insert: {
          beyond_presence_session_id?: string | null
          communication_score?: number | null
          completed_at?: string | null
          confidence_score?: number | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          job_context_id?: string | null
          overall_score?: number | null
          session_type?: string
          started_at?: string | null
          status?: string
          technical_score?: number | null
          title: string
          updated_at?: string
          user_id: string
          video_recording_url?: string | null
        }
        Update: {
          beyond_presence_session_id?: string | null
          communication_score?: number | null
          completed_at?: string | null
          confidence_score?: number | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          job_context_id?: string | null
          overall_score?: number | null
          session_type?: string
          started_at?: string | null
          status?: string
          technical_score?: number | null
          title?: string
          updated_at?: string
          user_id?: string
          video_recording_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_sessions_job_context_id_fkey"
            columns: ["job_context_id"]
            isOneToOne: false
            referencedRelation: "job_contexts"
            referencedColumns: ["id"]
          },
        ]
      }
      job_contexts: {
        Row: {
          company_name: string | null
          company_signals: string[] | null
          created_at: string
          id: string
          job_description: string | null
          keywords: string[] | null
          pdf_content: string | null
          requirements: string[] | null
          skills_required: string[] | null
          source_urls: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_name?: string | null
          company_signals?: string[] | null
          created_at?: string
          id?: string
          job_description?: string | null
          keywords?: string[] | null
          pdf_content?: string | null
          requirements?: string[] | null
          skills_required?: string[] | null
          source_urls?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_name?: string | null
          company_signals?: string[] | null
          created_at?: string
          id?: string
          job_description?: string | null
          keywords?: string[] | null
          pdf_content?: string | null
          requirements?: string[] | null
          skills_required?: string[] | null
          source_urls?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          experience_level: string | null
          full_name: string | null
          id: string
          linkedin_connections_count: number | null
          linkedin_data: Json | null
          linkedin_headline: string | null
          linkedin_id: string | null
          linkedin_industry: string | null
          linkedin_linked_at: string | null
          linkedin_location: string | null
          linkedin_public_profile_url: string | null
          linkedin_summary: string | null
          linkedin_url: string | null
          skills: string[] | null
          target_roles: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          experience_level?: string | null
          full_name?: string | null
          id?: string
          linkedin_connections_count?: number | null
          linkedin_data?: Json | null
          linkedin_headline?: string | null
          linkedin_id?: string | null
          linkedin_industry?: string | null
          linkedin_linked_at?: string | null
          linkedin_location?: string | null
          linkedin_public_profile_url?: string | null
          linkedin_summary?: string | null
          linkedin_url?: string | null
          skills?: string[] | null
          target_roles?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          experience_level?: string | null
          full_name?: string | null
          id?: string
          linkedin_connections_count?: number | null
          linkedin_data?: Json | null
          linkedin_headline?: string | null
          linkedin_id?: string | null
          linkedin_industry?: string | null
          linkedin_linked_at?: string | null
          linkedin_location?: string | null
          linkedin_public_profile_url?: string | null
          linkedin_summary?: string | null
          linkedin_url?: string | null
          skills?: string[] | null
          target_roles?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          beyond_presence_question_id: string | null
          created_at: string
          difficulty: string | null
          expected_duration_seconds: number | null
          id: string
          order_index: number
          question_text: string
          question_type: string
          session_id: string
        }
        Insert: {
          beyond_presence_question_id?: string | null
          created_at?: string
          difficulty?: string | null
          expected_duration_seconds?: number | null
          id?: string
          order_index: number
          question_text: string
          question_type: string
          session_id: string
        }
        Update: {
          beyond_presence_question_id?: string | null
          created_at?: string
          difficulty?: string | null
          expected_duration_seconds?: number | null
          id?: string
          order_index?: number
          question_text?: string
          question_type?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
