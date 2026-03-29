'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Lock, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

export default function PlayerPage() {
  const { id } = useParams()
  const router = useRouter()
  const [movie, setMovie] = useState<any>(null)
  const [unlocked, setUnlocked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    const check = async () => {
      const supabase = createClient()
      
      const { data: movieData } = await supabase
        .from('movies')
        .select('*')
        .eq('id', id)
        .single()

      if (!movieData) {
        router.push('/home')
        return
      }

      setMovie(movieData)

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: unlockData } = await supabase
          .from('unlocks')
          .select('id')
          .eq('movie_id', id)
          .eq('user_id', user.id)
          .eq('used', true)
          .maybeSingle()
        setUnlocked(!!unlockData)
      }

      setLoading(false)
    }
    check()
  }, [id, router])

  const handleUnlock = async () => {
    if (!code || code.length !== 8) {
      toast.error('Enter 8-digit code')
      return
    }

    setVerifying(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: codeData } = await supabase
        .from('unlocks')
        .select('*')
        .eq('movie_id', id)
        .eq('unlock_code', code)
        .eq('used', false)
        .is('user_id', null)
        .maybeSingle()

      if (!codeData) {
        toast.error('Invalid code')
        setVerifying(false)
        return
      }

      await supabase
        .from('unlocks')
        .update({
          user_id: user.id,
          used: true,
          used_at: new Date().toISOString()
        })
        .eq('id', codeData.id)

      setUnlocked(true)
      toast.success('Unlocked!')
      window.location.reload()
    } catch (err) {
      toast.error('Failed')
    } finally {
      setVerifying(false)
    }
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-dark">Loading...</div>
  }

  if (!movie) return null

  if (!unlocked) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black p-6">
        <button onClick={() => router.back()} className="absolute left-4 top-4 text-white">
          ← Back
        </button>
        <Lock className="mb-6 h-16 w-16 text-primary" />
        <h2 className="mb-2 text-xl font-bold text-white">This movie is locked</h2>
        <p className="mb-6 text-center text-gray-400">Enter unlock code to watch</p>
        <input
          type="text"
          placeholder="8-digit code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={8}
          className="mb-4 w-full max-w-xs rounded-2xl bg-card p-4 text-center text-white"
        />
        <button
          onClick={handleUnlock}
          disabled={verifying || code.length !== 8}
          className="rounded-2xl bg-primary px-8 py-3 font-bold text-black disabled:opacity-50"
        >
          {verifying ? 'Verifying...' : 'Unlock'}
        </button>
        <button
          onClick={() => router.push(`/movie/${id}`)}
          className="mt-4 text-primary"
        >
          ← Back to movie
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black">
      <video
        src={movie.file_url}
        className="h-full w-full"
        controls
        autoPlay
        controlsList="nodownload"
      />
      <button
        onClick={() => router.back()}
        className="absolute left-4 top-4 rounded-full bg-black/50 p-2 text-white"
      >
        ← Back
      </button>
    </div>
  )
}