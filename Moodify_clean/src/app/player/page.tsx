'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';

interface UnifiedTrack {
  id: string;
  title: string;
  artist: string;
  duration: number;
  thumbnail: string;
  publishedAt?: string;
  popularity?: number;
  provider: 'spotify' | 'youtube' | 'soundcloud';
  streamUrl?: string;
  genre?: string;
  permalink?: string;
  waveformUrl?: string;
}

const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const formatPopularity = (popularity: number | undefined, provider: string): string => {
  if (!popularity) return 'Unknown';
  
  if (provider === 'youtube') {
    if (popularity > 1000000) return `${Math.round(popularity / 1000000)}M views`;
    if (popularity > 1000) return `${Math.round(popularity / 1000)}K views`;
    return `${popularity} views`;
  }
  if (provider === 'soundcloud') {
    if (popularity > 1000000) return `${Math.round(popularity / 1000000)}M plays`;
    if (popularity > 1000) return `${Math.round(popularity / 1000)}K plays`;
    return `${popularity} plays`;
  }
  if (provider === 'spotify') {
    return `${popularity}/100 popularity`;
  }
  return `${popularity}`;
};

const getProviderUrl = (track: UnifiedTrack): string => {
  switch (track.provider) {
    case 'spotify':
      return track.permalink || `https://open.spotify.com/search/${encodeURIComponent(track.title + ' ' + track.artist)}`;
    case 'youtube':
      return `https://www.youtube.com/watch?v=${track.id}`;
    case 'soundcloud':
      return track.permalink || `https://soundcloud.com/search?q=${encodeURIComponent(track.title + ' ' + track.artist)}`;
    default:
      return '#';
  }
};

const getProviderName = (provider: string): string => {
  switch (provider) {
    case 'spotify': return 'Spotify';
    case 'youtube': return 'YouTube';
    case 'soundcloud': return 'SoundCloud';
    default: return provider;
  }
};

const getProviderIcon = (provider: string): string => {
  switch (provider) {
    case 'spotify': return '🎵';
    case 'youtube': return '📺';
    case 'soundcloud': return '🎧';
    default: return '🎶';
  }
};

const getProviderColor = (provider: string): string => {
  switch (provider) {
    case 'spotify': return 'from-green-500 to-green-600';
    case 'youtube': return 'from-red-500 to-red-600';
    case 'soundcloud': return 'from-orange-500 to-orange-600';
    default: return 'from-gray-500 to-gray-600';
  }
};

