import { NextRequest, NextResponse } from 'next/server';
import YouTubeService from '@/lib/youtube';
import { createClient } from '@supabase/supabase-js';

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 requests per minute
};

function getRateLimitKey(request: NextRequest): string {
  // Use IP address for rate limiting
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0] || request.headers.get('x-real-ip') || 'unknown';
  return `youtube_search_${ip}`;
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
      external_id: track.videoId,
      title: track.title,
      artist: track.channelTitle,
      duration_ms: track.duration * 1000, // Convert seconds to milliseconds
      thumbnail_url: track.thumbnail,
      provider: 'youtube',
      audio_features: {},
      mood_scores: {},
      popularity_score: Math.min(track.viewCount / 1000000, 10), // Normalize view count to 0-10 scale
      explicit: false,
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

    // Validate request body - accept both moodInput and vibeInput for backward compatibility
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

    // Check if YouTube API key is configured
    if (!process.env.YOUTUBE_API_KEY) {
      return NextResponse.json(
        { error: 'YouTube API is not configured.' },
        { status: 500 }
      );
    }

    // Initialize YouTube service and search
    const youtubeService = new YouTubeService();
    
    let searchResult;
    try {
      searchResult = await youtubeService.searchMusic(inputValue.trim());
    } catch (error: any) {
      // Handle specific YouTube API errors
      if (error.message?.includes('quota')) {
        return NextResponse.json(
          { 
            error: 'YouTube API quota exceeded. Please try again later.',
            fallback: true 
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

      console.error('YouTube API error:', error);
      return NextResponse.json(
        { error: 'Failed to search YouTube. Please try again.' },
        { status: 500 }
      );
    }

    // Save tracks to database
    if (searchResult.tracks.length > 0) {
      await saveTracksToDatabase(searchResult.tracks);
    }

    // Return results
    return NextResponse.json({
      success: true,
      results: searchResult.tracks,
      totalResults: searchResult.totalResults,
      query: inputValue.trim(),
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('API error:', error);
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