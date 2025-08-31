interface SoundCloudTrack {
  id: string;
  title: string;
  artist: string;
  duration: number;
  thumbnail: string;
  streamUrl: string;
  publishedAt: string;
  playCount: number;
  genre?: string;
  description?: string;
  waveformUrl?: string;
  permalink: string;
}

interface SoundCloudResponse {
  tracks: SoundCloudTrack[];
  totalResults: number;
}

interface ParsedInput {
  vibe: string;
  environment: string;
  speed: string;
  genre?: string;
}

interface ScoredTrack extends SoundCloudTrack {
  score: number;
}

class SoundCloudService {
  private readonly clientId: string;
  private readonly baseUrl = 'https://api.soundcloud.com';

  constructor() {
    this.clientId = process.env.SOUNDCLOUD_CLIENT_ID || '';
    if (!this.clientId) {
      console.warn('SoundCloud Client ID not configured');
    }
  }

  private parseInput(vibeInput: string): ParsedInput {
    const input = vibeInput.toLowerCase();
    
    // Environment detection
    const environments = {
      gym: ['gym', 'workout', 'fitness', 'training', 'exercise'],
      study: ['study', 'focus', 'concentration', 'work', 'office'],
      party: ['party', 'dance', 'club', 'celebration', 'rave'],
      sleep: ['sleep', 'bedtime', 'night', 'relax', 'calm'],
      drive: ['drive', 'car', 'road', 'travel', 'cruise'],
      cafe: ['cafe', 'coffee', 'background', 'ambient']
    };
    
    // Speed detection
    const speeds = {
      slow: ['slow', 'chill', 'relaxed', 'mellow', 'downtempo', 'peaceful'],
      medium: ['medium', 'moderate', 'steady', 'groove', 'normal'],
      fast: ['fast', 'upbeat', 'energetic', 'high tempo', 'uptempo', 'intense']
    };
    
    // Vibe detection
    const vibes = {
      sad: ['sad', 'melancholy', 'depressing', 'emotional', 'crying'],
      happy: ['happy', 'joyful', 'cheerful', 'positive', 'uplifting'],
      chill: ['chill', 'lofi', 'calm', 'peaceful', 'zen'],
      energetic: ['energetic', 'hype', 'pump', 'motivational', 'power'],
      romantic: ['romantic', 'love', 'heart', 'valentine', 'couple'],
      dark: ['dark', 'gothic', 'scary', 'horror', 'evil']
    };
    
    let detectedEnvironment = '';
    let detectedSpeed = '';
    let detectedVibe = '';
    
    // Detect environment
    for (const [env, keywords] of Object.entries(environments)) {
      if (keywords.some(keyword => input.includes(keyword))) {
        detectedEnvironment = env;
        break;
      }
    }
    
    // Detect speed
    for (const [speed, keywords] of Object.entries(speeds)) {
      if (keywords.some(keyword => input.includes(keyword))) {
        detectedSpeed = speed;
        break;
      }
    }
    
    // Detect vibe
    for (const [vibe, keywords] of Object.entries(vibes)) {
      if (keywords.some(keyword => input.includes(keyword))) {
        detectedVibe = vibe;
        break;
      }
    }
    
    // Genre hints
    let genre = '';
    if (input.includes('lofi') || (detectedVibe === 'chill' && detectedEnvironment === 'study')) {
      genre = 'lofi';
    } else if (input.includes('edm') || input.includes('electronic')) {
      genre = 'electronic';
    } else if (input.includes('hip hop') || input.includes('rap')) {
      genre = 'hip-hop';
    } else if (input.includes('jazz')) {
      genre = 'jazz';
    } else if (input.includes('rock')) {
      genre = 'rock';
    }
    
    return {
      vibe: detectedVibe || vibeInput.split(' ')[0],
      environment: detectedEnvironment,
      speed: detectedSpeed,
      genre
    };
  }

  private generateSearchQuery(vibeInput: string): string {
    const parsed = this.parseInput(vibeInput);
    
    // Build base query
    let baseQuery = '';
    
    if (parsed.genre) {
      baseQuery = `${parsed.vibe} ${parsed.genre}`;
    } else {
      baseQuery = `${parsed.vibe} music`;
      if (parsed.environment) baseQuery += ` ${parsed.environment}`;
      if (parsed.speed) baseQuery += ` ${parsed.speed}`;
    }
    
    return baseQuery.trim();
  }

