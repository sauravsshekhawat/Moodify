import { NextRequest, NextResponse } from 'next/server';
import UnifiedMusicService from '@/lib/unified-music';
import { createClient } from '@supabase/supabase-js';

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20, // 20 requests per minute (higher since we're using multiple providers)
};

function getRateLimitKey(request: NextRequest): string {
  // Use IP address for rate limiting
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0] || request.headers.get('x-real-ip') || 'unknown';
  return `unified_music_search_${ip}`;
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    // Reset or create new record
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + RATE_LIMIT.windowMs,
    });
    return false;
  }

  if (record.count >= RATE_LIMIT.maxRequests) {
    return true;
  }

  record.count++;
  rateLimitStore.set(key, record);
  return false;
}

async function saveTracksToDatabase(tracks: any[]) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const tracksToInsert = tracks.map(track => ({
      external_id: track.id,
      title: track.title,
      artist: track.artist,
      duration_ms: track.duration * 1000, // Convert seconds to milliseconds
      thumbnail_url: track.thumbnail,
      stream_url: track.streamUrl,
      provider: track.provider,
      audio_features: {
        genre: track.genre || null,
        waveform_url: track.waveformUrl || null,
      },
      mood_scores: {},
      popularity_score: Math.min(
        track.provider === 'youtube' ? track.popularity / 1000000 : track.popularity / 100000, 
        10
      ), // Normalize to 0-10 scale
      explicit: false,
      permalink: track.permalink || null,
      genre: track.genre || null,
      waveform_url: track.waveformUrl || null,
      play_count: track.popularity || 0,
    }));

    // Use upsert to avoid duplicates based on external_id and provider
    const { data, error } = await supabase
      .from('tracks')
      .upsert(tracksToInsert, {
        onConflict: 'external_id,provider',
        ignoreDuplicates: false,
      })
      .select('id, external_id, provider');

    if (error) {
      console.error('Database error:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Failed to save tracks to database:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check
    const rateLimitKey = getRateLimitKey(request);
    if (isRateLimited(rateLimitKey)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    // Validate request body
    const body = await request.json().catch(() => null);
    const inputValue = body?.vibeInput || body?.moodInput;
    const preferredProvider = body?.provider; // Optional provider preference
    
    if (!body || typeof inputValue !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request. vibeInput is required (vibe, environment, speed).' },
        { status: 400 }
      );
    }

    // Validate vibe input
    if (!inputValue.trim() || inputValue.length > 150) {
      return NextResponse.json(
        { error: 'Invalid vibe input. Must be 1-150 characters. Describe your vibe, environment, and speed.' },
        { status: 400 }
      );
    }

    // Initialize unified music service
    const unifiedMusicService = new UnifiedMusicService();
    
    // Check provider status
    const providerStatus = unifiedMusicService.getProviderStatus();
    const availableProviders = Object.entries(providerStatus)
      .filter(([_, status]) => status.configured)
      .map(([provider]) => provider);

    if (availableProviders.length === 0) {
      return NextResponse.json(
        { 
          error: 'No music providers configured. Please configure at least one provider (YouTube, SoundCloud).',
          providers: providerStatus
        },
        { status: 503 }
      );
    }

    let searchResult;
    try {
      // Use smart search (automatic provider selection) unless specific provider requested
      if (preferredProvider && availableProviders.includes(preferredProvider)) {
        const customConfig = {
          providers: {
            youtube: { enabled: preferredProvider === 'youtube', priority: 1, timeout: 15000 },
            soundcloud: { enabled: preferredProvider === 'soundcloud', priority: 1, timeout: 10000 },
            spotify: { enabled: false, priority: 3, timeout: 8000 },
          },
          fallbackEnabled: false, // Disable fallback when specific provider requested
        };
        searchResult = await unifiedMusicService.searchMusic(inputValue.trim(), customConfig);
      } else {
        // Smart search with automatic provider selection and fallbacks
        searchResult = await unifiedMusicService.smartSearch(inputValue.trim());
      }
    } catch (error: any) {
      // Handle specific errors from different providers
      if (error.message?.includes('quota') || error.message?.includes('429')) {
        return NextResponse.json(
          { 
            error: 'API quota exceeded. Please try again later.',
            fallback: true,
            providers: availableProviders
          },
          { status: 503 }
        );
      }

      if (error.message?.includes('timeout')) {
        return NextResponse.json(
          { 
            error: 'Search timeout. Please try again with a different query.',
            providers: availableProviders
          },
          { status: 504 }
        );
      }

      if (error.message?.includes('No music providers')) {
        return NextResponse.json(
          { 
            error: 'No music providers available.',
            providers: providerStatus
          },
          { status: 503 }
        );
      }

      console.error('Unified music search error:', error);
      return NextResponse.json(
        { 
          error: 'Failed to search music. Please try again.',
          providers: availableProviders
        },
        { status: 500 }
      );
    }

    // Save tracks to database
    if (searchResult.tracks.length > 0) {
      await saveTracksToDatabase(searchResult.tracks);
    }

    // Return results with metadata
    return NextResponse.json({
      success: true,
      results: searchResult.tracks,
      totalResults: searchResult.totalResults,
      providers: searchResult.providers,
      searchTime: searchResult.searchTime,
      providerStatus: providerStatus,
      query: inputValue.trim(),
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Unified music API error:', error);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405 }
  );
}