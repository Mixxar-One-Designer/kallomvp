'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SplashScreen() {
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      setTimeout(() => {
        if (user) {
          router.push('/home')
        } else {
          router.push('/login')
        }
      }, 1500)
    }

    checkUser()
  }, [router])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-dark">
      <div className="relative inline-block">
        <div className="text-7xl font-black tracking-tight">
          <span className="text-white">KALL</span>
          <span className="relative inline-block h-16 w-16">
            <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
              <circle cx="50" cy="50" r="45" fill="#F5B301" stroke="none" />
              <polygon points="65,50 40,35 40,65" fill="#0B0F1A" />
            </svg>
          </span>
        </div>
      </div>
      <p className="mt-4 text-sm text-gray-500">Watch. Unlock. Enjoy.</p>
    </div>
  )
}