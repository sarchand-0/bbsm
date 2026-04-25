'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Clock, ChevronRight } from 'lucide-react'
import type { PromotionOut } from '@/types'

export function PromotionTile({ promo }: { promo: PromotionOut; index?: number }) {
  const [imgError, setImgError] = useState(false)

  const content = (
    <div className="group bg-white rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover hover:-translate-y-1.5 transition-all duration-200">
      <div className="h-48 bg-primary-light relative overflow-hidden flex items-center justify-center">
        {promo.image_url && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={promo.image_url}
            alt={promo.title}
            onError={() => setImgError(true)}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <span className="text-5xl font-bold text-primary/10 select-none tracking-widest">BBSM</span>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <p className="absolute bottom-3 left-4 right-4 text-white font-bold text-sm leading-snug line-clamp-2 drop-shadow-sm">
          {promo.title}
        </p>
      </div>
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Clock size={11} className="text-gray-400" />
          {promo.ends_at ? (
            <p className="text-xs text-gray-400">
              Until {new Date(promo.ends_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </p>
          ) : (
            <p className="text-xs text-gray-400">Ongoing</p>
          )}
        </div>
        <span className="text-xs font-bold text-primary flex items-center gap-1 group-hover:gap-1.5 transition-all">
          View deal <ChevronRight size={12} />
        </span>
      </div>
    </div>
  )

  if (promo.link_url) {
    return <Link href={promo.link_url}>{content}</Link>
  }
  return content
}
