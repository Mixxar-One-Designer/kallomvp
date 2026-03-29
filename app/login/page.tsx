'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async () => {
    if (!email || !password) {
      toast.error('Enter email and password')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Logged in!')
      router.push('/home')
    }
  }

  const handleSignup = async () => {
    if (!email || !password) {
      toast.error('Enter email and password')
      return
    }
    if (!name) {
      toast.error('Enter your name')
      return
    }

    setLoading(true)
    const supabase = createClient()
    
    // Sign up the user
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: { name },
      }
    })
    
    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }
    
    if (data.user) {
      // Create user profile
      const { error: profileError } = await supabase.from('users').insert({
        id: data.user.id,
        email: email,
        name: name,
        roles: ['viewer'],
        wallet_balance: 0,
      })
      
      if (profileError) {
        console.error('Profile error:', profileError)
      }
      
      // Automatically log in after signup
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      
      if (signInError) {
        toast.error('Account created but auto-login failed. Please login manually.')
        setIsLogin(true)
      } else {
        toast.success('Account created! Logged in automatically.')
        router.push('/home')
      }
    }
    
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-dark p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="relative inline-block">
            <div className="text-6xl font-black tracking-tight">
              <span className="text-white">KALL</span>
              <span className="relative inline-block h-14 w-14">
                <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
                  <circle cx="50" cy="50" r="45" fill="#F5B301" stroke="none" />
                  <polygon points="65,50 40,35 40,65" fill="#0B0F1A" />
                </svg>
              </span>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-500">Watch. Unlock. Enjoy.</p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {!isLogin && (
            <input
              type="text"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl bg-card p-4 text-white placeholder:text-gray-500 focus:border-primary focus:outline-none"
            />
          )}
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-2xl bg-card p-4 text-white placeholder:text-gray-500 focus:border-primary focus:outline-none"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (isLogin ? handleLogin() : handleSignup())}
            className="w-full rounded-2xl bg-card p-4 text-white placeholder:text-gray-500 focus:border-primary focus:outline-none"
          />

          <button
            onClick={isLogin ? handleLogin : handleSignup}
            disabled={loading}
            className="w-full rounded-2xl bg-primary py-4 font-bold text-black transition hover:bg-yellow-400 disabled:opacity-50"
          >
            {loading ? 'Processing...' : isLogin ? 'Login' : 'Create Account'}
          </button>

          <div className="text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin)
                setName('')
                setPassword('')
                setEmail('')
              }}
              className="text-sm text-primary hover:underline"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Login"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}