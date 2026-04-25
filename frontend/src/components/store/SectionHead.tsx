import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

interface SectionHeadProps {
  label: string
  title: string
  link?: string
  linkLabel?: string
}

export function SectionHead({ label, title, link, linkLabel }: SectionHeadProps) {
  return (
    <div className="flex items-end justify-between mb-7">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1.5">{label}</p>
        <h2 className="text-2xl md:text-3xl font-bold text-navy" style={{ letterSpacing: '-0.44px' }}>{title}</h2>
      </div>
      {link && (
        <Link
          href={link}
          className="flex items-center gap-1 text-sm font-bold text-primary hover:text-primary-dark transition-colors group shrink-0"
        >
          {linkLabel ?? 'See all'}
          <ChevronRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
        </Link>
      )}
    </div>
  )
}
