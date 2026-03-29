'use client'

import { useRouter } from 'next/navigation'
import { Lock, Play } from 'lucide-react'

export type MovieCardProps = {
  id: string
  title: string
  thumbnail_url?: string
  price: number
  is_series: boolean
  season_number?: number
  episode_number?: number
}

export default function MovieCard({
  movie,
  unlocked,
}: {
  movie: MovieCardProps
  unlocked: boolean
}) {
  const router = useRouter()

  return (
    <div
      onClick={() => router.push(`/movie/${movie.id}`)}
      className="group cursor-pointer"
    >
      {/* Thumbnail container */}
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-card shadow-lg">
        {movie.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={movie.thumbnail_url}
            alt={movie.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl">🎬</div>
        )}

        {/* Price badge */}
        <div className="absolute right-2 top-2 rounded-md bg-black/70 px-1.5 py-0.5 text-xs font-bold text-primary">
          ₦{movie.price}
        </div>

        {/* Lock/Play overlay (optional) */}
        <div className="absolute bottom-2 left-2 rounded-full bg-black/70 p-1">
          {unlocked ? (
            <Play className="h-3 w-3 text-primary" />
          ) : (
            <Lock className="h-3 w-3 text-gray-400" />
          )}
        </div>

        {/* Hover overlay with "Watch now" text */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="rounded-full bg-primary px-3 py-1 text-sm font-bold text-black">
            {unlocked ? 'Watch' : 'Unlock'}
          </span>
        </div>
      </div>

      {/* Title and metadata */}
      <div className="mt-2">
        <h3 className="truncate text-sm font-medium text-white group-hover:text-primary">
          {movie.title}
        </h3>
        <p className="text-xs text-gray-500">
          {movie.is_series
            ? `S${movie.season_number} E${movie.episode_number}`
            : 'Movie'}
        </p>
      </div>
    </div>
  )
}