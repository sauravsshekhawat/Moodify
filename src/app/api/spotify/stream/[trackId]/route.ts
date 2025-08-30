import { NextRequest } from 'next/server';
import SpotifyService from '@/lib/spotify';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackId: string }> }
) {
  try {
    const { trackId } = await params;

    // Validate track ID (Spotify track IDs are 22-character base62 strings)
    if (!trackId || !/^[A-Za-z0-9]{22}$/.test(trackId)) {
      return new Response('Invalid Spotify track ID', { status: 400 });
    }

    const spotifyService = new SpotifyService();

    // Check if Spotify is configured
    if (!spotifyService.isConfigured()) {
      return new Response('Spotify API not configured', { status: 503 });
    }

    // Get track details including preview URL
    const track = await spotifyService.getTrackDetails(trackId);
    
    if (!track) {
      return new Response('Track not found', { status: 404 });
    }

    if (!track.previewUrl) {
      return new Response('Preview not available for this track', { status: 404 });
    }

    // Handle range requests for audio seeking (though previews are only 30 seconds)
    const range = request.headers.get('range');
    
    // Forward the request to Spotify's CDN with proper headers
    const fetchOptions: RequestInit = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.101 Safari/537.36',
        'Accept': 'audio/*,*/*;q=0.1',
        'Accept-Encoding': 'identity',
        ...(range && { 'Range': range })
      }
    };

    const response = await fetch(track.previewUrl, fetchOptions);

    if (!response.ok) {
      return new Response('Preview unavailable', { status: response.status });
    }

    // Get content info
    const contentLength = response.headers.get('content-length');
    const contentType = response.headers.get('content-type') || 'audio/mpeg';
    
    // Build response headers
    const headers = new Headers({
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour since previews are stable
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Range',
      'X-Preview-Duration': '30', // Let client know this is a 30-second preview
      'X-Spotify-Track-ID': trackId,
    });

    // Handle range requests (though rare for 30-second files)
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

    // Standard response for preview
    if (contentLength) {
      headers.set('Content-Length', contentLength);
      headers.set('X-File-Size', contentLength); // Include file size info for client
    }

    return new Response(response.body, {
      status: 200,
      headers,
    });

  } catch (error) {
    console.error('Spotify streaming error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('not configured')) {
        return new Response('Spotify API not configured', { status: 503 });
      }
      if (error.message.includes('Track not found')) {
        return new Response('Track not found', { status: 404 });
      }
      if (error.message.includes('auth failed')) {
        return new Response('Spotify authentication failed', { status: 401 });
      }
    }
    
    return new Response('Preview unavailable', { status: 500 });
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