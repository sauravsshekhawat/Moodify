import YouTubeService from './youtube';
import SoundCloudService from './soundcloud';
import SpotifyService from './spotify';

export type MusicProvider = 'youtube' | 'soundcloud' | 'spotify';

export interface UnifiedTrack {
  id: string;
  title: string;
  artist: string;
  duration: number;
  thumbnail: string;
  publishedAt: string;
  popularity: number;
  provider: MusicProvider;
  streamUrl?: string;
  genre?: string;
  permalink?: string;
  waveformUrl?: string;
}

export interface UnifiedSearchResponse {
  tracks: UnifiedTrack[];
  totalResults: number;
  providers: MusicProvider[];
  searchTime: number;
}

export interface ProviderConfig {
  enabled: boolean;
  priority: number;
  timeout: number;
}

export interface SearchConfig {
  providers: {
    youtube: ProviderConfig;
    soundcloud: ProviderConfig;
    spotify: ProviderConfig;
  };
  maxResults: number;
  fallbackEnabled: boolean;
}

class UnifiedMusicService {
  private youtubeService: YouTubeService;
  private soundcloudService: SoundCloudService;
  private spotifyService: SpotifyService;
  private defaultConfig: SearchConfig;

  constructor() {
    this.youtubeService = new YouTubeService();
    this.soundcloudService = new SoundCloudService();
    this.spotifyService = new SpotifyService();
    
    this.defaultConfig = {
      providers: {
        spotify: { enabled: true, priority: 1, timeout: 8000 }, // Spotify first (best metadata)
        youtube: { enabled: true, priority: 2, timeout: 15000 }, // YouTube second (largest catalog)
        soundcloud: { enabled: false, priority: 3, timeout: 10000 }, // Disable SoundCloud for cleaner experience
      },
      maxResults: 10,
      fallbackEnabled: true,
    };
  }

  private transformYouTubeTrack(track: any): UnifiedTrack {
    return {
      id: track.videoId,
      title: track.title,
      artist: track.channelTitle,
      duration: track.duration,
      thumbnail: track.thumbnail,
      publishedAt: track.publishedAt,
      popularity: track.viewCount,
      provider: 'youtube',
      streamUrl: `/api/youtube/stream/${track.videoId}`,
    };
  }

  private transformSoundCloudTrack(track: any): UnifiedTrack {
    return {
      id: track.id,
      title: track.title,
      artist: track.artist,
      duration: track.duration,
      thumbnail: track.thumbnail,
      publishedAt: track.publishedAt,
      popularity: track.playCount,
      provider: 'soundcloud',
      streamUrl: `/api/soundcloud/stream/${track.id}`,
      genre: track.genre,
      permalink: track.permalink,
      waveformUrl: track.waveformUrl,
    };
  }

  private transformSpotifyTrack(track: any): UnifiedTrack {
    return {
      id: track.id,
      title: track.title,
      artist: track.artist,
      duration: track.duration,
      thumbnail: track.thumbnail,
      publishedAt: track.releaseDate,
      popularity: track.popularity,
      provider: 'spotify',
      streamUrl: track.previewUrl, // 30-second preview
      genre: track.genres?.[0],
      permalink: track.spotifyUrl,
    };
  }

