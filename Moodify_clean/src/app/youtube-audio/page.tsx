'use client';

import React, { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export default function YouTubeAudioPlayer() {
  const playerRef = useRef<any>(null);
  const [player, setPlayer] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  
  // YouTube Video ID - you can change this to any video you want
  const videoId = 'dQw4w9WgXcQ'; // Rick Astley - Never Gonna Give You Up

  useEffect(() => {
    // Load YouTube IFrame API
    const loadYouTubeAPI = () => {
      if (window.YT) {
        initializePlayer();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      document.body.appendChild(script);

      window.onYouTubeIframeAPIReady = initializePlayer;
    };

    const initializePlayer = () => {
      const ytPlayer = new window.YT.Player('youtube-player', {
        height: '0',
        width: '0',
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
          showinfo: 0,
        },
        events: {
          onReady: (event: any) => {
            setPlayer(event.target);
            setIsReady(true);
            setIsPlaying(true);
            console.log('Player ready and autoplay started');
          },
          onStateChange: (event: any) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
            } else if (event.data === window.YT.PlayerState.PAUSED) {
              setIsPlaying(false);
            }
          },
        },
      });
    };

    loadYouTubeAPI();

    return () => {
      if (player) {
        player.destroy();
      }
    };
  }, []);

  const togglePlayPause = () => {
    if (!player) return;

    if (isPlaying) {
      player.pauseVideo();
    } else {
      player.playVideo();
    }
  };

  const stopVideo = () => {
    if (!player) return;
    player.stopVideo();
    setIsPlaying(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        {/* Hidden YouTube Player */}
        <div 
          id="youtube-player" 
          style={{ 
            position: 'absolute',
            top: '-9999px',
            left: '-9999px',
            width: '0px',
            height: '0px'
          }}
        ></div>

        {/* Audio Player Interface */}
        <div className="bg-gray-800 rounded-2xl p-8 shadow-2xl border border-gray-700">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">YouTube Audio Player</h1>
            <p className="text-gray-400">Playing audio without video</p>
          </div>

          {/* Status */}
          <div className="text-center mb-6">
            <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
              isReady 
                ? isPlaying 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                  : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
            }`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${
                isReady 
                  ? isPlaying 
                    ? 'bg-green-400 animate-pulse' 
                    : 'bg-yellow-400'
                  : 'bg-gray-400 animate-pulse'
              }`}></div>
              {!isReady ? 'Loading...' : isPlaying ? 'Playing' : 'Paused'}
            </div>
          </div>

          {/* Video Info */}
          <div className="bg-gray-700/50 rounded-xl p-4 mb-6">
            <h3 className="text-white font-medium mb-1">Now Playing:</h3>
            <p className="text-gray-300 text-sm">Rick Astley - Never Gonna Give You Up</p>
            <p className="text-gray-500 text-xs mt-1">Video ID: {videoId}</p>
          </div>

          {/* Controls */}
          <div className="flex justify-center space-x-4">
            <button
              onClick={togglePlayPause}
              disabled={!isReady}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2"
            >
              {isPlaying ? (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                  </svg>
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                  <span>Play</span>
                </>
              )}
            </button>

            <button
              onClick={stopVideo}
              disabled={!isReady}
              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h12v12H6z"/>
              </svg>
            </button>
          </div>

          {/* Instructions */}
          <div className="mt-8 text-center">
            <p className="text-gray-400 text-sm leading-relaxed">
              The YouTube video is hidden and only audio is playing. 
              Use the controls above to play, pause, or stop the audio.
            </p>
          </div>
        </div>

        {/* Technical Info */}
        <div className="mt-6 bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
          <h4 className="text-white font-medium mb-2">Technical Details:</h4>
          <ul className="text-gray-400 text-sm space-y-1">
            <li>• YouTube IFrame API integration</li>
            <li>• Video iframe hidden with CSS positioning</li>
            <li>• Autoplay enabled on page load</li>
            <li>• Real-time play/pause state synchronization</li>
          </ul>
        </div>
      </div>
    </div>
  );
}