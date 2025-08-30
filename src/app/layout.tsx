import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'MoodTunes AI - Discover Music That Matches Your Mood',
  description: 'AI-powered music discovery app that curates playlists based on your current mood and emotions.',
  keywords: ['music', 'AI', 'mood', 'playlist', 'discovery', 'emotions', 'Spotify'],
  authors: [{ name: 'MoodTunes AI Team' }],
  creator: 'MoodTunes AI',
  publisher: 'MoodTunes AI',
  openGraph: {
    title: 'MoodTunes AI - Discover Music That Matches Your Mood',
    description: 'AI-powered music discovery app that curates playlists based on your current mood and emotions.',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MoodTunes AI',
    description: 'AI-powered music discovery app that curates playlists based on your current mood and emotions.',
  },
  robots: 'index, follow',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${inter.className} antialiased bg-luxury-black text-platinum`}>
        <AuthProvider>
          <div className="min-h-screen bg-luxury-black">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}