  private async searchProvider(
    provider: MusicProvider, 
    vibeInput: string, 
    timeout: number
  ): Promise<UnifiedTrack[]> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`${provider} search timeout`)), timeout);
    });

    try {
      let searchPromise: Promise<any>;

      switch (provider) {
        case 'youtube':
          searchPromise = this.youtubeService.searchMusic(vibeInput);
          break;
        case 'soundcloud':
          searchPromise = this.soundcloudService.searchMusic(vibeInput);
          break;
        case 'spotify':
          searchPromise = this.spotifyService.searchMusic(vibeInput);
          break;
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }

      const result = await Promise.race([searchPromise, timeoutPromise]);
      
      if (!result || !result.tracks) {
        return [];
      }

      // Transform tracks based on provider
      switch (provider) {
        case 'youtube':
          return result.tracks.map(this.transformYouTubeTrack);
        case 'soundcloud':
          return result.tracks.map(this.transformSoundCloudTrack);
        case 'spotify':
          return result.tracks.map(this.transformSpotifyTrack);
        default:
          return [];
      }

    } catch (error) {
      console.error(`${provider} search failed:`, error);
      return [];
    }
  }

  private scoreTrack(track: UnifiedTrack, searchContext: string): number {
    const context = searchContext.toLowerCase();
    const title = track.title.toLowerCase();
    let score = 0;

    // Base score from popularity (normalized)
    const maxPopularity = track.provider === 'youtube' ? 10000000 : 1000000; // Different scales
    score += Math.min(Math.log10(track.popularity + 1) / Math.log10(maxPopularity), 1) * 10;

    // Provider preference scoring
    switch (track.provider) {
      case 'spotify':
        score += 8; // Prefer Spotify for best metadata and discovery
        break;
      case 'soundcloud':
        score += 5; // SoundCloud for audio quality and independent artists
        break;
      case 'youtube':
        score += 3; // YouTube has good catalog but varying quality
        break;
      default:
        score += 1;
    }

    // Title relevance
    const searchWords = context.split(/\s+/).filter(word => word.length > 2);
    searchWords.forEach(word => {
      if (title.includes(word)) {
        score += 3;
      }
    });

    // Duration preference (3-6 minutes ideal for most music)
    const durationMin = track.duration / 60;
    if (durationMin >= 3 && durationMin <= 6) {
      score += 3;
    } else if (durationMin >= 2 && durationMin <= 8) {
      score += 2;
    } else if (durationMin > 10) {
      score -= 2; // Penalty for very long tracks
    }

    // Genre matching (if available)
    if (track.genre) {
      const genre = track.genre.toLowerCase();
      if (context.includes(genre)) {
        score += 4;
      }
    }

    // Recency bonus
    const publishedDate = new Date(track.publishedAt);
    const monthsAgo = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (monthsAgo < 12) {
      score += 2; // Bonus for tracks published in last year
    }

    return score;
  }

  private mergeAndRankResults(
    allTracks: UnifiedTrack[], 
    searchContext: string, 
    maxResults: number
  ): UnifiedTrack[] {
    // Remove duplicates (same title + artist combination)
    const uniqueTracks = allTracks.filter((track, index, arr) => {
      const key = `${track.title.toLowerCase()}-${track.artist.toLowerCase()}`;
      return arr.findIndex(t => 
        `${t.title.toLowerCase()}-${t.artist.toLowerCase()}` === key
      ) === index;
    });

    // Score and sort tracks
    const scoredTracks = uniqueTracks.map(track => ({
      track,
      score: this.scoreTrack(track, searchContext)
    }));

    scoredTracks.sort((a, b) => b.score - a.score);

    return scoredTracks.slice(0, maxResults).map(item => item.track);
  }

  async searchMusic(
    vibeInput: string, 
    config: Partial<SearchConfig> = {}
  ): Promise<UnifiedSearchResponse> {
    const startTime = Date.now();
    const searchConfig = { ...this.defaultConfig, ...config };
    
    // Get enabled providers sorted by priority
    const enabledProviders = Object.entries(searchConfig.providers)
      .filter(([_, providerConfig]) => providerConfig.enabled)
      .sort((a, b) => a[1].priority - b[1].priority)
      .map(([provider]) => provider as MusicProvider);

    if (enabledProviders.length === 0) {
      throw new Error('No music providers enabled');
    }

    const allTracks: UnifiedTrack[] = [];
    const usedProviders: MusicProvider[] = [];

    // Primary search strategy - try providers in priority order
    for (const provider of enabledProviders) {
      const providerConfig = searchConfig.providers[provider];
      
      console.log(`Searching ${provider} for: "${vibeInput}"`);
      
      try {
        const tracks = await this.searchProvider(provider, vibeInput, providerConfig.timeout);
        
        if (tracks.length > 0) {
          allTracks.push(...tracks);
          usedProviders.push(provider);
          
          // If we have enough results and fallback is disabled, stop here
          if (allTracks.length >= searchConfig.maxResults && !searchConfig.fallbackEnabled) {
            break;
          }
        }
      } catch (error) {
        console.error(`Provider ${provider} failed:`, error);
        
        // If this was our only provider and fallback is disabled, throw error
        if (enabledProviders.length === 1 && !searchConfig.fallbackEnabled) {
          throw error;
        }
        
        // Otherwise continue to next provider
        continue;
      }
    }

    // If we still don't have enough results, try parallel search as fallback
    if (allTracks.length < 3 && searchConfig.fallbackEnabled && enabledProviders.length > 1) {
      console.log('Running parallel fallback search...');
      
      const parallelResults = await Promise.allSettled(
        enabledProviders.map(provider => 
          this.searchProvider(
            provider, 
            vibeInput, 
            searchConfig.providers[provider].timeout
          )
        )
      );

      parallelResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.length > 0) {
          const provider = enabledProviders[index];
          if (!usedProviders.includes(provider)) {
            allTracks.push(...result.value);
            usedProviders.push(provider);
          }
        }
      });
    }

    // Merge, deduplicate, and rank results
    const rankedTracks = this.mergeAndRankResults(
      allTracks, 
      vibeInput, 
      searchConfig.maxResults
    );

    const searchTime = Date.now() - startTime;

    return {
      tracks: rankedTracks,
      totalResults: rankedTracks.length,
      providers: usedProviders,
      searchTime,
    };
  }

  // Get available providers and their status
  getProviderStatus(): Record<MusicProvider, { available: boolean; configured: boolean }> {
    return {
      youtube: {
        available: true,
        configured: !!process.env.YOUTUBE_API_KEY,
      },
      soundcloud: {
        available: true,
        configured: !!process.env.SOUNDCLOUD_CLIENT_ID,
      },
      spotify: {
        available: true, // Now implemented
        configured: this.spotifyService.isConfigured(),
      },
    };
  }

  // Search with automatic provider selection
  async smartSearch(vibeInput: string): Promise<UnifiedSearchResponse> {
    const providerStatus = this.getProviderStatus();
    
    // Build dynamic config based on what's available
    const smartConfig: Partial<SearchConfig> = {
      providers: {
        soundcloud: {
          enabled: providerStatus.soundcloud.configured,
          priority: 1,
          timeout: 10000,
        },
        youtube: {
          enabled: providerStatus.youtube.configured,
          priority: providerStatus.soundcloud.configured ? 2 : 1,
          timeout: 15000,
        },
        spotify: {
          enabled: true, // Now enabled with fallback
          priority: 1, // Highest priority
          timeout: 8000,
        },
      },
      fallbackEnabled: true,
    };

    return this.searchMusic(vibeInput, smartConfig);
  }
}

export default UnifiedMusicService;