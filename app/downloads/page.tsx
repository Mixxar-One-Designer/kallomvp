'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/BottomNav'
import { Play, Download, Lock, CheckCircle, HardDrive, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function DownloadsPage() {
  const [movies, setMovies] = useState<any[]>([])
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set())
  const [userRoles, setUserRoles] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState<string | null>(null)
  const router = useRouter()

  const fetchData = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const [profileResult, unlocksResult] = await Promise.all([
      supabase.from('users').select('roles').eq('id', user.id).single(),
      supabase.from('unlocks').select(`
        id,
        created_at,
        movies (
          id,
          title,
          thumbnail_url,
          file_url,
          price,
          description
        )
      `).eq('user_id', user.id).eq('used', true).order('created_at', { ascending: false })
    ])

    setUserRoles(profileResult.data?.roles || [])
    const moviesList = unlocksResult.data?.map(u => u.movies).filter(Boolean) || []
    setMovies(moviesList)

    // Get downloaded movies from localStorage
    const savedDownloads = localStorage.getItem('kallo_downloads')
    if (savedDownloads) {
      setDownloadedIds(new Set(JSON.parse(savedDownloads)))
    }

    setLoading(false)
  }, [router])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchData()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [fetchData])

  const handleDownload = async (movie: any) => {
    if (!movie.file_url) {
      toast.error('No download link')
      return
    }

    setDownloading(movie.id)

    try {
      const response = await fetch(movie.file_url)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${movie.id}.mp4`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      const newDownloads = new Set(downloadedIds)
      newDownloads.add(movie.id)
      setDownloadedIds(newDownloads)
      localStorage.setItem('kallo_downloads', JSON.stringify([...newDownloads]))

      toast.success(`Downloaded ${movie.title} - Ready to share!`)
    } catch (err) {
      toast.error('Download failed')
    } finally {
      setDownloading(null)
    }
  }

  const handleDeleteDownload = (movieId: string, movieTitle: string) => {
    const newDownloads = new Set(downloadedIds)
    newDownloads.delete(movieId)
    setDownloadedIds(newDownloads)
    localStorage.setItem('kallo_downloads', JSON.stringify([...newDownloads]))
    toast.success(`Removed ${movieTitle} from device`)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-dark">
        <div className="text-primary">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark pb-20">
      <div className="p-4 pt-8">
        <h1 className="text-2xl font-bold text-white">My Library</h1>
        <p className="mb-6 text-gray-500">Movies you own forever</p>

        {movies.length === 0 ? (
          <div className="py-12 text-center">
            <Lock className="mx-auto h-12 w-12 text-gray-600" />
            <p className="mt-2 text-gray-500">No unlocked movies yet</p>
            <p className="text-sm text-gray-600">Get a code from an agent or pay to unlock</p>
          </div>
        ) : (
          <div className="space-y-3">
            {movies.map((movie) => {
              const isDownloaded = downloadedIds.has(movie.id)
              return (
                <div key={movie.id} className="flex items-center gap-4 rounded-2xl bg-card p-3">
                  <div className="relative h-20 w-16 overflow-hidden rounded-lg bg-border">
                    <img src={movie.thumbnail_url || '/placeholder.jpg'} alt={movie.title} className="h-full w-full object-cover" />
                    <div className="absolute bottom-1 right-1">
                      <CheckCircle className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">{movie.title}</h3>
                    <p className="text-xs text-gray-500">Unlocked forever</p>
                    {isDownloaded && (
                      <p className="text-xs text-green-500 flex items-center gap-1 mt-1">
                        <HardDrive className="h-3 w-3" />
                        Downloaded • Ready to share
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/player/${movie.id}`)}
                      className="rounded-full bg-primary/20 p-2 hover:bg-primary/30"
                    >
                      <Play className="h-5 w-5 text-primary" />
                    </button>
                    {!isDownloaded ? (
                      <button
                        onClick={() => handleDownload(movie)}
                        disabled={downloading === movie.id}
                        className="rounded-full bg-primary/20 p-2 hover:bg-primary/30 disabled:opacity-50"
                      >
                        <Download className="h-5 w-5 text-primary" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDeleteDownload(movie.id, movie.title)}
                        className="rounded-full bg-red-500/20 p-2 hover:bg-red-500/30"
                      >
                        <Trash2 className="h-5 w-5 text-red-500" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <BottomNav role={userRoles} />
    </div>
  )
}