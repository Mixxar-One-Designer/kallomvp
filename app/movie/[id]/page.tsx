'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Play, Download, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { usePaystackPayment } from 'react-paystack'

export default function MoviePage() {
  const { id } = useParams()
  const router = useRouter()
  const [movie, setMovie] = useState<any>(null)
  const [unlocked, setUnlocked] = useState(false)
  const [showTrailer, setShowTrailer] = useState(false)
  const [loading, setLoading] = useState(true)
  const [unlockCode, setUnlockCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [isImported, setIsImported] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [paying, setPaying] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    
    // Fetch movie and user data in parallel
    const [movieResult, userResult] = await Promise.all([
      supabase.from('movies').select('*').eq('id', id).single(),
      supabase.auth.getUser()
    ])

    const movieData = movieResult.data
    if (!movieData) {
      toast.error('Movie not found')
      router.push('/home')
      return
    }

    setMovie(movieData)

    const user = userResult.data.user
    if (user) {
      setUserEmail(user.email || '')
      const { data: unlockData } = await supabase
        .from('unlocks')
        .select('id')
        .eq('movie_id', id)
        .eq('user_id', user.id)
        .eq('used', true)
        .maybeSingle()
      setUnlocked(!!unlockData)
    }

    // Check if imported
    const urlParams = new URLSearchParams(window.location.search)
    const imported = urlParams.get('imported')
    if (imported === 'true') {
      setIsImported(true)
      const pendingMovie = sessionStorage.getItem('pending_unlock_movie')
      if (pendingMovie === id) {
        toast('🔒 This movie is locked. Enter a code to unlock.', { duration: 4000, icon: '🔒' })
        sessionStorage.removeItem('pending_unlock_movie')
      }
    }

    setLoading(false)
  }, [id, router])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Refresh when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchData()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [fetchData])

  const handleFreeMovie = useCallback(async () => {
    if (!movie || movie.price !== 0) return

    setVerifying(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      setVerifying(false)
      return
    }
    
    const { data: existing } = await supabase
      .from('unlocks')
      .select('id')
      .eq('movie_id', id)
      .eq('user_id', user.id)
      .eq('used', true)
      .maybeSingle()
    
    if (existing) {
      setUnlocked(true)
      toast.success('Movie already in your library!')
      setVerifying(false)
      return
    }
    
    const { error } = await supabase.from('unlocks').insert({
      movie_id: id,
      user_id: user.id,
      amount: 0,
      used: true,
      unlock_code: `FREE_${Date.now()}`
    })
    
    if (error) {
      toast.error('Failed to add free movie')
    } else {
      setUnlocked(true)
      toast.success('Free movie added!')
      fetchData()
    }
    setVerifying(false)
  }, [movie, id, router, fetchData])

  const handleUnlock = useCallback(async () => {
    if (!movie) return
    if (!unlockCode || unlockCode.length !== 8) {
      toast.error('Enter 8-digit code')
      return
    }

    setVerifying(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      setVerifying(false)
      return
    }
    
    const { data: codeData } = await supabase
      .from('unlocks')
      .select('*')
      .eq('movie_id', id)
      .eq('unlock_code', unlockCode)
      .eq('used', false)
      .is('user_id', null)
      .maybeSingle()
    
    if (!codeData) {
      toast.error('Invalid or already used code')
      setVerifying(false)
      return
    }
    
    await supabase
      .from('unlocks')
      .update({ user_id: user.id, used: true, used_at: new Date().toISOString() })
      .eq('id', codeData.id)
    
    setUnlocked(true)
    toast.success('Movie unlocked forever!')
    
    if (isImported) {
      const imports = localStorage.getItem('kallo_imports')
      if (imports) {
        const importedFiles = JSON.parse(imports)
        const updatedImports = importedFiles.map((file: any) => 
          file.id === id ? { ...file, unlocked: true } : file
        )
        localStorage.setItem('kallo_imports', JSON.stringify(updatedImports))
      }
    }
    
    setVerifying(false)
    fetchData()
  }, [movie, id, unlockCode, router, isImported, fetchData])

  const handleDownload = useCallback(async () => {
    if (!movie?.file_url) {
      toast.error('No download link')
      return
    }
    
    setDownloading(true)
    
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
      
      const downloads = localStorage.getItem('kallo_downloads')
      const downloadsSet = downloads ? new Set(JSON.parse(downloads)) : new Set()
      downloadsSet.add(movie.id)
      localStorage.setItem('kallo_downloads', JSON.stringify([...downloadsSet]))
      
      toast.success(`Downloaded ${movie.title}`)
    } catch (err) {
      toast.error('Download failed')
    } finally {
      setDownloading(false)
    }
  }, [movie])

  // Paystack config
  const config = {
    reference: new Date().getTime().toString(),
    email: userEmail,
    amount: movie?.price ? movie.price * 100 : 0,
    publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!,
    currency: 'NGN',
  }
  const initializePayment = usePaystackPayment(config)

  const handlePayment = useCallback(() => {
    if (!movie || !userEmail) {
      toast.error('Please login to continue')
      router.push('/login')
      return
    }

    setPaying(true)
    
    initializePayment({
      onSuccess: async (reference: any) => {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          const { error } = await supabase.from('unlocks').insert({
            movie_id: id,
            user_id: user.id,
            amount: movie.price,
            used: true,
            unlock_code: `PAY_${reference.reference}`,
            payment_reference: reference.reference
          })
          
          if (error) {
            toast.error('Payment succeeded but unlock failed.')
          } else {
            setUnlocked(true)
            toast.success('Movie unlocked!')
            fetchData()
          }
        }
        setPaying(false)
      },
      onClose: () => {
        toast.error('Payment cancelled')
        setPaying(false)
      }
    })
  }, [movie, userEmail, id, router, initializePayment, fetchData])

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-dark">Loading...</div>
  }
  
  if (!movie) return null
  
  const isFree = movie.price === 0
  
  return (
    <div className="min-h-screen bg-dark pb-20">
      <button onClick={() => router.back()} className="absolute left-4 top-4 z-10 rounded-full bg-black/50 p-2 hover:bg-black/70">
        <ArrowLeft className="h-5 w-5 text-white" />
      </button>
      
      <div className="relative aspect-video w-full bg-card">
        {showTrailer && movie.trailer_url ? (
          <iframe src={movie.trailer_url} className="h-full w-full" allowFullScreen title={`${movie.title} Trailer`} />
        ) : (
          <>
            <img src={movie.thumbnail_url || '/placeholder.jpg'} alt={movie.title} className="h-full w-full object-cover" />
            {movie.trailer_url && (
              <button onClick={() => setShowTrailer(true)} className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/60 transition">
                <div className="rounded-full bg-primary p-4">
                  <Play className="h-8 w-8 text-black" />
                </div>
              </button>
            )}
          </>
        )}
      </div>
      
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{movie.title}</h1>
            <p className="mt-2 text-gray-400">{movie.description || 'No description'}</p>
            {isImported && !unlocked && (
              <p className="mt-2 text-sm text-yellow-500 flex items-center gap-1">🔒 Imported file - Enter code to unlock</p>
            )}
          </div>
          {unlocked && (
            <div className="flex items-center gap-1 rounded-full bg-green-500/20 px-3 py-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-xs text-green-500">Unlocked</span>
            </div>
          )}
        </div>
        
        <div className="mt-4 flex items-center gap-2">
          <span className="text-primary text-xl font-bold">{isFree ? 'FREE' : `₦${movie.price}`}</span>
        </div>
        
        {!unlocked ? (
          <div className="mt-6 space-y-3">
            {movie.trailer_url && !showTrailer && (
              <button onClick={() => setShowTrailer(true)} className="w-full rounded-2xl border border-primary py-4 font-bold text-primary flex items-center justify-center gap-2">
                <Play className="h-5 w-5" /> Watch Trailer
              </button>
            )}
            
            {isFree ? (
              <button onClick={handleFreeMovie} disabled={verifying} className="w-full rounded-2xl bg-primary py-4 font-bold text-black disabled:opacity-50">
                {verifying ? 'Adding...' : 'Get Free Movie'}
              </button>
            ) : (
              <>
                <input type="text" placeholder="Enter 8-digit code" value={unlockCode} onChange={(e) => setUnlockCode(e.target.value.toUpperCase())} maxLength={8} className="w-full rounded-2xl bg-card p-4 text-center text-white text-lg tracking-widest" />
                <button onClick={handleUnlock} disabled={verifying || unlockCode.length !== 8} className="w-full rounded-2xl bg-primary py-4 font-bold text-black disabled:opacity-50">
                  {verifying ? 'Verifying...' : 'Unlock with Code'}
                </button>
                <div className="relative my-4"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border"></div></div><div className="relative flex justify-center text-xs"><span className="bg-dark px-2 text-gray-500">OR</span></div></div>
                <button onClick={handlePayment} disabled={paying} className="w-full rounded-2xl border border-primary py-4 font-bold text-primary disabled:opacity-50 hover:bg-primary/10 transition">
                  {paying ? 'Processing...' : `Pay ₦${movie.price} with Paystack`}
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            <button onClick={() => router.push(`/player/${id}`)} className="w-full rounded-2xl bg-primary py-4 font-bold text-black flex items-center justify-center gap-2">
              <Play className="h-5 w-5" /> Watch Now
            </button>
            {movie.trailer_url && !showTrailer && (
              <button onClick={() => setShowTrailer(true)} className="w-full rounded-2xl border border-primary py-4 font-bold text-primary flex items-center justify-center gap-2">
                <Play className="h-5 w-5" /> Watch Trailer Again
              </button>
            )}
            <button onClick={handleDownload} disabled={downloading} className="w-full rounded-2xl border border-primary py-4 font-bold text-primary disabled:opacity-50">
              <Download className="inline h-5 w-5 mr-2" /> {downloading ? 'Downloading...' : 'Download to Device'}
            </button>
            {!isFree && <p className="text-center text-xs text-gray-500">💡 Downloaded files can be shared via WhatsApp. Recipients must import and unlock.</p>}
          </div>
        )}
      </div>
    </div>
  )
}