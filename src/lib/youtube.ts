import { google, youtube_v3 } from 'googleapis';

interface YouTubeTrack {
  videoId: string;
  title: string;
  channelTitle: string;
  duration: number;
  thumbnail: string;
  publishedAt: string;
  viewCount: number;
}

interface FilteredYouTubeResponse {
  tracks: YouTubeTrack[];
  totalResults: number;
}

interface ParsedInput {
  vibe: string;
  environment: string;
  speed: string;
  isAnime: boolean;
  genre?: string;
}

interface ScoredTrack extends YouTubeTrack {
  score: number;
}

class YouTubeService {
  private youtube: youtube_v3.Youtube;

  constructor() {
    this.youtube = google.youtube({
      version: 'v3',
      auth: process.env.YOUTUBE_API_KEY,
    });
  }

  private parseISO8601Duration(duration: string): number {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1]?.replace('H', '') || '0');
    const minutes = parseInt(match[2]?.replace('M', '') || '0');
    const seconds = parseInt(match[3]?.replace('S', '') || '0');

    return hours * 3600 + minutes * 60 + seconds;
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
    
    // Vibe/Genre detection
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
    
    // Enhanced anime detection
    const animeKeywords = [
      'anime', 'naruto', 'bleach', 'one piece', 'dragon ball', 'attack on titan',
      'demon slayer', 'my hero academia', 'death note', 'tokyo ghoul', 'fullmetal',
      'cowboy bebop', 'evangelion', 'jojo', 'hunter x hunter', 'fairy tail',
      'sword art online', 'japanese', 'ost', 'soundtrack', 'opening', 'ending',
      'op', 'ed', 'theme song', 'shippuden', 'boruto', 'chakra', 'ninja',
      'sasuke', 'sakura', 'kakashi', 'itachi', 'madara', 'hokage'
    ];
    
    // Night/rain detection for special handling
    const nightRainKeywords = ['night', 'rain', 'rainy', 'midnight', 'evening', 'storm', 'thunderstorm'];
    let isNightRain = nightRainKeywords.some(keyword => input.includes(keyword));
    
    let isAnime = animeKeywords.some(keyword => input.includes(keyword));
    let genre = '';
    
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
    if (input.includes('lofi') || (detectedVibe === 'chill' && detectedEnvironment === 'study')) {
      genre = 'lofi';
    } else if (input.includes('edm') || input.includes('electronic')) {
      genre = 'EDM';
    } else if (isAnime) {
      genre = 'anime';
    }
    
    return {
      vibe: detectedVibe || vibeInput.split(' ')[0],
      environment: detectedEnvironment,
      speed: detectedSpeed,
      isAnime,
      genre
    };
  }
  
  private generateSearchQuery(vibeInput: string, isRetry: boolean = false): string {
    const parsed = this.parseInput(vibeInput);
    
    // Build base query
    let baseQuery = '';
    
    if (parsed.isAnime) {
      // For anime searches, use the original input to preserve anime names
      baseQuery = `${vibeInput} OST soundtrack opening ending theme music`;
      // Add specific anime music terms
      const animeTerms = ['opening', 'ending', 'OST', 'theme', 'bgm', 'background music'];
      const randomAnimeTerm = animeTerms[Math.floor(Math.random() * animeTerms.length)];
      baseQuery += ` ${randomAnimeTerm}`;
    } else if (vibeInput.includes('night') || vibeInput.includes('rain')) {
      // Special handling for night/rain searches - target lo-fi channels
      baseQuery = `${vibeInput} lofi chill ambient rain sounds`;
    } else {
      // Format: '{vibe} {environment} {speed} music' or '{vibe} songs {environment} {speed}'
      const musicType = Math.random() > 0.5 ? 'music' : 'songs';
      baseQuery = `${parsed.vibe} ${musicType}`;
      if (parsed.environment) baseQuery += ` ${parsed.environment}`;
      if (parsed.speed) baseQuery += ` ${parsed.speed}`;
    }
    
    // Add genre hints
    if (parsed.genre) {
      baseQuery += ` ${parsed.genre}`;
    }
    
    // Exclusions (less strict on retry)
    const exclusions = isRetry ? 
      ['-tutorial', '-review', '-reaction'] : // Very minimal exclusions on retry
      ['-tutorial', '-review', '-reaction', '-interview', '-vlog', 
       '-news', '-documentary', '-podcast', '-talk', '-lecture'];
    
    return `${baseQuery} ${exclusions.join(' ')}`;
  }

  private isValidMusicVideo(video: youtube_v3.Schema$SearchResult, duration: number, viewCount: number, searchContext: string, isRetry: boolean = false): boolean {
    const title = video.snippet?.title?.toLowerCase() || '';
    const channelTitle = video.snippet?.channelTitle?.toLowerCase() || '';

    console.log(`Checking video: ${title} | Duration: ${duration}s | Views: ${viewCount}`);

    // Enhanced duration filter - NO shorts (under 60 seconds) and no very long videos
    if (duration < 60) {
      console.log(`Filtered out: Too short (${duration}s)`);
      return false;
    }

    // Stricter duration limits - reject very long content (over 10 minutes unless it's a playlist/mix)
    const isPlaylistOrMix = title.includes('playlist') || title.includes('mix') || title.includes('compilation');
    if (duration > 600 && !isPlaylistOrMix) { // 10 minutes
      console.log(`Filtered out: Too long (${Math.round(duration / 60)}m) for single track`);
      return false;
    }

    // Even stricter for very long content (over 30 minutes)
    if (duration > 1800) { // 30 minutes
      console.log(`Filtered out: Too long (${Math.round(duration / 60)}m) even for playlists`);
      return false;
    }

    // Very basic view count
    if (viewCount < 100) {
      console.log(`Filtered out: Too few views (${viewCount})`);
      return false;
    }

    // Enhanced exclusions for problematic content
    const badKeywords = [
      'tutorial', 'lesson', 'how to', 'reaction', 'review', 'podcast', 
      'interview', 'live stream', 'full album', 'audiobook', 'lecture'
    ];
    const hasBadKeyword = badKeywords.some(keyword => title.includes(keyword));
    if (hasBadKeyword) {
      console.log(`Filtered out: Contains bad keyword`);
      return false;
    }

    console.log(`✅ Video passed filters: ${title}`);
    return true;
  }

  private calculateTitleRelevance(title: string, searchKeywords: string[]): number {
    const titleLower = title.toLowerCase();
    const titleWords = titleLower.split(/[\s\-_]+/);
    let relevanceScore = 0;
    let totalKeywords = searchKeywords.length;

    // STRICT: Check how many search keywords appear in the title
    searchKeywords.forEach(keyword => {
      if (keyword.length > 2) { // Only check meaningful keywords
        if (titleWords.some(word => word.includes(keyword) || keyword.includes(word))) {
          relevanceScore += 1;
        }
      }
    });

    // AESTHETIC THEME MATCHING (highly selective)
    const themeMatches = {
      night: ['night', 'midnight', '3am', 'late night', 'nocturne', 'moonlight', 'stars', 'dark', 'shadow'],
      sad: ['sad', 'melancholy', 'melancholic', 'sorrow', 'tears', 'crying', 'heartbreak', 'lonely', 'blues'],
      lofi: ['lofi', 'lo-fi', 'chill', 'study', 'relaxing', 'ambient', 'downtempo', 'mellow', 'soft'],
      jazz: ['jazz', 'smooth', 'saxophone', 'piano', 'bebop', 'swing', 'blues', 'soul'],
      movie: ['soundtrack', 'ost', 'theme', 'score', 'cinematic', 'epic', 'orchestral', 'film'],
      slow: ['slow', 'ballad', 'peaceful', 'calm', 'gentle', 'quiet', 'soft']
    };

    // For each search keyword, check if title contains aesthetic matches
    searchKeywords.forEach(keyword => {
      Object.entries(themeMatches).forEach(([theme, aesthetics]) => {
        if (keyword.includes(theme.toLowerCase()) || theme.toLowerCase().includes(keyword)) {
          const aestheticMatch = aesthetics.some(aesthetic => titleLower.includes(aesthetic));
          if (aestheticMatch) {
            relevanceScore += 2; // Moderate bonus for aesthetic matching
          }
        }
      });
    });

    // Special handling for anime searches
    const animeKeywords = ['naruto', 'anime', 'ost', 'opening', 'ending', 'bleach', 'dragon ball'];
    if (animeKeywords.some(kw => searchKeywords.includes(kw))) {
      if (animeKeywords.some(kw => titleLower.includes(kw))) {
        relevanceScore += 3;
      }
    }

    // Light penalty for compilation words
    const compilationWords = ['compilation', 'best of', 'collection', 'mix tape', 'various artists'];
    if (compilationWords.some(word => titleLower.includes(word))) {
      relevanceScore -= 2; // Light penalty
    }

    return Math.max(0, relevanceScore) / Math.max(totalKeywords, 1);
  }

  private getChannelScore(channelTitle: string, searchContext?: string): number {
    const channelLower = channelTitle.toLowerCase();
    const context = searchContext?.toLowerCase() || '';
    let score = 0;
    
    // PRIORITY ANIME CHANNELS (+12 points for specific channels)
    const priorityAnimeChannels = ['animevibe', 'lo-fi senpai', 'lofi senpai'];
    if (priorityAnimeChannels.some(channel => channelLower.includes(channel))) {
      score += 12;
    }
    
    // NIGHT/RAIN SPECIFIC CHANNELS (+10 points when context matches)
    const nightRainChannels = ['lo-fi senpai', 'lofi senpai', 'chilled cow', 'lofigirl', 'ambient', 'rain sounds'];
    if ((context.includes('night') || context.includes('rain') || context.includes('anime')) && 
        nightRainChannels.some(channel => channelLower.includes(channel))) {
      score += 10;
    }
    
    // Music labels (+10 points)
    const musicLabels = ['universal', 'sony', 'warner', 'columbia', 'atlantic', 'capitol', 'rca', 'interscope'];
    if (musicLabels.some(label => channelLower.includes(label))) {
      score += 10;
    }
    
    // Official artist channels (+8 points)
    if (channelLower.includes('official') || channelLower.includes('vevo')) {
      score += 8;
    }
    
    // Enhanced anime music channels (+9 points)
    const animeChannels = [
      'animevibe', 'crunchyroll', 'funimation', 'anime music', 'ost', 
      'lo-fi senpai', 'lofi senpai', 'anime songs', 'naruto music', 'bleach music'
    ];
    if (animeChannels.some(anime => channelLower.includes(anime))) {
      score += 9;
    }
    
    // Curated music channels (+6 points)
    const curatedChannels = ['chillmusic', 'lofigirl', 'chilled cow', 'ambient', 'relaxing', 'chill hop', 'study music'];
    if (curatedChannels.some(channel => channelLower.includes(channel))) {
      score += 6;
    }
    
    // YouTube official music channels
    if (channelLower.includes('topic') || channelLower.endsWith(' - topic')) {
      score += 8;
    }
    
    // Enhanced whitelist with specific channels
    const whitelistedChannels = [
      'trap nation', 'monstercat', 'proximity', 'mr suicidesheep', 'cloudkid',
      'tribal trap', 'chill nation', 'wave music', 'selected', 'magic music',
      'animevibe', 'lo-fi senpai', 'lofi senpai', 'anime vibe'
    ];
    if (whitelistedChannels.some(channel => channelLower.includes(channel))) {
      score += 7;
    }
    
    // Movie soundtrack detection
    const movieKeywords = ['marvel', 'disney', 'dc', 'netflix', 'hbo', 'paramount', '20th century', 'pixar'];
    if (movieKeywords.some(keyword => context.includes(keyword)) && 
        (channelLower.includes('official') || musicLabels.some(label => channelLower.includes(label)))) {
      score += 8;
    }
    
    // Blacklist problematic channels (heavy penalty)
    const blacklistedChannels = [
      'reaction', 'react', 'first time', 'listening to', 'tutorial', 'lesson',
      'cover', 'remix', 'mashup', 'nightcore', 'slowed', 'reverb'
    ];
    if (blacklistedChannels.some(channel => channelLower.includes(channel))) {
      score -= 15;
    }
    
    return score;
  }
  
  private getTitleScore(title: string, searchContext: string = ''): number {
    const titleLower = title.toLowerCase();
    const context = searchContext.toLowerCase();
    let score = 0;
    
    // Music keywords (+5 each)
    const musicKeywords = ['song', 'track', 'music', 'audio', 'hit', 'single', 'anthem'];
    musicKeywords.forEach(keyword => {
      if (titleLower.includes(keyword)) score += 5;
    });
    
    // MODERATE EXCLUSIONS - Balanced penalties
    const excludedContent = [
      'tutorial', 'lesson', 'review', 'reaction', 'interview', 'vlog',
      'gameplay', 'how to', 'explained', 'analysis', 'breakdown'
    ];
    excludedContent.forEach(keyword => {
      if (titleLower.includes(keyword)) score -= 15; // Moderate penalty
    });
    
    // Light penalties for less ideal content
    const lightExclusions = [
      'compilation', 'best of', 'collection', 'mixtape', 'greatest hits',
      'live performance', 'concert', 'acoustic version', 'radio edit'
    ];
    lightExclusions.forEach(keyword => {
      if (titleLower.includes(keyword)) score -= 8; // Light penalty
    });
    
    // AESTHETIC MATCHING - Context-based scoring (bonus, not requirement)
    if (context.includes('night')) {
      const nightAesthetics = [
        'night', 'midnight', '3am', 'late night', 'nocturne', 'moonlight',
        'stars', 'dark', 'shadow', 'twilight', 'evening', 'dusk'
      ];
      nightAesthetics.forEach(aesthetic => {
        if (titleLower.includes(aesthetic)) score += 10; // Bonus, not requirement
      });
    }
    
    if (context.includes('sad') || context.includes('melancholy')) {
      const sadAesthetics = [
        'sad', 'melancholy', 'melancholic', 'sorrow', 'tears', 'crying',
        'heartbreak', 'lonely', 'solitude', 'grief', 'pain', 'blues'
      ];
      sadAesthetics.forEach(aesthetic => {
        if (titleLower.includes(aesthetic)) score += 8; // Reduced bonus
      });
    }
    
    if (context.includes('lofi')) {
      const lofiAesthetics = [
        'lofi', 'lo-fi', 'chill', 'study', 'relaxing', 'ambient',
        'downtempo', 'mellow', 'soft', 'calm', 'peaceful'
      ];
      lofiAesthetics.forEach(aesthetic => {
        if (titleLower.includes(aesthetic)) score += 8;
      });
    }
    
    if (context.includes('jazz')) {
      const jazzAesthetics = [
        'jazz', 'smooth', 'saxophone', 'piano', 'bebop', 'swing',
        'blues', 'soul', 'smooth jazz', 'neo soul'
      ];
      jazzAesthetics.forEach(aesthetic => {
        if (titleLower.includes(aesthetic)) score += 8;
      });
    }
    
    if (context.includes('movie') || context.includes('film')) {
      const movieAesthetics = [
        'soundtrack', 'ost', 'theme', 'score', 'cinematic', 'epic',
        'orchestral', 'film music', 'movie music'
      ];
      movieAesthetics.forEach(aesthetic => {
        if (titleLower.includes(aesthetic)) score += 8;
      });
    }
    
    return score;
  }
  
  private getRecencyBonus(publishedAt: string): number {
    const publishDate = new Date(publishedAt);
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    return publishDate > oneYearAgo ? 2 : 0;
  }
  
  private getDurationScore(duration: number): number {
    // Prefer standard song length (2-6 minutes) - higher score
    if (duration >= 120 && duration <= 360) return 4;
    // Good song length (3-4 minutes) - optimal score
    if (duration >= 180 && duration <= 240) return 5;
    // Acceptable short mixes (10-20 minutes) - reduced score
    if (duration >= 600 && duration <= 1200) return 2;
    // Longer content (20-30 minutes) - lower score
    if (duration >= 1200 && duration <= 1800) return 1;
    // Very short tracks (1-2 minutes) - minimal score
    if (duration >= 60 && duration <= 120) return 1;
    return 0;
  }

  private async performSearch(vibeInput: string, isRetry: boolean = false): Promise<FilteredYouTubeResponse> {
    const searchQuery = this.generateSearchQuery(vibeInput, isRetry);
    const searchContext = vibeInput; // Store original input for context scoring

    const searchResponse = await this.youtube.search.list({
      part: ['snippet'],
      q: searchQuery,
      type: ['video'],
      maxResults: 50,
      order: 'relevance',
      videoDefinition: 'high',
      videoDuration: 'any',
      regionCode: 'US',
      relevanceLanguage: 'en',
    });

    if (!searchResponse.data.items) {
      return { tracks: [], totalResults: 0 };
    }

    // Get video IDs for content details
    const videoIds = searchResponse.data.items
      .map(item => item.id?.videoId)
      .filter(Boolean) as string[];

    if (videoIds.length === 0) {
      return { tracks: [], totalResults: 0 };
    }

    // Get video details including duration and statistics
    const videosResponse = await this.youtube.videos.list({
      part: ['contentDetails', 'statistics'],
      id: videoIds,
    });

    if (!videosResponse.data.items) {
      return { tracks: [], totalResults: 0 };
    }

    // Combine search results with video details and scoring
    const scoredTracks: ScoredTrack[] = [];

    for (let i = 0; i < searchResponse.data.items.length; i++) {
      const searchItem = searchResponse.data.items[i];
      const videoItem = videosResponse.data.items.find(
        item => item.id === searchItem.id?.videoId
      );

      if (!searchItem.id?.videoId || !videoItem?.contentDetails?.duration) {
        continue;
      }

      const duration = this.parseISO8601Duration(videoItem.contentDetails.duration);
      const viewCount = parseInt(videoItem.statistics?.viewCount || '0');
      
      // Apply filtering logic with search context
      if (!this.isValidMusicVideo(searchItem, duration, viewCount, searchContext, isRetry)) {
        continue;
      }

      // Calculate comprehensive score with search context
      const channelScore = this.getChannelScore(searchItem.snippet?.channelTitle || '', searchContext);
      const titleScore = this.getTitleScore(searchItem.snippet?.title || '', searchContext);
      const durationScore = this.getDurationScore(duration);
      const recencyBonus = this.getRecencyBonus(searchItem.snippet?.publishedAt || '');
      const viewScore = Math.min(Math.log10(viewCount) - 3, 5); // Log scale, max 5 points

      const totalScore = channelScore + titleScore + durationScore + recencyBonus + viewScore;

      const track: ScoredTrack = {
        videoId: searchItem.id.videoId,
        title: searchItem.snippet?.title || 'Unknown Title',
        channelTitle: searchItem.snippet?.channelTitle || 'Unknown Channel',
        duration,
        thumbnail: searchItem.snippet?.thumbnails?.high?.url || 
                  searchItem.snippet?.thumbnails?.medium?.url || 
                  searchItem.snippet?.thumbnails?.default?.url || '',
        publishedAt: searchItem.snippet?.publishedAt || new Date().toISOString(),
        viewCount,
        score: totalScore
      };

      scoredTracks.push(track);
    }

    // Sort by score (highest first)
    scoredTracks.sort((a, b) => b.score - a.score);

    // Return top 10 results without score property
    const topTracks: YouTubeTrack[] = scoredTracks.slice(0, 10).map(track => {
      const { score, ...trackWithoutScore } = track;
      return trackWithoutScore;
    });

    return {
      tracks: topTracks,
      totalResults: topTracks.length,
    };
  }

  async searchMusic(vibeInput: string): Promise<FilteredYouTubeResponse> {
    try {
      // Initial search
      let result = await this.performSearch(vibeInput, false);
      
      // Fallback strategy if <5 results
      if (result.tracks.length < 5) {
        console.log('Low results, trying fallback strategy...');
        
        // Try with broader terms
        result = await this.performSearch(vibeInput, true);
        
        // If still low, try with playlist/mix variations
        if (result.tracks.length < 5) {
          const playlistQuery = `${vibeInput} playlist mix`;
          const playlistResult = await this.performSearch(playlistQuery, true);
          
          // Combine results
          const combinedTracks = [...result.tracks, ...playlistResult.tracks];
          // Remove duplicates based on videoId
          const uniqueTracks = combinedTracks.filter((track, index, arr) => 
            arr.findIndex(t => t.videoId === track.videoId) === index
          );
          
          result = {
            tracks: uniqueTracks.slice(0, 10),
            totalResults: uniqueTracks.length
          };
        }
      }

      return result;

    } catch (error) {
      console.error('YouTube API Error:', error);
      throw new Error('Failed to search YouTube videos');
    }
  }
}

export default YouTubeService;