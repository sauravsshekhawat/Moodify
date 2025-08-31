import { NextRequest, NextResponse } from 'next/server';
import SpotifyService from '@/lib/spotify';
import { createClient } from '@supabase/supabase-js';

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30, // 30 requests per minute (Spotify is generally more permissive than YouTube)
};

function getRateLimitKey(request: NextRequest): string {
  // Use IP address for rate limiting
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0] || request.headers.get('x-real-ip') || 'unknown';
  return `spotify_search_${ip}`;
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
      album: track.album,
      duration_ms: track.duration * 1000, // Convert seconds to milliseconds
      thumbnail_url: track.thumbnail,
      stream_url: track.previewUrl, // 30-second preview URL
      provider: 'spotify',
      audio_features: {
        danceability: track.audioFeatures?.danceability || null,
        energy: track.audioFeatures?.energy || null,
        key: track.audioFeatures?.key || null,
        loudness: track.audioFeatures?.loudness || null,
        mode: track.audioFeatures?.mode || null,
        speechiness: track.audioFeatures?.speechiness || null,
        acousticness: track.audioFeatures?.acousticness || null,
        instrumentalness: track.audioFeatures?.instrumentalness || null,
        liveness: track.audioFeatures?.liveness || null,
        valence: track.audioFeatures?.valence || null,
        tempo: track.audioFeatures?.tempo || null,
        time_signature: track.audioFeatures?.timeSignature || null,
        genres: track.genres || [],
      },
      mood_scores: {
        energy: track.audioFeatures?.energy || 0.5,
        valence: track.audioFeatures?.valence || 0.5,
        danceability: track.audioFeatures?.danceability || 0.5,
        acousticness: track.audioFeatures?.acousticness || 0.5,
      },
      popularity_score: track.popularity / 10, // Normalize Spotify popularity to 0-10 scale
      explicit: false, // We can add this later if needed
      permalink: track.spotifyUrl,
      genre: track.genres?.[0] || null, // Primary genre
      play_count: null, // Spotify doesn't provide play counts via API
    }));

    // Use upsert to avoid duplicates based on external_id and provider
    const { data, error } = await supabase
      .from('tracks')
      .upsert(tracksToInsert, {
        onConflict: 'external_id,provider',
        ignoreDuplicates: false,
      })
      .select('id, external_id');

    if (error) {
      console.error('Database error:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Failed to save Spotify tracks to database:', error);
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

    // Initialize Spotify service
    const spotifyService = new SpotifyService();

    // Check if Spotify is configured
    if (!spotifyService.isConfigured()) {
      return NextResponse.json(
        { error: 'Spotify API is not configured. Please add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to your environment variables.' },
        { status: 500 }
      );
    }

    let searchResult;
    try {
      searchResult = await spotifyService.searchMusic(inputValue.trim());
    } catch (error: any) {
      // Handle specific Spotify API errors
      if (error.message?.includes('auth failed') || error.message?.includes('401')) {
        return NextResponse.json(
          { 
            error: 'Spotify authentication failed. Please check your API credentials.',
            fallback: false
          },
          { status: 401 }
        );
      }

      if (error.message?.includes('429') || error.message?.includes('rate limit')) {
        return NextResponse.json(
          { 
            error: 'Spotify API rate limit exceeded. Please try again later.',
            fallback: false
          },
          { status: 503 }
        );
      }

      if (error.message?.includes('timeout')) {
        return NextResponse.json(
          { error: 'Request timeout. Please try again.' },
          { status: 504 }
        );
      }

      console.error('Spotify API error:', error);
      return NextResponse.json(
        { error: 'Failed to search Spotify. Please try again.' },
        { status: 500 }
      );
    }

    // Check if we found tracks with previews
    if (searchResult.tracks.length === 0) {
      return NextResponse.json(
        { 
          error: 'No tracks with previews found for this mood. Try a different vibe or mood.',
          suggestion: 'Try terms like "happy pop", "chill electronic", or "energetic rock"'
        },
        { status: 404 }
      );
    }

    // Save tracks to database
    if (searchResult.tracks.length > 0) {
      await saveTracksToDatabase(searchResult.tracks);
    }

    // Return results with rich metadata
    return NextResponse.json({
      success: true,
      results: searchResult.tracks,
      totalResults: searchResult.totalResults,
      provider: 'spotify',
      query: inputValue.trim(),
      timestamp: new Date().toISOString(),
      metadata: {
        previewsOnly: true,
        previewDuration: 30, // seconds
        audioFeaturesIncluded: true,
        tracksWithAudioFeatures: searchResult.tracks.filter(t => t.audioFeatures).length,
      }
    });

  } catch (error) {
    console.error('Spotify API error:', error);
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