interface SpotifyTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  thumbnail: string;
  previewUrl: string;
  spotifyUrl: string;
  popularity: number;
  releaseDate: string;
  genres: string[];
  audioFeatures?: SpotifyAudioFeatures;
}

interface SpotifyAudioFeatures {
  danceability: number; // 0.0 to 1.0
  energy: number; // 0.0 to 1.0
  key: number; // 0 to 11
  loudness: number; // typically -60 to 0 db
  mode: number; // 0 = minor, 1 = major
  speechiness: number; // 0.0 to 1.0
  acousticness: number; // 0.0 to 1.0
  instrumentalness: number; // 0.0 to 1.0
  liveness: number; // 0.0 to 1.0
  valence: number; // 0.0 to 1.0 (happiness)
  tempo: number; // BPM
  timeSignature: number; // 3, 4, 5, 6, or 7
}

interface SpotifyResponse {
  tracks: SpotifyTrack[];
  totalResults: number;
}

interface ParsedInput {
  vibe: string;
  environment: string;
  speed: string;
  energy: 'low' | 'medium' | 'high';
  valence: 'negative' | 'neutral' | 'positive';
  genre?: string;
}

interface ScoredTrack extends SpotifyTrack {
  score: number;
}

class SpotifyService {
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private readonly baseUrl = 'https://api.spotify.com/v1';
  private readonly accountsUrl = 'https://accounts.spotify.com/api/token';

  constructor() {
    this.clientId = process.env.SPOTIFY_CLIENT_ID || '';
    this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET || '';
    
    if (!this.clientId || !this.clientSecret) {
      console.warn('Spotify credentials not configured');
    }
  }

  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    if (!this.clientId || !this.clientSecret) {
      throw new Error('Spotify credentials not configured');
    }

    try {
      const response = await fetch(this.accountsUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });

