export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          username: string | null
          full_name: string | null
          profile_image_url: string | null
          subscription_tier: string
          created_at: string
          updated_at: string
          last_active_at: string | null
          preferences: any
          mood_history: any[]
        }
        Insert: {
          id?: string
          email: string
          username?: string | null
          full_name?: string | null
          profile_image_url?: string | null
          subscription_tier?: string
          created_at?: string
          updated_at?: string
          last_active_at?: string | null
          preferences?: any
          mood_history?: any[]
        }
        Update: {
          id?: string
          email?: string
          username?: string | null
          full_name?: string | null
          profile_image_url?: string | null
          subscription_tier?: string
          created_at?: string
          updated_at?: string
          last_active_at?: string | null
          preferences?: any
          mood_history?: any[]
        }
      }
      moods: {
        Row: {
          id: string
          name: string
          category: string | null
          description: string | null
          color_hex: string | null
          emoji: string | null
          audio_features: any | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          category?: string | null
          description?: string | null
          color_hex?: string | null
          emoji?: string | null
          audio_features?: any | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          category?: string | null
          description?: string | null
          color_hex?: string | null
          emoji?: string | null
          audio_features?: any | null
          created_at?: string
        }
      }
      tracks: {
        Row: {
          id: string
          external_id: string | null
          title: string
          artist: string
          album: string | null
          duration_ms: number | null
          thumbnail_url: string | null
          stream_url: string | null
          provider: string | null
          audio_features: any | null
          mood_scores: any | null
          popularity_score: number
          explicit: boolean
          permalink: string | null
          genre: string | null
          waveform_url: string | null
          play_count: number | null
          spotify_track_id: string | null
          preview_url: string | null
          release_date: string | null
          danceability: number | null
          energy: number | null
          valence: number | null
          tempo: number | null
          acousticness: number | null
          instrumentalness: number | null
          liveness: number | null
          speechiness: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          external_id?: string | null
          title: string
          artist: string
          album?: string | null
          duration_ms?: number | null
          thumbnail_url?: string | null
          stream_url?: string | null
          provider?: string | null
          audio_features?: any | null
          mood_scores?: any | null
          popularity_score?: number
          explicit?: boolean
          permalink?: string | null
          genre?: string | null
          waveform_url?: string | null
          play_count?: number | null
          spotify_track_id?: string | null
          preview_url?: string | null
          release_date?: string | null
          danceability?: number | null
          energy?: number | null
          valence?: number | null
          tempo?: number | null
          acousticness?: number | null
          instrumentalness?: number | null
          liveness?: number | null
          speechiness?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          external_id?: string | null
          title?: string
          artist?: string
          album?: string | null
          duration_ms?: number | null
          thumbnail_url?: string | null
          stream_url?: string | null
          provider?: string | null
          audio_features?: any | null
          mood_scores?: any | null
          popularity_score?: number
          explicit?: boolean
          permalink?: string | null
          genre?: string | null
          waveform_url?: string | null
          play_count?: number | null
          spotify_track_id?: string | null
          preview_url?: string | null
          release_date?: string | null
          danceability?: number | null
          energy?: number | null
          valence?: number | null
          tempo?: number | null
          acousticness?: number | null
          instrumentalness?: number | null
          liveness?: number | null
          speechiness?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      playlists: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          mood_id: string | null
          mood_input: string | null
          cover_image_url: string | null
          is_public: boolean
          is_ai_generated: boolean
          total_duration_ms: number
          track_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          mood_id?: string | null
          mood_input?: string | null
          cover_image_url?: string | null
          is_public?: boolean
          is_ai_generated?: boolean
          total_duration_ms?: number
          track_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          mood_id?: string | null
          mood_input?: string | null
          cover_image_url?: string | null
          is_public?: boolean
          is_ai_generated?: boolean
          total_duration_ms?: number
          track_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      playlist_tracks: {
        Row: {
          id: string
          playlist_id: string
          track_id: string
          position: number
          added_at: string
          added_by_user_id: string | null
        }
        Insert: {
          id?: string
          playlist_id: string
          track_id: string
          position: number
          added_at?: string
          added_by_user_id?: string | null
        }
        Update: {
          id?: string
          playlist_id?: string
          track_id?: string
          position?: number
          added_at?: string
          added_by_user_id?: string | null
        }
      }
      mood_analysis_sessions: {
        Row: {
          id: string
          user_id: string | null
          mood_input: string
          detected_moods: any | null
          confidence_scores: any | null
          processing_time_ms: number | null
          model_version: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          mood_input: string
          detected_moods?: any | null
          confidence_scores?: any | null
          processing_time_ms?: number | null
          model_version?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          mood_input?: string
          detected_moods?: any | null
          confidence_scores?: any | null
          processing_time_ms?: number | null
          model_version?: string | null
          created_at?: string
        }
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
  }
}