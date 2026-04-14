'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Package, Truck, CalendarDays, BarChart3,
  SlidersHorizontal, Home, ChevronRight
} from 'lucide-react'

const nav = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/categories', label: 'Categories & Tags', icon: SlidersHorizontal },
  { href: '/suppliers', label: 'Suppliers & Restocks', icon: Truck },
  { href: '/events', label: 'Events', icon: CalendarDays },
  { href: '/adjustments', label: 'Adjustments', icon: SlidersHorizontal },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 border-r bg-muted/30 flex flex-col shrink-0">
      <div className="p-4 border-b">
        <h1 className="font-semibold text-sm tracking-tight">AA Inventory</h1>
        <p className="text-xs text-muted-foreground">Art Business</p>
      </div>
      <nav className="flex-1 p-2 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <Icon size={15} />
              {label}
              {active && <ChevronRight size={12} className="ml-auto" />}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
