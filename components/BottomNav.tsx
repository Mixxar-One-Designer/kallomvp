'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Home, Download, User, Briefcase, Film } from 'lucide-react'

export default function BottomNav({ role }: { role?: string | string[] }) {
  const pathname = usePathname()
  const router = useRouter()
  
  // Handle both string (old) and array (new) roles
  const roles = Array.isArray(role) ? role : role ? [role] : []

  const items = [
    { path: '/home', icon: Home, label: 'Home' },
    { path: '/downloads', icon: Download, label: 'Library' },
    { path: '/profile', icon: User, label: 'Profile' },
  ]

  if (roles.includes('agent')) {
    items.splice(2, 0, { path: '/agent', icon: Briefcase, label: 'Agent' })
  }

  if (roles.includes('producer')) {
    items.splice(2, 0, { path: '/producer', icon: Film, label: 'Produce' })
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-dark px-4 py-2 z-50">
      <div className="flex justify-around">
        {items.map((item) => {
          const active = pathname === item.path
          const Icon = item.icon
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className="flex flex-col items-center gap-1 transition-all active:scale-95"
            >
              <Icon
                className={`h-5 w-5 ${active ? 'text-primary' : 'text-gray-500'}`}
              />
              <span
                className={`text-xs ${active ? 'text-primary' : 'text-gray-500'}`}
              >
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}