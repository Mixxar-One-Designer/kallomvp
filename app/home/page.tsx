'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/BottomNav'
import { Search, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function HomePage() {
  const [movies, setMovies] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const fetchData = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    // Get user profile and movies in parallel
    const [profileResult, moviesResult, unlocksResult] = await Promise.all([
      supabase.from('users').select('*').eq('id', user.id).single(),
      supabase.from('movies').select('*').eq('status', 'active').order('created_at', { ascending: false }),
      supabase.from('unlocks').select('movie_id').eq('user_id', user.id).eq('used', true)
    ])

    setUser(profileResult.data)

    const unlockedIds = new Set(unlocksResult.data?.map(u => u.movie_id) || [])
    const moviesWithStatus = moviesResult.data?.map(movie => ({
      ...movie,
      unlocked: unlockedIds.has(movie.id)
    })) || []

    setMovies(moviesWithStatus)
    setLoading(false)
  }, [router])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Refresh when page becomes visible (coming back from another page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchData()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [fetchData])

  const filtered = movies.filter(m => m.title.toLowerCase().includes(search.toLowerCase()))

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-dark">
        <div className="text-primary">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark pb-20">
      <div className="sticky top-0 z-10 border-b border-border bg-dark/95 p-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="text-3xl font-bold">
            <span className="text-white">KALL</span>
            <span className="text-primary">◉</span>
          </div>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search movies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-full bg-card py-2 pl-10 pr-4 text-white"
            />
          </div>
          <button
            onClick={() => router.push('/profile')}
            className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center"
          >
            <span className="text-primary font-bold">{user?.name?.charAt(0).toUpperCase() || 'U'}</span>
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-7xl p-4">
        <h2 className="mb-4 text-xl font-bold text-white">Latest Releases</h2>
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-500">No movies found</div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {filtered.map((movie) => (
              <div
                key={movie.id}
                onClick={() => router.push(`/movie/${movie.id}`)}
                className="group cursor-pointer"
              >
                <div className="relative aspect-video overflow-hidden rounded-xl bg-card">
                  <img
                    src={movie.thumbnail_url || '/placeholder.jpg'}
                    alt={movie.title}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                  <div className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-xs font-bold text-primary">
                    {movie.price === 0 ? 'FREE' : `₦${movie.price}`}
                  </div>
                  {movie.unlocked && (
                    <div className="absolute left-2 top-2 rounded-full bg-green-500/80 px-2 py-1 text-xs font-bold text-white flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Unlocked
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100">
                    <span className="rounded-full bg-primary px-3 py-1 text-sm font-bold text-black">
                      {movie.unlocked ? 'Watch' : 'Unlock'}
                    </span>
                  </div>
                </div>
                <h3 className="mt-2 truncate font-medium text-white">{movie.title}</h3>
                {movie.unlocked && (
                  <p className="text-xs text-green-500">✓ Unlocked</p>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <BottomNav role={user?.roles} />
    </div>
  )
}