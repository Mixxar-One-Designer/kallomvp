'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/BottomNav'
import { ArrowLeft, Plus, Edit, Users, DollarSign, Upload, Image, Video, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ProducerPage() {
  const [movies, setMovies] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [stats, setStats] = useState({ totalUnlocks: 0, totalEarnings: 0 })
  const router = useRouter()
  
  const thumbnailInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    title: '',
    description: '',
    price: 100,
    video_url: '',
    thumbnail_url: '',
    trailer_url: '',
    is_series: false,
    series_name: '',
    episode_number: 1,
    season_number: 1,
  })

  useEffect(() => {
    const fetch = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profileData } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!profileData?.roles?.includes('producer')) {
        toast.error('Producer access only')
        router.push('/home')
        return
      }

      setProfile(profileData)

      const { data: moviesData } = await supabase
        .from('movies')
        .select('*')
        .eq('producer_id', user.id)
        .order('created_at', { ascending: false })

      setMovies(moviesData || [])

      // Calculate stats
      let totalUnlocks = 0
      let totalEarnings = 0
      for (const movie of moviesData || []) {
        const { data: unlocks } = await supabase
          .from('unlocks')
          .select('amount')
          .eq('movie_id', movie.id)
          .eq('used', true)
        
        const count = unlocks?.length || 0
        totalUnlocks += count
        totalEarnings += count * movie.price
      }
      setStats({ totalUnlocks, totalEarnings })

      setLoading(false)
    }
    fetch()
  }, [router])

  const uploadFile = async (file: File, type: 'thumbnail' | 'video'): Promise<string | null> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      
      const data = await response.json()
      if (response.ok) {
        return data.url
      } else {
        toast.error(data.error || `Failed to upload ${type}`)
        return null
      }
    } catch (error) {
      toast.error(`Failed to upload ${type}`)
      return null
    }
  }

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }

    setUploadingThumbnail(true)
    const url = await uploadFile(file, 'thumbnail')
    if (url) {
      setForm({ ...form, thumbnail_url: url })
      toast.success('Thumbnail uploaded!')
    }
    setUploadingThumbnail(false)
  }

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('video/')) {
      toast.error('Please upload a video file')
      return
    }

    setUploadingVideo(true)
    const url = await uploadFile(file, 'video')
    if (url) {
      setForm({ ...form, video_url: url })
      toast.success('Video uploaded!')
    }
    setUploadingVideo(false)
  }

  const uploadMovie = async () => {
    if (!form.title || !form.video_url) {
      toast.error('Title and video are required')
      return
    }

    setUploading(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const { error } = await supabase.from('movies').insert({
        producer_id: user?.id,
        title: form.title,
        description: form.description,
        price: form.price,
        video_url: form.video_url,
        thumbnail_url: form.thumbnail_url || null,
        trailer_url: form.trailer_url || null,
        is_series: form.is_series,
        series_name: form.is_series ? form.series_name : null,
        episode_number: form.is_series ? form.episode_number : null,
        season_number: form.is_series ? form.season_number : null,
        status: 'active',
      })

      if (error) throw error

      toast.success('Movie uploaded!')
      setShowUpload(false)
      setForm({
        title: '', description: '', price: 100, video_url: '', thumbnail_url: '', trailer_url: '',
        is_series: false, series_name: '', episode_number: 1, season_number: 1,
      })
      window.location.reload()

    } catch (error: any) {
      toast.error(error.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
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
        <button
          onClick={() => router.back()}
          className="mb-4 flex items-center gap-2 text-gray-400 hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" /> Back
        </button>

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white">Producer Dashboard</h1>
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="rounded-full bg-primary p-2 hover:bg-yellow-400 transition"
          >
            <Plus className="h-5 w-5 text-black" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="rounded-2xl bg-card p-4 text-center">
            <Users className="mx-auto mb-2 h-6 w-6 text-primary" />
            <p className="text-2xl font-bold text-white">{stats.totalUnlocks}</p>
            <p className="text-xs text-gray-500">Total Unlocks</p>
          </div>
          <div className="rounded-2xl bg-card p-4 text-center">
            <DollarSign className="mx-auto mb-2 h-6 w-6 text-primary" />
            <p className="text-2xl font-bold text-white">₦{stats.totalEarnings}</p>
            <p className="text-xs text-gray-500">Total Earnings</p>
          </div>
        </div>

        {/* Upload Form */}
        {showUpload && (
          <div className="mb-6 rounded-2xl bg-card p-6">
            <h2 className="mb-4 font-bold text-white">Upload New Movie</h2>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Title*"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full rounded-xl bg-dark p-3 text-white"
              />
              
              <textarea
                placeholder="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full rounded-xl bg-dark p-3 text-white"
                rows={3}
              />
              
              {/* Thumbnail Upload */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Thumbnail Image</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Or enter URL"
                    value={form.thumbnail_url}
                    onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })}
                    className="flex-1 rounded-xl bg-dark p-3 text-white"
                  />
                  <input
                    type="file"
                    ref={thumbnailInputRef}
                    accept="image/*"
                    onChange={handleThumbnailUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => thumbnailInputRef.current?.click()}
                    disabled={uploadingThumbnail}
                    className="rounded-xl bg-primary px-4 py-3 text-black font-bold disabled:opacity-50"
                  >
                    {uploadingThumbnail ? <Upload className="h-5 w-5 animate-spin" /> : <Image className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              
              {/* Video Upload */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Video File*</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Or enter URL"
                    value={form.video_url}
                    onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                    className="flex-1 rounded-xl bg-dark p-3 text-white"
                  />
                  <input
                    type="file"
                    ref={videoInputRef}
                    accept="video/*"
                    onChange={handleVideoUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => videoInputRef.current?.click()}
                    disabled={uploadingVideo}
                    className="rounded-xl bg-primary px-4 py-3 text-black font-bold disabled:opacity-50"
                  >
                    {uploadingVideo ? <Upload className="h-5 w-5 animate-spin" /> : <Video className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              
              {/* Trailer URL */}
              <input
                type="text"
                placeholder="Trailer URL (YouTube embed link)"
                value={form.trailer_url}
                onChange={(e) => setForm({ ...form, trailer_url: e.target.value })}
                className="w-full rounded-xl bg-dark p-3 text-white"
              />
              
              {/* Price Select */}
              <select
                value={form.price}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                className="w-full rounded-xl bg-dark p-3 text-white"
              >
                <option value={50}>₦50</option>
                <option value={100}>₦100</option>
                <option value={125}>₦125</option>
                <option value={150}>₦150</option>
              </select>
              
              {/* Series Checkbox */}
              <label className="flex items-center gap-2 text-white">
                <input
                  type="checkbox"
                  checked={form.is_series}
                  onChange={(e) => setForm({ ...form, is_series: e.target.checked })}
                />
                This is a series
              </label>
              
              {form.is_series && (
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Series name"
                    value={form.series_name}
                    onChange={(e) => setForm({ ...form, series_name: e.target.value })}
                    className="rounded-xl bg-dark p-3 text-white"
                  />
                  <input
                    type="number"
                    placeholder="Season"
                    value={form.season_number}
                    onChange={(e) => setForm({ ...form, season_number: Number(e.target.value) })}
                    className="rounded-xl bg-dark p-3 text-white"
                  />
                  <input
                    type="number"
                    placeholder="Episode"
                    value={form.episode_number}
                    onChange={(e) => setForm({ ...form, episode_number: Number(e.target.value) })}
                    className="rounded-xl bg-dark p-3 text-white"
                  />
                </div>
              )}
              
              <button
                onClick={uploadMovie}
                disabled={uploading}
                className="w-full rounded-xl bg-primary py-3 font-bold text-black disabled:opacity-50 hover:bg-yellow-400 transition"
              >
                {uploading ? 'Uploading...' : 'Upload Movie'}
              </button>
            </div>
          </div>
        )}

        {/* Movies List */}
        <h2 className="mb-3 font-bold text-white">Your Movies</h2>
        {movies.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No movies uploaded yet</p>
        ) : (
          <div className="space-y-3">
            {movies.map((movie) => (
              <div key={movie.id} className="flex items-center gap-3 rounded-2xl bg-card p-3">
                <div className="h-16 w-12 overflow-hidden rounded-lg bg-border">
                  {movie.thumbnail_url && (
                    <img src={movie.thumbnail_url} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-white">{movie.title}</p>
                  <p className="text-xs text-gray-500">₦{movie.price} • {movie.is_series ? 'Series' : 'Movie'}</p>
                  <p className="text-xs text-primary">{movie.unlock_count || 0} unlocks</p>
                </div>
                <Edit className="h-5 w-5 text-gray-500" />
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav role={profile?.roles} />
    </div>
  )
}