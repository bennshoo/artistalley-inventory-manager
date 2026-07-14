'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Category, Collection } from '@/lib/database.types'
import { CategoryManager } from '@/components/categories/category-manager'
import { CollectionManager } from '@/components/categories/collection-manager'

const TABS = [
  { id: 'categories', label: 'Categories' },
  { id: 'collections', label: 'Collections' },
] as const

type TabId = typeof TABS[number]['id']

export function CategoriesTabs({
  categories, collections,
}: { categories: Category[]; collections: Collection[] }) {
  const [tab, setTab] = useState<TabId>('categories')

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

      {tab === 'categories' ? (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground max-w-md">
            Each product can only belong to one category. Category price dictates the base sale price.
          </p>
          <CategoryManager initialCategories={categories} />
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground max-w-md">
            Each product belongs to one collection or none.
          </p>
          <CollectionManager initialCollections={collections} />
        </div>
      )}
    </div>
  )
}
