'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Clock, ChevronRight } from 'lucide-react'
import type { PromotionOut } from '@/types'

function getPromoGradient(title: string): string {
  const t = title.toLowerCase()
  if (t.includes('dashain') || t.includes('tihar') || t.includes('festival') || t.includes('puja'))
    return 'linear-gradient(135deg, #C8102E 0%, #E07830 55%, #D4A843 100%)'
  if (t.includes('fresh') || t.includes('produce') || t.includes('vegetable') || t.includes('fruit') || t.includes('organic'))
    return 'linear-gradient(135deg, #14532d 0%, #16a34a 55%, #4ade80 100%)'
  if (t.includes('dairy') || t.includes('milk') || t.includes('cheese') || t.includes('butter'))
    return 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 55%, #60a5fa 100%)'
  if (t.includes('beverage') || t.includes('drink') || t.includes('juice') || t.includes('water'))
    return 'linear-gradient(135deg, #0c4a6e 0%, #0ea5e9 55%, #7dd3fc 100%)'
  if (t.includes('snack') || t.includes('chips') || t.includes('biscuit') || t.includes('chocolate'))
    return 'linear-gradient(135deg, #78350f 0%, #d97706 55%, #fde68a 100%)'
  if (t.includes('baby') || t.includes('kid') || t.includes('child') || t.includes('infant'))
    return 'linear-gradient(135deg, #701a75 0%, #a855f7 55%, #f0abfc 100%)'
  if (t.includes('household') || t.includes('cleaning') || t.includes('home') || t.includes('kitchen'))
    return 'linear-gradient(135deg, #134e4a 0%, #0d9488 55%, #5eead4 100%)'
  if (t.includes('personal') || t.includes('care') || t.includes('beauty') || t.includes('skin'))
    return 'linear-gradient(135deg, #881337 0%, #f43f5e 55%, #fda4af 100%)'
  if (t.includes('sale') || t.includes('deal') || t.includes('discount') || t.includes('off') || t.includes('offer'))
    return 'linear-gradient(135deg, #7f1d1d 0%, #E07830 55%, #D4A843 100%)'
  if (t.includes('dhamaka') || t.includes('mega') || t.includes('grand') || t.includes('week'))
    return 'linear-gradient(135deg, #312e81 0%, #7c3aed 50%, #E07830 100%)'
  return 'linear-gradient(135deg, #1A2D40 0%, #E07830 55%, #D4A843 100%)'
}

function getPromoEmoji(title: string): string {
  const t = title.toLowerCase()
  if (t.includes('dashain') || t.includes('tihar') || t.includes('festival')) return '🎉'
  if (t.includes('fresh') || t.includes('produce') || t.includes('vegetable')) return '🥦'
  if (t.includes('fruit')) return '🍎'
  if (t.includes('dairy') || t.includes('milk')) return '🥛'
  if (t.includes('butter') || t.includes('ghee')) return '🧈'
  if (t.includes('beverage') || t.includes('drink') || t.includes('juice')) return '🥤'
  if (t.includes('snack') || t.includes('chips')) return '🍿'
  if (t.includes('chocolate') || t.includes('sweet')) return '🍫'
  if (t.includes('baby') || t.includes('kid')) return '🍼'
  if (t.includes('household') || t.includes('cleaning')) return '🧹'
  if (t.includes('personal') || t.includes('beauty') || t.includes('care')) return '✨'
  if (t.includes('sale') || t.includes('deal') || t.includes('off')) return '🏷️'
  if (t.includes('dhamaka') || t.includes('mega') || t.includes('grand')) return '🎊'
  return '🛒'
}

export function PromotionTile({ promo }: { promo: PromotionOut; index?: number }) {
  const [imgError, setImgError] = useState(false)
  const showGradient = !promo.image_url || imgError

  const content = (
    <div className="group bg-white rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover hover:-translate-y-1.5 transition-all duration-200">
      <div className="h-48 relative overflow-hidden flex items-center justify-center">
        {!showGradient ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={promo.image_url!}
              alt={promo.title}
              onError={() => setImgError(true)}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          </>
        ) : (
          <>
            <div
              className="absolute inset-0 group-hover:scale-105 transition-transform duration-500"
              style={{ background: getPromoGradient(promo.title) }}
            />
            <div className="absolute inset-0 opacity-10"
              style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '32px 32px' }}
            />
            <div className="relative flex flex-col items-center justify-center gap-2 px-4 text-center">
              <span className="text-4xl select-none drop-shadow-lg">{getPromoEmoji(promo.title)}</span>
              <p className="text-white font-extrabold text-base leading-snug drop-shadow-md max-w-[180px]">
                {promo.title}
              </p>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          </>
        )}
        <p className="absolute bottom-3 left-4 right-4 text-white font-bold text-sm leading-snug line-clamp-2 drop-shadow-sm">
          {showGradient ? '' : promo.title}
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
