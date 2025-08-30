-- MoodTunes AI Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE,
  full_name VARCHAR(100),
  profile_image_url TEXT,
  subscription_tier VARCHAR(20) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'luxury')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active_at TIMESTAMP WITH TIME ZONE,
  preferences JSONB DEFAULT '{}',
  mood_history JSONB DEFAULT '[]'
);

-- Create moods table
CREATE TABLE moods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) UNIQUE NOT NULL,
  category VARCHAR(30),
  description TEXT,
  color_hex VARCHAR(7),
  emoji VARCHAR(10),
  audio_features JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tracks table
CREATE TABLE tracks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id VARCHAR(255),
  title VARCHAR(500) NOT NULL,
  artist VARCHAR(300) NOT NULL,
  album VARCHAR(300),
  duration_ms INTEGER,
  thumbnail_url TEXT,
  stream_url TEXT,
  provider VARCHAR(20) CHECK (provider IN ('youtube', 'spotify', 'soundcloud')),
  audio_features JSONB,
  mood_scores JSONB,
  popularity_score REAL DEFAULT 0,
  explicit BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create playlists table
CREATE TABLE playlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  mood_id UUID REFERENCES moods(id),
  mood_input TEXT,
  cover_image_url TEXT,
  is_public BOOLEAN DEFAULT false,
  is_ai_generated BOOLEAN DEFAULT true,
  total_duration_ms INTEGER DEFAULT 0,
  track_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create playlist_tracks junction table
CREATE TABLE playlist_tracks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE,
  track_id UUID REFERENCES tracks(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  added_by_user_id UUID REFERENCES users(id),
  UNIQUE(playlist_id, position),
  UNIQUE(playlist_id, track_id)
);

-- Create mood_analysis_sessions table
CREATE TABLE mood_analysis_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  mood_input TEXT NOT NULL,
  detected_moods JSONB,
  confidence_scores JSONB,
  processing_time_ms INTEGER,
  model_version VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add unique constraint for tracks to support upsert operations
ALTER TABLE tracks ADD CONSTRAINT unique_external_id_provider UNIQUE (external_id, provider);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_tracks_external_id ON tracks(external_id);
CREATE INDEX idx_tracks_provider ON tracks(provider);
CREATE INDEX idx_playlists_user_id ON playlists(user_id);
CREATE INDEX idx_playlists_mood_id ON playlists(mood_id);
CREATE INDEX idx_playlist_tracks_playlist_id ON playlist_tracks(playlist_id);
CREATE INDEX idx_playlist_tracks_position ON playlist_tracks(playlist_id, position);
CREATE INDEX idx_mood_analysis_user_id ON mood_analysis_sessions(user_id);
CREATE INDEX idx_mood_analysis_created_at ON mood_analysis_sessions(created_at);

-- Create full-text search index for tracks
CREATE INDEX idx_tracks_search ON tracks USING gin(to_tsvector('english', title || ' ' || artist || ' ' || COALESCE(album, '')));

-- Create indexes for JSONB columns
CREATE INDEX idx_tracks_audio_features ON tracks USING gin(audio_features);
CREATE INDEX idx_tracks_mood_scores ON tracks USING gin(mood_scores);
CREATE INDEX idx_moods_audio_features ON moods USING gin(audio_features);

-- Insert initial mood data
INSERT INTO moods (name, category, description, color_hex, emoji, audio_features) VALUES
('euphoric', 'energy', 'Feeling extremely happy and energetic', '#FFD700', '✨', '{"energy": 0.9, "valence": 0.95, "tempo": "high"}'),
('melancholic', 'emotional', 'Feeling sad or thoughtful', '#4169E1', '🌙', '{"energy": 0.3, "valence": 0.2, "tempo": "low"}'),
('energetic', 'energy', 'Feeling full of energy and motivation', '#FF4500', '⚡', '{"energy": 0.95, "valence": 0.8, "tempo": "very_high"}'),
('serene', 'emotional', 'Feeling peaceful and calm', '#20B2AA', '🕊️', '{"energy": 0.2, "valence": 0.7, "tempo": "low"}'),
('passionate', 'emotional', 'Feeling intense and romantic', '#DC143C', '🔥', '{"energy": 0.8, "valence": 0.9, "tempo": "medium"}'),
('contemplative', 'mental', 'Feeling thoughtful and introspective', '#9370DB', '🧠', '{"energy": 0.4, "valence": 0.5, "tempo": "medium"}'),
('dramatic', 'emotional', 'Feeling intense and theatrical', '#8A2BE2', '🎭', '{"energy": 0.7, "valence": 0.6, "tempo": "medium"}'),
('nostalgic', 'temporal', 'Feeling wistful about the past', '#DAA520', '🌅', '{"energy": 0.5, "valence": 0.6, "tempo": "medium"}');

-- Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_analysis_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see and edit their own data
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Playlists policies
CREATE POLICY "Users can view own playlists" ON playlists FOR SELECT USING (auth.uid() = user_id OR is_public = true);
CREATE POLICY "Users can create playlists" ON playlists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own playlists" ON playlists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own playlists" ON playlists FOR DELETE USING (auth.uid() = user_id);

-- Playlist tracks policies
CREATE POLICY "Users can view playlist tracks" ON playlist_tracks FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM playlists 
    WHERE playlists.id = playlist_tracks.playlist_id 
    AND (playlists.user_id = auth.uid() OR playlists.is_public = true)
  )
);

CREATE POLICY "Users can manage own playlist tracks" ON playlist_tracks FOR ALL USING (
  EXISTS (
    SELECT 1 FROM playlists 
    WHERE playlists.id = playlist_tracks.playlist_id 
    AND playlists.user_id = auth.uid()
  )
);

-- Mood analysis sessions policies
CREATE POLICY "Users can view own mood sessions" ON mood_analysis_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create mood sessions" ON mood_analysis_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Public read access for moods and tracks
ALTER TABLE moods ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view moods" ON moods FOR SELECT USING (true);
CREATE POLICY "Anyone can view tracks" ON tracks FOR SELECT USING (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tracks_updated_at BEFORE UPDATE ON tracks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_playlists_updated_at BEFORE UPDATE ON playlists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();