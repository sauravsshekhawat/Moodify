import { supabase } from './supabase'
import { Database } from '@/types/database'

type Tables = Database['public']['Tables']
type User = Tables['users']['Row']
type Mood = Tables['moods']['Row']
type Track = Tables['tracks']['Row']
type Playlist = Tables['playlists']['Row']
type MoodAnalysisSession = Tables['mood_analysis_sessions']['Row']

// User operations
export const createUser = async (userData: Tables['users']['Insert']) => {
  const { data, error } = await supabase
    .from('users')
    // @ts-ignore
    .insert(userData)
    .select()
    .single()
  
  return { data, error }
}

export const getUserById = async (userId: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()
  
  return { data, error }
}

export const updateUser = async (userId: string, updates: Tables['users']['Update']) => {
  const { data, error } = await supabase
    .from('users')
    // @ts-ignore
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  
  return { data, error }
}

// Mood operations
export const getAllMoods = async () => {
  const { data, error } = await supabase
    .from('moods')
    .select('*')
    .order('name')
  
  return { data, error }
}

export const getMoodByName = async (moodName: string) => {
  const { data, error } = await supabase
    .from('moods')
    .select('*')
    .eq('name', moodName.toLowerCase())
    .single()
  
  return { data, error }
}

// Track operations
export const createTrack = async (trackData: Tables['tracks']['Insert']) => {
  const { data, error } = await supabase
    .from('tracks')
    // @ts-ignore
    .insert(trackData)
    .select()
    .single()
  
  return { data, error }
}

export const searchTracks = async (query: string, limit = 20) => {
  const { data, error } = await supabase
    .from('tracks')
    .select('*')
    .textSearch('title,artist,album', query, { 
      type: 'websearch',
      config: 'english' 
    })
    .limit(limit)
  
  return { data, error }
}

export const getTracksByMoodScores = async (moodScores: any, limit = 50) => {
  // This would involve more complex matching logic
  // For now, return random tracks as placeholder
  const { data, error } = await supabase
    .from('tracks')
    .select('*')
    .limit(limit)
  
  return { data, error }
}

// Playlist operations
export const createPlaylist = async (playlistData: Tables['playlists']['Insert']) => {
  const { data, error } = await supabase
    .from('playlists')
    // @ts-ignore
    .insert(playlistData)
    .select()
    .single()
  
  return { data, error }
}

export const getUserPlaylists = async (userId: string) => {
  const { data, error } = await supabase
    .from('playlists')
    .select(`
      *,
      moods (name, emoji, color_hex)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  
  return { data, error }
}

export const getPlaylistWithTracks = async (playlistId: string) => {
  const { data, error } = await supabase
    .from('playlists')
    .select(`
      *,
      moods (name, emoji, color_hex),
      playlist_tracks (
        position,
        tracks (*)
      )
    `)
    .eq('id', playlistId)
    .single()
  
  return { data, error }
}

export const addTrackToPlaylist = async (playlistId: string, trackId: string, position: number) => {
  const { data, error } = await supabase
    .from('playlist_tracks')
    // @ts-ignore
    .insert([{
      playlist_id: playlistId,
      track_id: trackId,
      position: position
    }])
    .select()
    .single()
  
  return { data, error }
}

export const removeTrackFromPlaylist = async (playlistId: string, trackId: string) => {
  const { data, error } = await supabase
    .from('playlist_tracks')
    .delete()
    .eq('playlist_id', playlistId)
    .eq('track_id', trackId)
  
  return { data, error }
}

// Mood analysis operations
export const createMoodAnalysisSession = async (sessionData: Tables['mood_analysis_sessions']['Insert']) => {
  const { data, error } = await supabase
    .from('mood_analysis_sessions')
    // @ts-ignore
    .insert(sessionData)
    .select()
    .single()
  
  return { data, error }
}

export const getUserMoodHistory = async (userId: string, limit = 10) => {
  const { data, error } = await supabase
    .from('mood_analysis_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  
  return { data, error }
}

// Utility functions
export const updatePlaylistStats = async (playlistId: string) => {
  // Get track count and total duration
  const { data: tracks, error } = await supabase
    .from('playlist_tracks')
    .select('tracks(duration_ms)')
    .eq('playlist_id', playlistId)
  
  if (error || !tracks) return { error }
  
  const trackCount = tracks.length
  const totalDuration = tracks.reduce((sum, item) => {
    const duration = (item as any).tracks?.duration_ms || 0
    return sum + duration
  }, 0)
  
  // Update playlist stats
  const { data, error: updateError } = await supabase
    .from('playlists')
    // @ts-ignore
    .update({
      track_count: trackCount,
      total_duration_ms: totalDuration
    })
    .eq('id', playlistId)
    .select()
    .single()
  
  return { data, error: updateError }
}