function MusicCatalog() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [tracks, setTracks] = useState<UnifiedTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentVibe, setCurrentVibe] = useState<string>('');
  
  // Separate tracks by platform
  const spotifyTracks = tracks.filter(track => track.provider === 'spotify');
  const youtubeTracks = tracks.filter(track => track.provider === 'youtube');
  const soundcloudTracks = tracks.filter(track => track.provider === 'soundcloud');

  // Get data from URL params
  useEffect(() => {
    const tracksData = searchParams.get('tracks');
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
        const parsedTracks: UnifiedTrack[] = JSON.parse(decodeURIComponent(tracksData));
        setTracks(parsedTracks);
        setIsLoading(false);
      } catch (error) {
        console.error('Error parsing tracks data:', error);
        setError('Failed to load music catalog');
        setIsLoading(false);
      }
    } else {
      setError('No tracks found');
      setIsLoading(false);
    }
  }, [searchParams]);

  const handleGoBack = () => {
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-luxury-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-luxgreen/30 border-t-luxgreen rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-luxgreen font-medium">Loading your music catalog...</p>
        </div>
      </div>
    );
  }

  if (error || tracks.length === 0) {
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
              {error ? 'Unable to load music catalog' : 'No tracks found'}
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
    <div className="min-h-screen bg-luxury-black">
      <div className="absolute inset-0 bg-gradient-to-br from-luxury-black via-gray-900/50 to-luxury-black"></div>
      <div className="relative z-10 min-h-screen p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <button
              onClick={handleGoBack}
              className="luxury-btn px-4 py-2 rounded-xl text-sm flex items-center space-x-2 mx-auto mb-6"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>New Search</span>
            </button>
            
            <h1 className="font-luxury text-3xl lg:text-4xl font-bold natural-shimmer mb-4">
              Music Recommendations
            </h1>
            {currentVibe && (
              <p className="text-silver-light text-lg mb-2">
                Curated for: <span className="luxury-gradient font-semibold text-xl">&quot;{currentVibe}&quot;</span>
              </p>
            )}
            <p className="text-silver/70 text-sm">
              Compare music recommendations from Spotify and YouTube side by side
            </p>
          </div>

          {/* Two-Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Spotify Column */}
            <div className="space-y-6">
              <div className="flex items-center justify-center mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center">
                    <span className="text-2xl">🎵</span>
                  </div>
                  <h2 className="font-luxury text-3xl font-bold text-platinum">Spotify</h2>
                  {spotifyTracks.length > 0 && (
                    <span className="text-sm text-silver/60">({spotifyTracks.length} tracks)</span>
                  )}
                </div>
              </div>
              
              {spotifyTracks.length > 0 ? (
                <div className="space-y-4">
                  {spotifyTracks.map((track, index) => (
                    <div key={`${track.provider}-${track.id}`} className="group">
                      <a
                        href={getProviderUrl(track)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <div className="luxury-card rounded-xl p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl group-hover:bg-luxury-card/80 relative overflow-hidden">
                          <div className="flex items-center space-x-4">
                            {/* Album Cover */}
                            <div className="relative flex-shrink-0">
                              <div className="w-16 h-16 rounded-lg overflow-hidden bg-gradient-to-br from-luxury-black to-luxury-dark shadow-luxury">
                                <img
                                  src={track.thumbnail}
                                  alt={track.title}
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                  loading="lazy"
                                />
                                {/* Play Overlay */}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                  <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${getProviderColor(track.provider)} flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300`}>
                                    <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M8 5v14l11-7z"/>
                                    </svg>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Provider Badge */}
                              <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-r ${getProviderColor(track.provider)} flex items-center justify-center text-xs shadow-lg`}>
                                {getProviderIcon(track.provider)}
                              </div>
                            </div>

                            {/* Track Info */}
                            <div className="flex-grow space-y-1">
                              <h3 className="font-semibold text-platinum text-sm leading-tight line-clamp-1 group-hover:text-luxgreen transition-colors">
                                {track.title}
                              </h3>
                              <p className="text-silver-light text-xs line-clamp-1">
                                {track.artist}
                              </p>
                              
                              <div className="flex items-center justify-between text-xs text-silver/70">
                                <span>{formatDuration(track.duration)}</span>
                                <span className="text-xs text-silver/60">
                                  {formatPopularity(track.popularity, track.provider)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Hover Effect Border */}
                          <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-luxgreen/50 transition-colors duration-300 pointer-events-none"></div>
                        </div>
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-silver/50 mb-4">
                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-silver mb-2">No Spotify tracks found</h3>
                  <p className="text-silver/70 text-sm">Try a different mood or check your Spotify configuration</p>
                </div>
              )}
            </div>

            {/* YouTube Column */}
            <div className="space-y-6">
              <div className="flex items-center justify-center mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-red-500 to-red-600 flex items-center justify-center">
                    <span className="text-2xl">📺</span>
                  </div>
                  <h2 className="font-luxury text-3xl font-bold text-platinum">YouTube</h2>
                  {youtubeTracks.length > 0 && (
                    <span className="text-sm text-silver/60">({youtubeTracks.length} tracks)</span>
                  )}
                </div>
              </div>
              
              {youtubeTracks.length > 0 ? (
                <div className="space-y-4">
                  {youtubeTracks.map((track, index) => (
                    <div key={`${track.provider}-${track.id}`} className="group">
                      <a
                        href={getProviderUrl(track)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <div className="luxury-card rounded-xl p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl group-hover:bg-luxury-card/80 relative overflow-hidden">
                          <div className="flex items-center space-x-4">
                            {/* Album Cover */}
                            <div className="relative flex-shrink-0">
                              <div className="w-16 h-16 rounded-lg overflow-hidden bg-gradient-to-br from-luxury-black to-luxury-dark shadow-luxury">
                                <img
                                  src={track.thumbnail}
                                  alt={track.title}
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                  loading="lazy"
                                />
                                {/* Play Overlay */}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                  <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${getProviderColor(track.provider)} flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300`}>
                                    <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M8 5v14l11-7z"/>
                                    </svg>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Provider Badge */}
                              <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-r ${getProviderColor(track.provider)} flex items-center justify-center text-xs shadow-lg`}>
                                {getProviderIcon(track.provider)}
                              </div>
                            </div>

                            {/* Track Info */}
                            <div className="flex-grow space-y-1">
                              <h3 className="font-semibold text-platinum text-sm leading-tight line-clamp-1 group-hover:text-luxgreen transition-colors">
                                {track.title}
                              </h3>
                              <p className="text-silver-light text-xs line-clamp-1">
                                {track.artist}
                              </p>
                              
                              <div className="flex items-center justify-between text-xs text-silver/70">
                                <span>{formatDuration(track.duration)}</span>
                                <span className="text-xs text-silver/60">
                                  {formatPopularity(track.popularity, track.provider)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Hover Effect Border */}
                          <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-luxgreen/50 transition-colors duration-300 pointer-events-none"></div>
                        </div>
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-silver/50 mb-4">
                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-silver mb-2">No YouTube tracks found</h3>
                  <p className="text-silver/70 text-sm">Try a different mood or check your YouTube configuration</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-16 text-center">
            <div className="luxury-card rounded-2xl p-6 max-w-2xl mx-auto">
              <h3 className="text-lg font-luxury font-bold text-platinum mb-3">
                🎵 Discover More Music
              </h3>
              <p className="text-silver-light mb-4">
                Found something you like? Click any track to play it on your preferred platform.
              </p>
              <button
                onClick={handleGoBack}
                className="luxury-btn px-6 py-3 rounded-xl"
              >
                Search New Vibe
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MusicCatalogPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-luxury-black to-luxury-purple flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-luxgreen/30 border-t-luxgreen rounded-full animate-spin mx-auto mb-4"></div>
          <div className="luxury-gradient text-xl">Loading your music catalog...</div>
        </div>
      </div>
    }>
      <MusicCatalog />
    </Suspense>
  );
}