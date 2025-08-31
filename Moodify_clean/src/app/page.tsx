'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { MoodInputProps } from '@/types';

const LuxuryMoodInput: React.FC<MoodInputProps> = ({ onMoodSubmit, isLoading = false }) => {
  const [mood, setMood] = useState('');
  const [selectedMoodChip, setSelectedMoodChip] = useState<string | null>(null);

  const moodSuggestions = [
    { emoji: '✨', mood: 'euphoric', label: 'Euphoric', gradient: 'from-luxgreen to-yellow-400' },
    { emoji: '🌙', mood: 'melancholic', label: 'Melancholic', gradient: 'from-blue-400 to-luxviolet' },
    { emoji: '⚡', mood: 'energetic', label: 'Energetic', gradient: 'from-red-500 to-pink-500' },
    { emoji: '🕊️', mood: 'serene', label: 'Serene', gradient: 'from-teal-400 to-cyan-400' },
    { emoji: '🔥', mood: 'passionate', label: 'Passionate', gradient: 'from-rose-500 to-red-500' },
    { emoji: '🧠', mood: 'contemplative', label: 'Contemplative', gradient: 'from-indigo-500 to-luxviolet' },
    { emoji: '🎭', mood: 'dramatic', label: 'Dramatic', gradient: 'from-luxviolet to-pink-500' },
    { emoji: '🌅', mood: 'nostalgic', label: 'Nostalgic', gradient: 'from-amber-400 to-orange-400' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalMood = selectedMoodChip || mood;
    if (finalMood.trim()) {
      onMoodSubmit(finalMood.trim());
    }
  };

  const handleMoodChipClick = (moodValue: string) => {
    setSelectedMoodChip(moodValue);
    setMood('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-4xl w-full luxury-fade-in">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="font-luxury text-5xl md:text-6xl font-bold mb-6 natural-shimmer">
            Discover Your Sound
          </h1>
          <p className="text-xl text-silver-light max-w-2xl mx-auto leading-relaxed">
            Let our AI curate the perfect soundtrack for your soul. 
            <span className="luxury-gradient font-semibold"> Choose your mood</span> and 
            embark on a musical journey crafted just for you.
          </p>
        </div>

        <div className="luxury-card rounded-3xl p-12">
          {/* Mood Selection Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
            {moodSuggestions.map((suggestion) => (
              <button
                key={suggestion.mood}
                onClick={() => handleMoodChipClick(suggestion.mood)}
                className={`group relative p-8 rounded-2xl border transition-all duration-500 luxury-hover luxury-focus ${
                  selectedMoodChip === suggestion.mood
                    ? 'border-luxgreen bg-luxgreen/10 shadow-green-glow'
                    : 'border-silver/30 hover:border-luxgreen/50 hover:bg-luxury-card/50'
                }`}
                disabled={isLoading}
              >
                <div className="text-4xl mb-4">{suggestion.emoji}</div>
                <div className="text-sm font-semibold text-platinum group-hover:text-luxgreen transition-colors">
                  {suggestion.label}
                </div>
                {selectedMoodChip === suggestion.mood && (
                  <div className="absolute top-3 right-3 w-3 h-3 bg-luxgreen rounded-full animate-pulse shadow-green-glow"></div>
                )}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="relative mb-12">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-silver/20"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-luxury-card px-6 text-silver font-luxury text-lg">
                Or describe your essence
              </span>
            </div>
          </div>

          {/* Custom Mood Input */}
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="relative">
              <input
                type="text"
                value={mood}
                onChange={(e) => {
                  setMood(e.target.value);
                  setSelectedMoodChip(null);
                }}
                placeholder="I'm feeling like a midnight sonnet, yearning for something profound..."
                className="w-full px-8 py-6 text-lg rounded-2xl bg-luxury-black border-2 border-silver/30 focus:border-luxgreen text-platinum placeholder-silver/60 transition-all duration-300 luxury-focus"
                disabled={isLoading}
              />
              <div className="absolute inset-y-0 right-4 flex items-center">
                <div className="text-silver/40">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="text-center">
              <button
                type="submit"
                disabled={isLoading || (!mood.trim() && !selectedMoodChip)}
                className="luxury-btn px-12 py-4 text-platinum font-semibold rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed luxury-focus inline-flex items-center space-x-3"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-platinum/30 border-t-platinum rounded-full animate-spin"></div>
                    <span>Curating your symphony...</span>
                  </>
                ) : (
                  <>
                    <span>Generate My Playlist</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12 6.5M9 19l-3 1.5V6l3-1.5z" />
                    </svg>
                  </>
                )}
              </button>
            </div>

            {/* Selected mood indicator */}
            {(selectedMoodChip || mood) && (
              <div className="text-center p-6 bg-luxury-black/50 rounded-2xl border border-luxgreen/30">
                <p className="text-silver">
                  <span className="font-luxury text-lg text-platinum">Current essence:</span>{' '}
                  <span className="font-semibold luxury-gradient text-lg">{selectedMoodChip || mood}</span>
                </p>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleMoodSubmit = async (mood: string) => {
    setIsLoading(true);
    
    try {
      // Search for music using unified API (Spotify + YouTube)
      const response = await fetch('/api/music/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ vibeInput: mood }),
      });

      const data = await response.json();
      
      if (!response.ok || !data.results || data.results.length === 0) {
        throw new Error('No music found for your vibe');
      }

      // Navigate directly to player with results
      const tracksData = encodeURIComponent(JSON.stringify(data.results));
      router.push(`/player?tracks=${tracksData}&currentIndex=0&vibe=${encodeURIComponent(mood)}`);
      
    } catch (error) {
      console.error('Error:', error);
      // Still navigate to show error state
      router.push(`/player?error=${encodeURIComponent('Failed to find music for your vibe')}`);
    }
    
    setIsLoading(false);
  };

  return (
    <MainLayout>
      <LuxuryMoodInput onMoodSubmit={handleMoodSubmit} isLoading={isLoading} />
    </MainLayout>
  );
}