  private isValidMusicTrack(track: any, searchContext: string): boolean {
    const title = track.title?.toLowerCase() || '';
    const description = track.description?.toLowerCase() || '';
    
    // Duration filter - minimum 30 seconds, maximum 20 minutes
    if (track.duration < 30000 || track.duration > 1200000) {
      return false;
    }

    // Must be streamable
    if (!track.streamable) {
      return false;
    }

    // Basic exclusions
    const badKeywords = [
      'podcast', 'interview', 'talk', 'lecture', 'speech',
      'news', 'radio show', 'advertisement', 'commercial'
    ];
    
    const hasBadKeyword = badKeywords.some(keyword => 
      title.includes(keyword) || description.includes(keyword)
    );
    
    if (hasBadKeyword) {
      return false;
    }

    return true;
  }

  private calculateTrackScore(track: any, searchContext: string): number {
    const title = track.title?.toLowerCase() || '';
    const description = track.description?.toLowerCase() || '';
    const genre = track.genre?.toLowerCase() || '';
    let score = 0;

    // Base score from play count (logarithmic scale)
    const playCount = track.playback_count || 0;
    score += Math.min(Math.log10(playCount + 1), 5);

    // Genre matching
    const context = searchContext.toLowerCase();
    if (genre && context.includes(genre)) {
      score += 3;
    }

    // Title relevance
    const searchWords = context.split(' ');
    searchWords.forEach(word => {
      if (word.length > 2 && title.includes(word)) {
        score += 2;
      }
    });

    // Prefer tracks with artwork
    if (track.artwork_url) {
      score += 1;
    }

    // Duration preference (3-6 minutes ideal)
    const durationMin = track.duration / 60000;
    if (durationMin >= 3 && durationMin <= 6) {
      score += 2;
    } else if (durationMin >= 2 && durationMin <= 8) {
      score += 1;
    }

    // Recency bonus
    const createdAt = new Date(track.created_at);
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    if (createdAt > oneYearAgo) {
      score += 1;
    }

    return score;
  }

  private transformTrack(track: any): SoundCloudTrack {
    return {
      id: track.id.toString(),
      title: track.title || 'Unknown Title',
      artist: track.user?.username || 'Unknown Artist',
      duration: Math.floor(track.duration / 1000), // Convert to seconds
      thumbnail: track.artwork_url || track.user?.avatar_url || '',
      streamUrl: track.stream_url || '',
      publishedAt: track.created_at || new Date().toISOString(),
      playCount: track.playback_count || 0,
      genre: track.genre || undefined,
      description: track.description || undefined,
      waveformUrl: track.waveform_url || undefined,
      permalink: track.permalink_url || ''
    };
  }

  async searchMusic(vibeInput: string): Promise<SoundCloudResponse> {
    try {
      if (!this.clientId) {
        throw new Error('SoundCloud Client ID not configured');
      }

      const searchQuery = this.generateSearchQuery(vibeInput);
      const url = new URL(`${this.baseUrl}/tracks`);
      
      url.searchParams.append('client_id', this.clientId);
      url.searchParams.append('q', searchQuery);
      url.searchParams.append('limit', '50');
      url.searchParams.append('offset', '0');
      url.searchParams.append('streamable', 'true');
      
      const response = await fetch(url.toString(), {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`SoundCloud API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!Array.isArray(data)) {
        return { tracks: [], totalResults: 0 };
      }

      // Filter and score tracks
      const validTracks = data.filter(track => 
        this.isValidMusicTrack(track, vibeInput)
      );

      const scoredTracks: ScoredTrack[] = validTracks.map(track => ({
        ...this.transformTrack(track),
        score: this.calculateTrackScore(track, vibeInput)
      }));

      // Sort by score (highest first)
      scoredTracks.sort((a, b) => b.score - a.score);

      // Return top 10 results without score property
      const topTracks = scoredTracks.slice(0, 10).map(track => {
        const { score, ...trackWithoutScore } = track;
        return trackWithoutScore;
      });

      return {
        tracks: topTracks,
        totalResults: topTracks.length
      };

    } catch (error) {
      console.error('SoundCloud API Error:', error);
      throw new Error('Failed to search SoundCloud tracks');
    }
  }

  async getStreamUrl(trackId: string): Promise<string | null> {
    try {
      if (!this.clientId) {
        throw new Error('SoundCloud Client ID not configured');
      }

      const url = `${this.baseUrl}/tracks/${trackId}/stream?client_id=${this.clientId}`;
      
      // Get the redirect URL for streaming
      const response = await fetch(url, {
        method: 'HEAD',
        redirect: 'manual'
      });

      const location = response.headers.get('location');
      return location;

    } catch (error) {
      console.error('Error getting SoundCloud stream URL:', error);
      return null;
    }
  }
}

export default SoundCloudService;