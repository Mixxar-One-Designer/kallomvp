'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/BottomNav'
import { User, LogOut, Shield, Film, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState(false)
  const router = useRouter()

  const fetchProfile = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        console.error('Auth error:', userError)
        router.push('/login')
        return
      }

      console.log('Current user:', user.id, user.email)

      // Try to get existing profile
      let { data, error: selectError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      console.log('Existing profile:', data, selectError)

      // If no profile exists, create one
      if (!data) {
        const insertData = {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          roles: ['viewer'],
          wallet_balance: 0,
        }
        
        console.log('Inserting profile:', insertData)
        
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert(insertData)
          .select()
          .single()
        
        if (insertError) {
          console.error('Insert error details:', insertError)
          toast.error('Failed to create profile: ' + insertError.message)
          setProfile({
            id: user.id,
            email: user.email,
            name: user.email?.split('@')[0] || 'User',
            roles: ['viewer'],
            wallet_balance: 0,
          })
        } else {
          data = newUser
          console.log('Profile created:', data)
        }
      }

      setProfile(data)
    } catch (err) {
      console.error('Unexpected error:', err)
      toast.error('Error loading profile')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchProfile()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [fetchProfile])

  const hasRole = (role: string) => {
    return profile?.roles?.includes(role) || false
  }

  const becomeAgent = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setUpgrading(true)

    const { data: current } = await supabase
      .from('users')
      .select('wallet_balance, roles')
      .eq('id', user.id)
      .single()

    const newBalance = (current?.wallet_balance || 0) + 100
    const currentRoles = current?.roles || ['viewer']
    const newRoles = [...currentRoles, 'agent']

    const { error } = await supabase
      .from('users')
      .update({ roles: newRoles, wallet_balance: newBalance })
      .eq('id', user.id)

    if (error) {
      toast.error('Failed: ' + error.message)
    } else {
      toast.success(`You are now an agent! ₦100 added.`)
      fetchProfile()
    }
    setUpgrading(false)
  }

  const becomeProducer = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setUpgrading(true)

    const { data: current } = await supabase
      .from('users')
      .select('roles')
      .eq('id', user.id)
      .single()

    const currentRoles = current?.roles || ['viewer']
    const newRoles = [...currentRoles, 'producer']

    const { error } = await supabase
      .from('users')
      .update({ roles: newRoles })
      .eq('id', user.id)

    if (error) {
      toast.error('Failed to become producer: ' + error.message)
    } else {
      toast.success('You are now a producer!')
      fetchProfile()
    }
    setUpgrading(false)
  }

  const logout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-dark">
        <div className="text-primary">Loading...</div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-dark p-4">
        <div className="text-primary mb-4">Error loading profile</div>
        <button
          onClick={() => window.location.reload()}
          className="rounded-2xl bg-primary px-6 py-2 font-bold text-black"
        >
          Retry
        </button>
      </div>
    )
  }

  const isAgent = hasRole('agent')
  const isProducer = hasRole('producer')
  const isViewer = !isAgent && !isProducer

  return (
    <div className="min-h-screen bg-dark pb-20">
      <div className="p-4 pt-8">
        <button
          onClick={() => router.back()}
          className="mb-4 flex items-center gap-2 text-gray-400 hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" /> Back
        </button>

        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary">
            <User className="h-8 w-8 text-black" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{profile.name || profile.email?.split('@')[0] || 'User'}</h1>
            <p className="text-sm text-gray-500">{profile.email}</p>
            <div className="mt-1 flex gap-2">
              {isAgent && <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs text-primary">⭐ Agent</span>}
              {isProducer && <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs text-primary">🎬 Producer</span>}
              {isViewer && <span className="text-xs text-gray-500">👤 Viewer</span>}
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-2xl bg-card p-4">
          <div className="flex justify-between">
            <span className="text-gray-400">Wallet Balance</span>
            <span className="text-2xl font-bold text-primary">₦{profile.wallet_balance || 0}</span>
          </div>
        </div>

        {!isAgent && (
          <button
            onClick={becomeAgent}
            disabled={upgrading}
            className="mb-4 w-full rounded-2xl bg-primary py-4 font-bold text-black disabled:opacity-50"
          >
            {upgrading ? 'Processing...' : 'Become an Agent (Get ₦100 Bonus)'}
          </button>
        )}

        {!isProducer && (
          <button
            onClick={becomeProducer}
            disabled={upgrading}
            className="mb-4 w-full rounded-2xl border border-primary py-4 font-bold text-primary disabled:opacity-50"
          >
            {upgrading ? 'Processing...' : 'Become a Producer'}
          </button>
        )}

        {(isAgent || isProducer) && (
          <div className="mb-4 space-y-2">
            {isAgent && (
              <button
                onClick={() => router.push('/agent')}
                className="w-full rounded-2xl bg-primary py-4 font-bold text-black"
              >
                Go to Agent Dashboard
              </button>
            )}
            {isProducer && (
              <button
                onClick={() => router.push('/producer')}
                className="w-full rounded-2xl bg-primary py-4 font-bold text-black"
              >
                Go to Producer Dashboard
              </button>
            )}
          </div>
        )}

        <button
          onClick={logout}
          className="w-full rounded-2xl bg-red-600 py-4 font-bold text-white"
        >
          Logout
        </button>
      </div>
      <BottomNav role={profile.roles} />
    </div>
  )
}