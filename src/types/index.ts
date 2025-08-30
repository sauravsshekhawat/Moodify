export interface Track {
  id: string;
  title: string;
  artist: string;
  duration: string;
  thumbnail: string;
  url: string;
}

export interface YouTubeTrack {
  videoId: string;
  title: string;
  channelTitle: string;
  duration: number;
  thumbnail: string;
  publishedAt: string;
  viewCount: number;
}

export interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
  mood: string;
}

export interface MoodInputProps {
  onMoodSubmit: (mood: string) => void;
  isLoading?: boolean;
}

export interface AudioPlayerProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
}

export interface PlaylistDisplayProps {
  playlist: Playlist | null;
  onTrackSelect: (track: Track) => void;
  currentTrack?: Track;
}

export type Mood = 
  | 'happy'
  | 'sad'
  | 'energetic'
  | 'calm'
  | 'romantic'
  | 'nostalgic'
  | 'focused'
  | 'party';