      if (!response.ok) {
        throw new Error(`Spotify auth failed: ${response.status}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Refresh 1 minute early

      return this.accessToken as string;
    } catch (error) {
      console.error('Spotify authentication error:', error);
      throw new Error('Failed to authenticate with Spotify');
    }
  }

  private parseInput(vibeInput: string): ParsedInput {
    const input = vibeInput.toLowerCase();
    
    // Environment detection
    const environments = {
      gym: ['gym', 'workout', 'fitness', 'training', 'exercise', 'running', 'cardio'],
      study: ['study', 'focus', 'concentration', 'work', 'office', 'reading', 'homework'],
      party: ['party', 'dance', 'club', 'celebration', 'rave', 'festival', 'wedding'],
      sleep: ['sleep', 'bedtime', 'night', 'relax', 'calm', 'lullaby', 'peaceful'],
      drive: ['drive', 'car', 'road', 'travel', 'cruise', 'highway', 'journey'],
      cafe: ['cafe', 'coffee', 'background', 'ambient', 'restaurant', 'lounge'],
      morning: ['morning', 'sunrise', 'breakfast', 'fresh', 'wake up'],
      evening: ['evening', 'sunset', 'dinner', 'wind down', 'twilight']
    };
    
    // Speed/Energy detection
    const speedPatterns = {
      slow: ['slow', 'chill', 'relaxed', 'mellow', 'downtempo', 'peaceful'],
      medium: ['medium', 'moderate', 'steady', 'groove', 'normal'],
      fast: ['fast', 'upbeat', 'energetic', 'high tempo', 'uptempo', 'intense']
    };

    // Vibe/Valence detection
    const vibePatterns = {
      sad: ['sad', 'melancholy', 'depressing', 'emotional', 'crying', 'heartbreak', 'breakup', 'lonely'],
      happy: ['happy', 'joyful', 'cheerful', 'positive', 'uplifting', 'excited', 'celebration', 'party'],
      chill: ['chill', 'lofi', 'calm', 'peaceful', 'zen', 'ambient', 'relaxing', 'mellow'],
      energetic: ['energetic', 'hype', 'pump', 'motivational', 'power', 'intense', 'workout', 'gym'],
      romantic: ['romantic', 'love', 'heart', 'valentine', 'couple', 'intimate', 'wedding', 'date'],
      dark: ['dark', 'gothic', 'moody', 'atmospheric', 'mysterious', 'haunting', 'eerie'],
      nostalgic: ['nostalgic', 'memories', 'throwback', 'vintage', 'retro', 'old school'],
      spiritual: ['spiritual', 'meditation', 'devotional', 'prayer', 'sacred', 'religious']
    };
    
    let detectedEnvironment = '';
    let detectedSpeed = 'medium';
    let detectedVibe = '';
    
    // Detect patterns
    for (const [env, keywords] of Object.entries(environments)) {
      if (keywords.some(keyword => input.includes(keyword))) {
        detectedEnvironment = env;
        break;
      }
    }
    
    for (const [speed, keywords] of Object.entries(speedPatterns)) {
      if (keywords.some(keyword => input.includes(keyword))) {
        detectedSpeed = speed;
        break;
      }
    }
    
    for (const [vibe, keywords] of Object.entries(vibePatterns)) {
      if (keywords.some(keyword => input.includes(keyword))) {
        detectedVibe = vibe;
        break;
      }
    }
    
    // Map to Spotify audio features
    const energy = detectedSpeed === 'fast' ? 'high' : detectedSpeed === 'slow' ? 'low' : 'medium';
    const valence = ['sad', 'dark'].includes(detectedVibe) ? 'negative' : 
                   ['happy', 'energetic'].includes(detectedVibe) ? 'positive' : 'neutral';

    // Genre detection
    let genre = '';
    const genreKeywords = {
      'bollywood': ['bollywood', 'hindi', 'indian', 'desi', 'filmi', 'bhangra', 'punjabi'],
      'electronic': ['electronic', 'edm', 'house', 'techno', 'dubstep', 'dance'],
      'hip-hop': ['hip hop', 'rap', 'trap', 'hip-hop', 'gangsta', 'freestyle'],
      'rock': ['rock', 'metal', 'punk', 'alternative', 'grunge', 'hard rock'],
      'pop': ['pop', 'mainstream', 'chart', 'top hits', 'radio'],
      'jazz': ['jazz', 'swing', 'blues', 'smooth jazz', 'bebop'],
      'classical': ['classical', 'orchestra', 'symphony', 'opera', 'baroque'],
      'folk': ['folk', 'country', 'acoustic', 'bluegrass', 'americana'],
      'r&b': ['r&b', 'soul', 'funk', 'motown', 'neo soul'],
      'indie': ['indie', 'independent', 'underground', 'alternative'],
      'latin': ['latin', 'spanish', 'reggaeton', 'salsa', 'bachata', 'merengue'],
      'k-pop': ['k-pop', 'korean', 'kpop', 'korean pop'],
      'reggae': ['reggae', 'ska', 'dancehall', 'dub'],
      'world': ['world', 'ethnic', 'traditional', 'cultural'],
      'ambient': ['ambient', 'chillout', 'lounge', 'downtempo', 'atmospheric']
    };
    
    for (const [g, keywords] of Object.entries(genreKeywords)) {
      if (keywords.some(keyword => input.includes(keyword))) {
        genre = g;
        break;
      }
    }
    
    return {
      vibe: detectedVibe || vibeInput.split(' ')[0],
      environment: detectedEnvironment,
      speed: detectedSpeed,
      energy: energy as 'low' | 'medium' | 'high',
      valence: valence as 'negative' | 'neutral' | 'positive',
      genre
    };
  }

  private buildSearchQuery(vibeInput: string): string {
    const parsed = this.parseInput(vibeInput);
    
    let query = parsed.vibe || vibeInput;
    
    // Add genre if detected
    if (parsed.genre) {
      query += ` genre:${parsed.genre}`;
    }
    
    // Add year range for fresher music
    const currentYear = new Date().getFullYear();
    query += ` year:${currentYear - 5}-${currentYear}`;
    
    return query.trim();
  }

  private extractGenreFromInput(vibeInput: string): string {
    const parsed = this.parseInput(vibeInput);
    return parsed.genre || 'pop'; // Default to pop if no genre detected
  }

  private async getAudioFeatures(trackIds: string[]): Promise<SpotifyAudioFeatures[]> {
    if (trackIds.length === 0) return [];

    try {
      const token = await this.getAccessToken();
      const response = await fetch(
        `${this.baseUrl}/audio-features?ids=${trackIds.join(',')}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        console.error('Failed to get audio features:', response.status);
        return [];
      }

      const data = await response.json();
      return data.audio_features || [];
    } catch (error) {
      console.error('Error getting audio features:', error);
      return [];
    }
  }

  private calculateMoodScore(track: SpotifyTrack, searchContext: string): number {
    const parsed = this.parseInput(searchContext);
    let score = 0;

    if (!track.audioFeatures) {
      return score; // Base score if no audio features
    }

    const features = track.audioFeatures;

    // Energy matching
    const targetEnergy = parsed.energy === 'high' ? 0.8 : parsed.energy === 'low' ? 0.3 : 0.6;
    const energyDiff = Math.abs(features.energy - targetEnergy);
    score += Math.max(0, 5 - (energyDiff * 10)); // Max 5 points

    // Valence (happiness) matching
    const targetValence = parsed.valence === 'positive' ? 0.8 : 
                         parsed.valence === 'negative' ? 0.2 : 0.5;
    const valenceDiff = Math.abs(features.valence - targetValence);
    score += Math.max(0, 5 - (valenceDiff * 10)); // Max 5 points

    // Danceability for party/energetic contexts
    if (['party', 'dance', 'gym'].includes(parsed.environment) || 
        ['energetic', 'hype'].includes(parsed.vibe)) {
      score += features.danceability * 3; // Max 3 points
    }

    // Acousticness for calm/study contexts
    if (['study', 'sleep', 'cafe'].includes(parsed.environment) || 
        ['chill', 'calm'].includes(parsed.vibe)) {
      score += features.acousticness * 3; // Max 3 points
    }

    // Tempo matching based on speed
    const targetTempo = parsed.speed === 'fast' ? 140 : parsed.speed === 'slow' ? 80 : 120;
    const tempoDiff = Math.abs(features.tempo - targetTempo) / 50; // Normalize
    score += Math.max(0, 2 - tempoDiff); // Max 2 points

    return score;
  }

  private transformTrack(spotifyTrack: any, audioFeatures?: SpotifyAudioFeatures): SpotifyTrack {
    const artists = spotifyTrack.artists?.map((artist: any) => artist.name).join(', ') || 'Unknown Artist';
    const album = spotifyTrack.album?.name || 'Unknown Album';
    const thumbnail = spotifyTrack.album?.images?.[0]?.url || '';
    const genres = spotifyTrack.album?.genres || [];

    return {
      id: spotifyTrack.id,
      title: spotifyTrack.name || 'Unknown Title',
      artist: artists,
      album: album,
      duration: Math.floor((spotifyTrack.duration_ms || 0) / 1000),
      thumbnail: thumbnail,
      previewUrl: spotifyTrack.preview_url || '',
      spotifyUrl: spotifyTrack.external_urls?.spotify || '',
      popularity: spotifyTrack.popularity || 0,
      releaseDate: spotifyTrack.album?.release_date || '',
      genres: genres,
      audioFeatures: audioFeatures
    };
  }

  async searchMusic(vibeInput: string): Promise<SpotifyResponse> {
    try {
      const token = await this.getAccessToken();
      
      // Try multiple search strategies
      const searchQueries = [
        this.buildSearchQuery(vibeInput),
        vibeInput, // Original input
        this.extractGenreFromInput(vibeInput), // Just genre
        'chill music', // Generic fallback
        'popular music' // Final fallback
      ];

      let allTracks: any[] = [];
      
      for (const searchQuery of searchQueries) {
        if (allTracks.length >= 10) break; // We have enough tracks
        
        try {
          const searchUrl = new URL(`${this.baseUrl}/search`);
          searchUrl.searchParams.append('q', searchQuery);
          searchUrl.searchParams.append('type', 'track');
          searchUrl.searchParams.append('limit', '20');
          searchUrl.searchParams.append('market', 'US');

          const response = await fetch(searchUrl.toString(), {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const data = await response.json();
            if (data.tracks?.items && data.tracks.items.length > 0) {
              allTracks.push(...data.tracks.items);
              console.log(`Found ${data.tracks.items.length} tracks with query: "${searchQuery}"`);
            }
          }
        } catch (error) {
          console.log(`Query "${searchQuery}" failed, trying next...`);
          continue;
        }
      }
      
      if (allTracks.length === 0) {
        return { tracks: [], totalResults: 0 };
      }

      // Remove duplicates by track ID
      const uniqueTracks = allTracks.filter((track, index, arr) => 
        arr.findIndex(t => t.id === track.id) === index
      );
      
      // Sort tracks to prioritize those with preview URLs
      const sortedTracks = uniqueTracks.sort((a: any, b: any) => {
        const aHasPreview = !!(a.preview_url && a.preview_url.length > 0);
        const bHasPreview = !!(b.preview_url && b.preview_url.length > 0);
        if (aHasPreview && !bHasPreview) return -1;
        if (!aHasPreview && bHasPreview) return 1;
        return 0;
      });

      // Take up to 20 tracks for processing (less for performance)
      const tracksToProcess = sortedTracks.slice(0, 20);

      // Get audio features for all tracks
      const trackIds = tracksToProcess.map((track: any) => track.id);
      const audioFeatures = await this.getAudioFeatures(trackIds);

      // Transform tracks with audio features
      const transformedTracks = tracksToProcess.map((track: any, index: number) => 
        this.transformTrack(track, audioFeatures[index])
      );

      // Score tracks based on mood matching
      const scoredTracks: ScoredTrack[] = transformedTracks.map((track: any) => ({
        ...track,
        score: this.calculateMoodScore(track, vibeInput) + (track.popularity / 10) // Add popularity bonus
      }));

      // Sort by score and return top 10
      scoredTracks.sort((a, b) => b.score - a.score);
      const topTracks = scoredTracks.slice(0, 10).map(track => {
        const { score, ...trackWithoutScore } = track;
        return trackWithoutScore;
      });

      return {
        tracks: topTracks,
        totalResults: topTracks.length
      };

    } catch (error) {
      console.error('Spotify search error:', error);
      
      // Return fallback popular tracks if Spotify fails
      return this.getFallbackTracks(vibeInput);
    }
  }

  private getFallbackTracks(vibeInput: string): SpotifyResponse {
    // Return some mock popular tracks as fallback
    const fallbackTracks: SpotifyTrack[] = [
      {
        id: 'fallback-1',
        title: 'Blinding Lights',
        artist: 'The Weeknd',
        album: 'After Hours',
        duration: 200,
        thumbnail: 'https://i.scdn.co/image/ab67616d0000b273c06f0ac8bb8bd7edefd64086',
        previewUrl: '',
        spotifyUrl: 'https://open.spotify.com/track/0VjIjW4GlULA8kw2ZrLsAO',
        popularity: 95,
        releaseDate: '2020-03-20',
        genres: ['pop', 'synthpop']
      },
      {
        id: 'fallback-2',
        title: 'Good 4 U',
        artist: 'Olivia Rodrigo',
        album: 'SOUR',
        duration: 178,
        thumbnail: 'https://i.scdn.co/image/ab67616d0000b273a91c10fe9472d9bd89802e5a',
        previewUrl: '',
        spotifyUrl: 'https://open.spotify.com/track/4iJyoBOLtHqaGxP12qzhQI',
        popularity: 92,
        releaseDate: '2021-05-14',
        genres: ['pop', 'pop rock']
      },
      {
        id: 'fallback-3',
        title: 'Levitating',
        artist: 'Dua Lipa',
        album: 'Future Nostalgia',
        duration: 203,
        thumbnail: 'https://i.scdn.co/image/ab67616d0000b273c06f0ac8bb8bd7edefd64086',
        previewUrl: '',
        spotifyUrl: 'https://open.spotify.com/track/463CkQjx2Zk1yXoBuierM9',
        popularity: 90,
        releaseDate: '2020-03-27',
        genres: ['pop', 'dance pop']
      },
      {
        id: 'fallback-4',
        title: 'Stay',
        artist: 'The Kid LAROI, Justin Bieber',
        album: 'F*CK LOVE 3: OVER YOU',
        duration: 141,
        thumbnail: 'https://i.scdn.co/image/ab67616d0000b273c06f0ac8bb8bd7edefd64086',
        previewUrl: '',
        spotifyUrl: 'https://open.spotify.com/track/5PjdY0CKGZdEuoNab3yDmX',
        popularity: 88,
        releaseDate: '2021-07-09',
        genres: ['pop', 'hip hop']
      },
      {
        id: 'fallback-5',
        title: 'Heat Waves',
        artist: 'Glass Animals',
        album: 'Dreamland',
        duration: 238,
        thumbnail: 'https://i.scdn.co/image/ab67616d0000b273c06f0ac8bb8bd7edefd64086',
        previewUrl: '',
        spotifyUrl: 'https://open.spotify.com/track/02MWAaffLxlfxAUY7c5dvx',
        popularity: 87,
        releaseDate: '2020-08-07',
        genres: ['indie', 'alternative']
      }
    ];

    console.log(`Using fallback tracks for query: "${vibeInput}"`);
    return {
      tracks: fallbackTracks,
      totalResults: fallbackTracks.length
    };
  }

  async getTrackDetails(trackId: string): Promise<SpotifyTrack | null> {
    try {
      const token = await this.getAccessToken();
      
      // Get track details and audio features in parallel
      const [trackResponse, audioFeaturesResponse] = await Promise.all([
        fetch(`${this.baseUrl}/tracks/${trackId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch(`${this.baseUrl}/audio-features/${trackId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
      ]);

      if (!trackResponse.ok) {
        return null;
      }

      const trackData = await trackResponse.json();
      const audioFeatures = audioFeaturesResponse.ok ? await audioFeaturesResponse.json() : null;

      return this.transformTrack(trackData, audioFeatures);
    } catch (error) {
      console.error('Error getting track details:', error);
      return null;
    }
  }

  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }
}

export default SpotifyService;