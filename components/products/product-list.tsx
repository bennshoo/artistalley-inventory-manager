'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ProductImage } from '@/components/products/product-image'
import { toast } from 'sonner'
import { Loader2, Trash2, Tag, X, PowerOff, Power } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Category } from '@/lib/database.types'

interface Product {
  id: string
  name: string
  sku: string
  image_url: string | null
  quantity: number
  is_active: boolean
  category_id: string | null
  category: { name: string; base_price: number } | null
}

interface ProductListProps {
  products: Product[]
  categories: Category[]
}

export function ProductList({ products: initialProducts, categories }: ProductListProps) {
  const router = useRouter()
  const [products, setProducts] = useState(initialProducts)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [newCategoryId, setNewCategoryId] = useState('')
  const [loading, setLoading] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const allSelected = products.length > 0 && selected.size === products.length
  const someSelected = selected.size > 0
  const selectedProducts = products.filter(p => selected.has(p.id))
  const allSelectedActive = selectedProducts.every(p => p.is_active)
  const allSelectedInactive = selectedProducts.every(p => !p.is_active)

  function toggleAll() {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(products.map(p => p.id)))
  }

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function toggleActive(id: string, current: boolean) {
    setTogglingId(id)
    const { error } = await supabase.from('product').update({ is_active: !current }).eq('id', id)
    if (error) { toast.error(error.message); setTogglingId(null); return }
    setProducts(ps => ps.map(p => p.id === id ? { ...p, is_active: !current } : p))
    setTogglingId(null)
  }

  async function bulkSetActive(active: boolean) {
    setLoading(true)
    const ids = [...selected]
    const { error } = await supabase.from('product').update({ is_active: active }).in('id', ids)
    if (error) { toast.error(error.message); setLoading(false); return }
    setProducts(ps => ps.map(p => selected.has(p.id) ? { ...p, is_active: active } : p))
    toast.success(`${active ? 'Activated' : 'Deactivated'} ${ids.length} product${ids.length > 1 ? 's' : ''}`)
    setSelected(new Set())
    setLoading(false)
  }

  async function applyCategory() {
    setLoading(true)
    const ids = [...selected]
    const { error } = await supabase
      .from('product')
      .update({ category_id: newCategoryId === 'none' ? null : newCategoryId || null })
      .in('id', ids)
    if (error) { toast.error(error.message); setLoading(false); return }
    const cat = categories.find(c => c.id === newCategoryId)
    toast.success(`Updated ${ids.length} product${ids.length > 1 ? 's' : ''} → ${cat?.name ?? 'No category'}`)
    setCategoryDialogOpen(false)
    setSelected(new Set())
    setNewCategoryId('')
    setLoading(false)
    router.refresh()
  }

  async function deleteSelected() {
    setLoading(true)
    const ids = [...selected]
    const { error } = await supabase.from('product').delete().in('id', ids)
    if (error) { toast.error(error.message); setLoading(false); return }
    toast.success(`Deleted ${ids.length} product${ids.length > 1 ? 's' : ''}`)
    setDeleteDialogOpen(false)
    setSelected(new Set())
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="space-y-3">
      {/* Bulk action toolbar */}
      <div className={cn(
        'flex items-center gap-3 rounded-lg border px-4 py-2.5 bg-muted/50 transition-all',
        someSelected ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}>
        <span className="text-sm font-medium">{selected.size} selected</span>
        <div className="flex gap-2 ml-auto flex-wrap">
          <Button size="sm" variant="outline" onClick={() => setCategoryDialogOpen(true)}>
            <Tag size={13} className="mr-1" />Change Category
          </Button>
          {!allSelectedActive && (
            <Button size="sm" variant="outline" onClick={() => bulkSetActive(true)} disabled={loading}>
              <Power size={13} className="mr-1" />Activate
            </Button>
          )}
          {!allSelectedInactive && (
            <Button size="sm" variant="outline" onClick={() => bulkSetActive(false)} disabled={loading}>
              <PowerOff size={13} className="mr-1" />Deactivate
            </Button>
          )}
          <Button size="sm" variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
            <Trash2 size={13} className="mr-1" />Delete
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())} className="px-2">
            <X size={13} />
          </Button>
        </div>
      </div>

      {/* Select all row */}
      {products.length > 0 && (
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer w-fit">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="rounded"
          />
          {allSelected ? 'Deselect all' : 'Select all'}
        </label>
      )}

      {/* Product grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map(product => (
          <div
            key={product.id}
            className={cn(
              'border rounded-lg p-4 flex gap-3 relative transition-colors',
              selected.has(product.id) ? 'border-primary bg-primary/5' : 'hover:bg-muted/50',
              !product.is_active && 'opacity-50'
            )}
          >
            {/* Checkbox */}
            <input
              type="checkbox"
              checked={selected.has(product.id)}
              onChange={() => toggle(product.id)}
              className="absolute top-3 right-3 rounded cursor-pointer"
              onClick={e => e.stopPropagation()}
            />

            {/* Active toggle */}
            <button
              type="button"
              onClick={e => { e.stopPropagation(); toggleActive(product.id, product.is_active) }}
              disabled={togglingId === product.id}
              className={cn(
                'absolute bottom-3 right-3 transition-colors',
                product.is_active ? 'text-green-500 hover:text-muted-foreground' : 'text-muted-foreground hover:text-green-500'
              )}
              title={product.is_active ? 'Deactivate' : 'Activate'}
            >
              {togglingId === product.id
                ? <Loader2 size={13} className="animate-spin" />
                : product.is_active ? <Power size={13} /> : <PowerOff size={13} />
              }
            </button>

            {/* Clicking the card body navigates */}
            <Link
              href={`/products/${product.id}`}
              className="flex gap-3 flex-1 min-w-0"
              onClick={e => { if (selected.size > 0) e.preventDefault(); toggle(product.id) }}
            >
              <ProductImage url={product.image_url} name={product.name} size={56} />
              <div className="flex-1 min-w-0 pr-4">
                <p className="font-medium text-sm truncate">{product.name}</p>
                <p className="text-xs text-muted-foreground">{product.sku}</p>
                <div className="flex items-center gap-2 mt-1">
                  {product.category ? (
                    <Badge variant="secondary" className="text-xs px-1.5 py-0">
                      {product.category.name} · ${product.category.base_price.toFixed(2)}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">No category</span>
                  )}
                </div>
                <Badge
                  variant={product.quantity === 0 ? 'destructive' : product.quantity <= 5 ? 'outline' : 'secondary'}
                  className="text-xs mt-1"
                >
                  {product.quantity} in stock
                </Badge>
              </div>
            </Link>
          </div>
        ))}

        {products.length === 0 && (
          <div className="col-span-3 text-center py-12 text-muted-foreground text-sm">
            No products yet. <Link href="/products/new" className="underline">Add one.</Link>
          </div>
        )}
      </div>

      {/* Change category dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Category</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Apply to {selected.size} selected product{selected.size > 1 ? 's' : ''}.
          </p>
          <Select value={newCategoryId} onValueChange={v => setNewCategoryId(v ?? '')}>
            <SelectTrigger className="w-full">
              <span className={cn('flex-1 text-left text-sm', !newCategoryId ? 'text-muted-foreground' : '')}>
                {newCategoryId === 'none'
                  ? '— No category —'
                  : newCategoryId
                    ? (() => { const c = categories.find(x => x.id === newCategoryId); return c ? `${c.name} · $${c.base_price.toFixed(2)}` : 'Select category' })()
                    : 'Select category'}
              </span>
            </SelectTrigger>
            <SelectContent className="w-full min-w-(--anchor-width)">
              <SelectItem value="none">— No category —</SelectItem>
              {categories.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} · ${c.base_price.toFixed(2)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCategoryDialogOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={applyCategory} disabled={loading}>
              {loading && <Loader2 size={14} className="mr-1 animate-spin" />}Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {selected.size} product{selected.size > 1 ? 's' : ''}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete {selected.size} product{selected.size > 1 ? 's' : ''} and all associated restocks, sales, and adjustments. This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" size="sm" onClick={deleteSelected} disabled={loading}>
              {loading && <Loader2 size={14} className="mr-1 animate-spin" />}Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
