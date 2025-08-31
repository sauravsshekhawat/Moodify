import { NextRequest } from 'next/server';
import SoundCloudService from '@/lib/soundcloud';

// Force Node.js runtime
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackId: string }> }
) {
  try {
    const { trackId } = await params;

    // Validate track ID
    if (!trackId || !/^\d+$/.test(trackId)) {
      return new Response('Invalid track ID', { status: 400 });
    }

    // Check if SoundCloud is configured
    if (!process.env.SOUNDCLOUD_CLIENT_ID) {
      return new Response('SoundCloud API not configured', { status: 503 });
    }

    const soundcloudService = new SoundCloudService();
    
    // Get the actual stream URL from SoundCloud
    const streamUrl = await soundcloudService.getStreamUrl(trackId);
    
    if (!streamUrl) {
      return new Response('Stream not available', { status: 404 });
    }

    // Handle range requests for audio seeking
    const range = request.headers.get('range');
    
    // Forward the request to SoundCloud with proper headers
    const fetchOptions: RequestInit = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.101 Safari/537.36',
        'Accept': 'audio/*,*/*;q=0.1',
        'Accept-Encoding': 'identity',
        ...(range && { 'Range': range })
      }
    };

    const response = await fetch(streamUrl, fetchOptions);

    if (!response.ok) {
      return new Response('Stream unavailable', { status: response.status });
    }

    // Get content info
    const contentLength = response.headers.get('content-length');
    const contentType = response.headers.get('content-type') || 'audio/mpeg';
    
    // Build response headers
    const headers = new Headers({
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Range',
    });

    // Handle range requests
    if (range && response.status === 206) {
      const contentRange = response.headers.get('content-range');
      if (contentRange) {
        headers.set('Content-Range', contentRange);
      }
      if (contentLength) {
        headers.set('Content-Length', contentLength);
      }

      return new Response(response.body, {
        status: 206,
        headers,
      });
    }

    // Standard response
    if (contentLength) {
      headers.set('Content-Length', contentLength);
      headers.set('X-File-Size', contentLength); // Include file size info for client
    }

    return new Response(response.body, {
      status: 200,
      headers,
    });

  } catch (error) {
    console.error('SoundCloud streaming error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('not configured')) {
        return new Response('SoundCloud API not configured', { status: 503 });
      }
      if (error.message.includes('Track not found')) {
        return new Response('Track not found', { status: 404 });
      }
    }
    
    return new Response('Stream unavailable', { status: 500 });
  }
}

// Handle preflight requests for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type',
    },
  });
}