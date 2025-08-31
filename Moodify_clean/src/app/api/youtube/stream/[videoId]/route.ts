import { NextRequest } from 'next/server';
import ytdl from '@distube/ytdl-core';

// Force Node.js runtime for ytdl-core compatibility
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const { videoId } = await params;

    // Validate video ID
    if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      return new Response('Invalid video ID', { status: 400 });
    }

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    // Get video info
    const info = await ytdl.getInfo(videoUrl);
    
    // Get audio-only formats for better MP3 compatibility
    const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
    
    if (audioFormats.length === 0) {
      return new Response('No audio streams available', { status: 404 });
    }

    // Filter formats by size and quality for web optimization
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB limit
    const suitableFormats = audioFormats.filter(format => {
      const contentLength = parseInt(format.contentLength || '0');
      return contentLength > 0 && contentLength <= MAX_FILE_SIZE;
    });

    // If no formats under size limit, use smallest available
    const formatsToUse = suitableFormats.length > 0 ? suitableFormats : audioFormats;

    // Smart quality selection - prefer medium quality for web (128-192kbps)
    const bestAudio = formatsToUse.find(format => {
      const bitrate = format.audioBitrate || 0;
      return bitrate >= 128 && bitrate <= 192 && 
        (format.audioCodec?.includes('mp4a') || format.container === 'mp4');
    }) || formatsToUse.find(format => 
      format.audioCodec?.includes('mp3') || format.container === 'mp4'
    ) || formatsToUse.find(format => 
      (format.container as string) === 'm4a' || format.codecs?.includes('mp4a')
    ) || formatsToUse[0];

    // Additional size validation
    const estimatedSize = parseInt(bestAudio.contentLength || '0');
    if (estimatedSize > MAX_FILE_SIZE) {
      return new Response(`Audio file too large (${Math.round(estimatedSize / 1024 / 1024)}MB). Maximum: 50MB`, { 
        status: 413 
      });
    }

    // Create audio stream optimized for web playback with memory-efficient options
    const audioStream = ytdl(videoUrl, {
      format: bestAudio,
      quality: 'lowestaudio', // Use lowest quality for faster loading and less bandwidth
      filter: 'audioonly',
      highWaterMark: estimatedSize > 10 * 1024 * 1024 ? 512 * 1024 : 1024 * 1024, // Smaller chunks for large files
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.101 Safari/537.36'
        }
      }
    });

    // Handle range requests for audio seeking
    const range = request.headers.get('range');
    const contentLength = bestAudio.contentLength;
    
    if (range && contentLength) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : parseInt(contentLength) - 1;
      const chunksize = (end - start) + 1;

      const headers = new Headers({
        'Content-Range': `bytes ${start}-${end}/${contentLength}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize.toString(),
        'Content-Type': 'audio/mp4',
        'Cache-Control': 'public, max-age=3600',
      });

      // For range requests, we need to handle partial content
      return new Response(audioStream as any, {
        status: 206,
        headers,
      });
    }

    // Standard response with audio content type - use mp4 for better compatibility
    const headers = new Headers({
      'Content-Type': 'audio/mp4', // MP4 audio format for better browser support
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Range',
      'X-File-Size': estimatedSize.toString(), // Include file size info for client
    });

    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    // Return the audio stream
    return new Response(audioStream as any, {
      status: 200,
      headers,
    });

  } catch (error) {
    console.error('Streaming error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Video unavailable')) {
        return new Response('Video unavailable', { status: 404 });
      }
      if (error.message.includes('private')) {
        return new Response('Video is private', { status: 403 });
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