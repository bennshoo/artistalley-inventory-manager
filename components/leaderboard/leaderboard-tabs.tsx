'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ProductImage } from '@/components/products/product-image'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export interface LeaderRow {
  id: string
  name: string
  sku: string
  image_url: string | null
  qty: number
  cogs: number
}

export interface GroupRow {
  name: string
  qty: number
}

const rankStyles: Record<number, string> = {
  1: 'bg-amber-400 text-amber-950',
  2: 'bg-zinc-300 text-zinc-800',
  3: 'bg-orange-400 text-orange-950',
}

const TABS = [
  { id: 'products', label: 'Products' },
  { id: 'collections', label: 'Collections' },
  { id: 'categories', label: 'Categories' },
] as const

type TabId = typeof TABS[number]['id']

function GroupList({ rows }: { rows: GroupRow[] }) {
  return (
    <Card>
      <CardContent className="pt-4">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sales recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {rows.map(r => (
              <div key={r.name} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                <span>{r.name}</span>
                <Badge variant="secondary">{r.qty} units</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function LeaderboardTabs({
  products, categories, collections,
}: { products: LeaderRow[]; categories: GroupRow[]; collections: GroupRow[] }) {
  const [tab, setTab] = useState<TabId>('products')

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'px-3 py-2 text-sm font-medium -mb-px border-b-2 transition-colors',
              tab === t.id
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'products' ? (
        <Card>
          <CardContent className="pt-4">
            {products.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sales recorded yet.</p>
            ) : (
              <div className="space-y-1">
                <div className="grid grid-cols-[2rem_1fr_auto_auto] sm:grid-cols-[2.5rem_1fr_6rem_7rem] items-center gap-3 px-2 pb-2 text-xs font-medium text-muted-foreground border-b">
                  <span className="text-center">#</span>
                  <span>Product</span>
                  <span className="text-right">Sold</span>
                  <span className="text-right">COGS</span>
                </div>
                {products.map((p, i) => {
                  const rank = i + 1
                  return (
                    <div
                      key={p.id}
                      className="grid grid-cols-[2rem_1fr_auto_auto] sm:grid-cols-[2.5rem_1fr_6rem_7rem] items-center gap-3 px-2 py-2 rounded-md hover:bg-muted/50 transition-colors"
                    >
                      <span
                        className={cn(
                          'flex items-center justify-center h-6 w-6 rounded-full text-xs font-semibold mx-auto',
                          rankStyles[rank] ?? 'bg-muted text-muted-foreground',
                        )}
                      >
                        {rank}
                      </span>
                      <Link href={`/products/${p.id}`} className="flex items-center gap-3 min-w-0 group">
                        <ProductImage url={p.image_url} name={p.name} size={40} />
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate group-hover:underline">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.sku}</p>
                        </div>
                      </Link>
                      <span className="text-right text-sm font-medium tabular-nums">{p.qty}</span>
                      <span className="text-right text-sm text-muted-foreground tabular-nums">
                        ${p.cogs.toFixed(2)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      ) : tab === 'collections' ? (
        <GroupList rows={collections} />
      ) : (
        <GroupList rows={categories} />
      )}
    </div>
  )
}
