'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';

interface YouTubeTrack {
  videoId: string;
  title: string;
  channelTitle: string;
  duration: number;
  thumbnail: string;
  publishedAt: string;
  viewCount: number;
}

interface PlaylistState {
  tracks: YouTubeTrack[];
  currentIndex: number;
  currentTrack: YouTubeTrack | null;
}

const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

function AudioPlayerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Audio player state
  const [playlist, setPlaylist] = useState<PlaylistState>({
    tracks: [],
    currentIndex: 0,
    currentTrack: null
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentVibe, setCurrentVibe] = useState<string>('');

  // Get data from URL params
  useEffect(() => {
    const tracksData = searchParams.get('tracks');
    const currentIndex = parseInt(searchParams.get('currentIndex') || '0');
    const vibe = searchParams.get('vibe') || '';
    const errorMsg = searchParams.get('error');
    
    setCurrentVibe(vibe);
    
    if (errorMsg) {
      setError(decodeURIComponent(errorMsg));
      setIsLoading(false);
      return;
    }
    
    if (tracksData) {
      try {
        const tracks: YouTubeTrack[] = JSON.parse(decodeURIComponent(tracksData));
        const currentTrack = tracks[currentIndex] || tracks[0];
        
        setPlaylist({
          tracks,
          currentIndex: currentIndex || 0,
          currentTrack
        });
        
        if (currentTrack) {
          loadAudioForTrack(currentTrack.videoId);
        }
      } catch (error) {
        console.error('Error parsing tracks data:', error);
        setError('Failed to load playlist data');
      }
    }
  }, [searchParams]);

  const loadAudioForTrack = async (videoId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Check file size first by making a HEAD request
      const streamUrl = `/api/youtube/stream/${videoId}`;
      
      try {
        const headResponse = await fetch(streamUrl, { method: 'HEAD' });
        const fileSize = headResponse.headers.get('X-File-Size');
        
        if (fileSize) {
          const sizeInMB = parseInt(fileSize) / 1024 / 1024;
          if (sizeInMB > 50) {
            setError(`Audio file too large (${Math.round(sizeInMB)}MB). Skipping to next track...`);
            setTimeout(() => handleNext(), 2000); // Auto-skip after 2 seconds
            return;
          }
          
          // Show size warning for large files
          if (sizeInMB > 20) {
            setError(`Large file (${Math.round(sizeInMB)}MB) - may take longer to load...`);
            setTimeout(() => setError(null), 3000); // Clear warning after 3 seconds
          }
        }
        
        if (!headResponse.ok) {
          throw new Error(await headResponse.text());
        }
      } catch (headError) {
        console.warn('Could not check file size:', headError);
      }
      
      setAudioUrl(streamUrl);
      
      // Load the audio in the HTML5 audio element
      const audio = audioRef.current;
      if (audio) {
        audio.src = streamUrl;
        audio.load(); // Force reload of the new source
      }
      
      setIsLoading(false);
      
    } catch (error) {
      console.error('Error loading audio:', error);
      setError(error instanceof Error ? error.message : 'Failed to load audio');
      setIsLoading(false);
    }
  };

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      handleNext();
    };
    const handleLoadStart = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);
    const handleError = () => {
      setError('Audio playback failed');
      setIsLoading(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
    };
  }, [audioUrl]);

  const handlePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch (error) {
        console.error('Playback failed:', error);
        setError('Playback failed');
        setIsPlaying(false);
      }
    }
  };

  const handleNext = () => {
    const nextIndex = (playlist.currentIndex + 1) % playlist.tracks.length;
    const nextTrack = playlist.tracks[nextIndex];
    
    setPlaylist(prev => ({
      ...prev,
      currentIndex: nextIndex,
      currentTrack: nextTrack
    }));
    
    if (nextTrack) {
      loadAudioForTrack(nextTrack.videoId);
      setIsPlaying(false);
    }
  };

  const handlePrevious = () => {
    const prevIndex = playlist.currentIndex === 0 
      ? playlist.tracks.length - 1 
      : playlist.currentIndex - 1;
    const prevTrack = playlist.tracks[prevIndex];
    
    setPlaylist(prev => ({
      ...prev,
      currentIndex: prevIndex,
      currentTrack: prevTrack
    }));
    
    if (prevTrack) {
      loadAudioForTrack(prevTrack.videoId);
      setIsPlaying(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    const audio = audioRef.current;
    
    if (audio) {
      audio.volume = newVolume;
    }
    setVolume(newVolume);
  };

  const handleTrackSelect = (index: number) => {
    const selectedTrack = playlist.tracks[index];
    if (!selectedTrack) return;

    setPlaylist(prev => ({
      ...prev,
      currentIndex: index,
      currentTrack: selectedTrack
    }));
    
    loadAudioForTrack(selectedTrack.videoId);
    setIsPlaying(false);
  };

  const handleGoBack = () => {
    router.push('/');
  };

  if (!playlist.currentTrack) {
    return (
      <div className="min-h-screen bg-luxury-black relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-luxury-black via-gray-900 to-luxury-black"></div>
        <div className="relative z-10 min-h-screen flex items-center justify-center p-8">
          <div className="text-center">
            <div className="text-silver mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-silver mb-4">
              {error ? 'Unable to find music' : 'No tracks available'}
            </h2>
            {error && <p className="text-red-400 mb-4 text-center">{error}</p>}
            <button
              onClick={handleGoBack}
              className="luxury-btn px-6 py-3 rounded-xl"
            >
              Try Different Vibe
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-luxury-black relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-luxury-black via-gray-900 to-luxury-black"></div>
      <div className="relative z-10 min-h-screen p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={handleGoBack}
              className="luxury-btn px-4 py-2 rounded-xl text-sm flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>New Vibe</span>
            </button>
            
            <div className="text-center">
              <h1 className="font-luxury text-2xl font-bold natural-shimmer">
                Your Music
              </h1>
              {currentVibe && (
                <p className="text-silver text-sm mt-1">
                  Curated for: <span className="luxury-gradient font-semibold">&quot;{currentVibe}&quot;</span>
                </p>
              )}
            </div>
            <div></div>
          </div>

          <div className="max-w-4xl mx-auto">
            {/* Main Player - Full Width Immersive */}
            <div className="space-y-6">
              {/* Immersive Track Display */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-luxury-black via-luxury-dark to-luxury-black border border-silver/10">
                {/* Background Art */}
                <div className="absolute inset-0">
                  <img
                    src={playlist.currentTrack.thumbnail}
                    alt={playlist.currentTrack.title}
                    className="w-full h-full object-cover opacity-20 blur-xl scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-luxury-black via-luxury-black/60 to-transparent"></div>
                </div>
                
                {/* Main Content */}
                <div className="relative z-10 p-12">
                  <div className="text-center mb-8">
                    {/* Album Art */}
                    <div className="relative mx-auto mb-8 w-80 h-80">
                      <img
                        src={playlist.currentTrack.thumbnail}
                        alt={playlist.currentTrack.title}
                        className="w-full h-full object-cover rounded-3xl shadow-2xl"
                      />
                      {isLoading && (
                        <div className="absolute inset-0 bg-luxury-black/90 rounded-3xl flex items-center justify-center">
                          <div className="flex flex-col items-center space-y-4">
                            <div className="w-12 h-12 border-3 border-luxgreen/30 border-t-luxgreen rounded-full animate-spin"></div>
                            <p className="text-luxgreen font-medium">Loading your vibe...</p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Track Info */}
                    <h1 className="text-4xl font-luxury font-bold text-platinum mb-4 leading-tight max-w-3xl mx-auto">
                      {playlist.currentTrack.title}
                    </h1>
                    <p className="text-xl text-silver-light mb-2">{playlist.currentTrack.channelTitle}</p>
                    <p className="text-sm text-silver/70">Duration: {formatDuration(playlist.currentTrack.duration)}</p>
                    
                    {error && (
                      <div className="mt-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 max-w-md mx-auto">
                        <p className="text-red-400 text-sm">{error}</p>
                      </div>
                    )}
                  </div>

                  {/* Hidden Audio Element */}
                  {audioUrl && (
                    <audio
                      ref={audioRef}
                      src={audioUrl}
                      preload="metadata"
                      style={{ display: 'none' }}
                    />
                  )}

                  {/* Custom Audio Controls */}
                  <div className="mt-12 space-y-8">
                    {/* Progress Bar */}
                    <div className="space-y-4">
                      <div className="relative">
                        <input
                          type="range"
                          min={0}
                          max={duration || 0}
                          value={currentTime}
                          onChange={handleSeek}
                          className="w-full h-3 bg-gradient-to-r from-luxury-black/50 to-luxury-black/50 rounded-full appearance-none cursor-pointer progress-slider"
                          disabled={!audioUrl || isLoading}
                          style={{
                            background: `linear-gradient(to right, #10B981 0%, #10B981 ${duration ? (currentTime / duration) * 100 : 0}%, rgba(255,255,255,0.1) ${duration ? (currentTime / duration) * 100 : 0}%, rgba(255,255,255,0.1) 100%)`
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-lg text-silver font-mono">
                        <span className="bg-luxury-black/50 px-3 py-1 rounded-lg">{formatTime(currentTime)}</span>
                        <span className="bg-luxury-black/50 px-3 py-1 rounded-lg">{formatTime(duration)}</span>
                      </div>
                    </div>

                    {/* Main Controls */}
                    <div className="flex items-center justify-center space-x-8">
                      <button
                        onClick={handlePrevious}
                        className="luxury-btn p-4 rounded-full transition-all transform hover:scale-105 bg-luxury-black/30 hover:bg-luxury-black/50 border border-silver/20"
                        disabled={playlist.tracks.length <= 1}
                      >
                        <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
                        </svg>
                      </button>

                      <button
                        onClick={handlePlayPause}
                        className="luxury-btn p-6 rounded-full transition-all transform hover:scale-105 bg-gradient-to-r from-luxgreen to-emerald-500 hover:from-luxgreen/80 hover:to-emerald-500/80 shadow-green-glow"
                        disabled={!audioUrl || isLoading}
                      >
                        {isLoading ? (
                          <div className="w-10 h-10 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : isPlaying ? (
                          <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                          </svg>
                        ) : (
                          <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        )}
                      </button>

                      <button
                        onClick={handleNext}
                        className="luxury-btn p-4 rounded-full transition-all transform hover:scale-105 bg-luxury-black/30 hover:bg-luxury-black/50 border border-silver/20"
                        disabled={playlist.tracks.length <= 1}
                      >
                        <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
                        </svg>
                      </button>
                    </div>

                    {/* Volume Control */}
                    <div className="flex items-center justify-center space-x-4">
                      <svg className="w-6 h-6 text-silver" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M3 10v4h4l5 5V5L7 10H3z"/>
                      </svg>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.1}
                        value={volume}
                        onChange={handleVolumeChange}
                        className="w-32 h-2 bg-luxury-black/50 rounded-full appearance-none cursor-pointer volume-slider"
                        style={{
                          background: `linear-gradient(to right, #10B981 0%, #10B981 ${volume * 100}%, rgba(255,255,255,0.1) ${volume * 100}%, rgba(255,255,255,0.1) 100%)`
                        }}
                      />
                      <span className="text-silver text-sm font-mono bg-luxury-black/50 px-2 py-1 rounded">
                        {Math.round(volume * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AudioPlayerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-luxury-black to-luxury-purple flex items-center justify-center">
      <div className="luxury-gradient text-xl">Loading...</div>
    </div>}>
      <AudioPlayerContent />
    </Suspense>
  );
}