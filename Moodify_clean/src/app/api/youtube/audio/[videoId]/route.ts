import { NextRequest, NextResponse } from 'next/server';
import ytdl from '@distube/ytdl-core';

// Force Node.js runtime for ytdl-core compatibility
export const runtime = 'nodejs';

// Rate limiting store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20, // 20 audio requests per minute
};

function getRateLimitKey(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0] || request.headers.get('x-real-ip') || 'unknown';
  return `youtube_audio_${ip}`;
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    // Rate limiting check
    const rateLimitKey = getRateLimitKey(request);
    if (isRateLimited(rateLimitKey)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    const { videoId } = await params;

    // Validate video ID
    if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      return NextResponse.json(
        { error: 'Invalid video ID' },
        { status: 400 }
      );
    }

    try {
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      
      // Get video info and check for audio availability with timeout
      const info = await Promise.race([
        ytdl.getInfo(videoUrl, {
          requestOptions: {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.101 Safari/537.36'
            }
          }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 30000)
        )
      ]) as any;
      
      if (!info) {
        return NextResponse.json(
          { error: 'Video not found or unavailable' },
          { status: 404 }
        );
      }
      
      // Get audio-only formats for pure MP3 streaming
      const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
      
      if (audioFormats.length === 0) {
        return NextResponse.json(
          { error: 'No audio streams available' },
          { status: 404 }
        );
      }
      
      // Find best MP3-compatible audio format
      const bestAudio = audioFormats.find(format => 
        format.audioCodec?.includes('mp3') || format.container === 'mp4'
      ) || audioFormats.find(format => 
        (format.container as string) === 'm4a' || format.codecs?.includes('mp4a')
      ) || audioFormats[0];
      
      return NextResponse.json({
        videoId,
        audioUrl: `/api/youtube/stream/${videoId}`,
        title: info.videoDetails.title,
        duration: parseInt(info.videoDetails.lengthSeconds || '0'),
        quality: bestAudio.qualityLabel || 'audio',
        format: 'mp3', // Pure MP3 audio format
        contentType: 'audio/mpeg' // MP3 audio
      });

    } catch (extractionError) {
      console.error('Audio extraction error:', extractionError);
      return NextResponse.json(
        { error: 'Failed to extract audio stream' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed. Use GET.' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed. Use GET.' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed. Use GET.' },
    { status: 405 }
  );
}