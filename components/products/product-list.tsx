'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ProductImage } from '@/components/products/product-image'
import { toast } from 'sonner'
import { Loader2, Trash2, Tag, X, PowerOff, Power, Search, ChevronDown, Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Category, Tag as TagType } from '@/lib/database.types'
import { getTagColor } from '@/lib/tag-colors'

interface Product {
  id: string
  name: string
  sku: string
  image_url: string | null
  quantity: number
  is_active: boolean
  category_id: string | null
  category: { name: string; base_price: number } | null
  product_tag: { tag_id: string }[]
}

interface ProductListProps {
  products: Product[]
  categories: Category[]
  tags: TagType[]
}

export function ProductList({ products: initialProducts, categories, tags }: ProductListProps) {
  const router = useRouter()
  const [products, setProducts] = useState(initialProducts)
  useEffect(() => { setProducts(initialProducts) }, [initialProducts])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [newCategoryId, setNewCategoryId] = useState('')
  const [loading, setLoading] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [activeTagIds, setActiveTagIds] = useState<Set<string>>(new Set())
  const [tagWarningOpen, setTagWarningOpen] = useState(false)
  const [tagEditOpen, setTagEditOpen] = useState(false)
  const [draftTagIds, setDraftTagIds] = useState<Set<string>>(new Set())
  const [showInactive, setShowInactive] = useState(true)
  const [showNeedsAttention, setShowNeedsAttention] = useState(false)
  const [filterCategoryId, setFilterCategoryId] = useState<string>('')
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false)

  function toggleTagFilter(id: string) {
    setActiveTagIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const filtered = products.filter(p => {
    const matchesSearch = !search.trim() ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.category?.name.toLowerCase().includes(search.toLowerCase())

    const matchesTags = activeTagIds.size === 0 ||
      p.product_tag.some(pt => activeTagIds.has(pt.tag_id))

    const matchesActive = showInactive || p.is_active

    const matchesCategory = !filterCategoryId || p.category_id === filterCategoryId

    const matchesNeedsAttention = !showNeedsAttention || (!p.is_active && !p.category_id)

    return matchesSearch && matchesTags && matchesActive && matchesCategory && matchesNeedsAttention
  })

  const allSelected = filtered.length > 0 && filtered.every(p => selected.has(p.id))
  const someSelected = selected.size > 0
  const selectedProducts = products.filter(p => selected.has(p.id))
  const allSelectedActive = selectedProducts.every(p => p.is_active)
  const allSelectedInactive = selectedProducts.every(p => !p.is_active)

  function toggleAll() {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(filtered.map(p => p.id)))
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
    if (!current) {
      const product = products.find(p => p.id === id)
      if (!product?.category_id) {
        toast.error('The product must be assigned to a category before it can be reactivated.')
        return
      }
    }
    setTogglingId(id)
    const { error } = await supabase.from('product').update({ is_active: !current }).eq('id', id)
    if (error) { toast.error(error.message); setTogglingId(null); return }
    setProducts(ps => ps.map(p => p.id === id ? { ...p, is_active: !current } : p))
    setTogglingId(null)
  }

  async function bulkSetActive(active: boolean) {
    if (active) {
      const missingCategory = selectedProducts.filter(p => !p.is_active && !p.category_id)
      if (missingCategory.length > 0) {
        toast.error(`${missingCategory.length} product${missingCategory.length > 1 ? 's' : ''} must be assigned to a category before being reactivated.`)
        return
      }
    }
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
    const newCatIdResolved = newCategoryId === 'none' ? null : newCategoryId || null
    const cat = categories.find(c => c.id === newCatIdResolved)
    setProducts(ps => ps.map(p =>
      selected.has(p.id)
        ? { ...p, category_id: newCatIdResolved, category: cat ? { name: cat.name, base_price: cat.base_price } : null }
        : p
    ))
    toast.success(`Updated ${ids.length} product${ids.length > 1 ? 's' : ''} → ${cat?.name ?? 'No category'}`)
    setCategoryDialogOpen(false)
    setSelected(new Set())
    setNewCategoryId('')
    setLoading(false)
  }

  function openModifyTags() {
    const tagSets = selectedProducts.map(p => new Set(p.product_tag.map(pt => pt.tag_id)))
    // Compute intersection for initial draft state
    const intersection = new Set(
      tags.filter(t => tagSets.every(s => s.has(t.id))).map(t => t.id)
    )
    setDraftTagIds(intersection)
    // Check if all selected products have identical tag sets
    const first = tagSets[0] ?? new Set()
    const different = tagSets.some(s => s.size !== first.size || [...s].some(id => !first.has(id)))
    if (different) {
      setTagWarningOpen(true)
    } else {
      setTagEditOpen(true)
    }
  }

  async function applyTags() {
    setLoading(true)
    const ids = [...selected]
    // Delete existing tags for all selected products then re-insert
    const { error: delError } = await supabase.from('product_tag').delete().in('product_id', ids)
    if (delError) { toast.error(delError.message); setLoading(false); return }

    if (draftTagIds.size > 0) {
      const rows = ids.flatMap(product_id => [...draftTagIds].map(tag_id => ({ product_id, tag_id })))
      const { error: insError } = await supabase.from('product_tag').insert(rows)
      if (insError) { toast.error(insError.message); setLoading(false); return }
    }

    const newProductTags = [...draftTagIds].map(tag_id => ({ tag_id }))
    setProducts(ps => ps.map(p => selected.has(p.id) ? { ...p, product_tag: newProductTags } : p))
    toast.success(`Tags updated for ${ids.length} product${ids.length > 1 ? 's' : ''}`)
    setTagEditOpen(false)
    setSelected(new Set())
    setLoading(false)
  }

  async function deleteSelected() {
    setLoading(true)
    const ids = [...selected]
    const { error } = await supabase.from('product').delete().in('id', ids)
    if (error) { toast.error(error.message); setLoading(false); return }
    setProducts(ps => ps.filter(p => !ids.includes(p.id)))
    toast.success(`Deleted ${ids.length} product${ids.length > 1 ? 's' : ''}`)
    setDeleteDialogOpen(false)
    setSelected(new Set())
    setLoading(false)
  }

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search by name, SKU, or category…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Category dropdown */}
        <Select
          value={filterCategoryId || '__all__'}
          onValueChange={v => setFilterCategoryId(v === '__all__' ? '' : (v ?? ''))}
        >
          <SelectTrigger className="h-8 w-44 text-xs">
            <span className={filterCategoryId ? 'text-xs' : 'text-xs text-muted-foreground'}>
              {categories.find(c => c.id === filterCategoryId)?.name ?? 'All categories'}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All categories</SelectItem>
            {categories.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Tags multi-select dropdown */}
        {tags.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setTagDropdownOpen(v => !v)}
              className={cn(
                'h-8 inline-flex items-center gap-1.5 rounded-md border px-3 text-xs transition-colors',
                activeTagIds.size > 0
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-input bg-background text-muted-foreground hover:bg-muted/50'
              )}
            >
              {activeTagIds.size > 0 ? `${activeTagIds.size} tag${activeTagIds.size > 1 ? 's' : ''}` : 'All tags'}
              <ChevronDown size={12} />
            </button>
            {tagDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setTagDropdownOpen(false)} />
                <div className="absolute z-50 mt-1 min-w-40 rounded-md border bg-popover shadow-md py-1">
                  {tags.map(t => {
                    const color = getTagColor(t.color)
                    const active = activeTagIds.has(t.id)
                    return (
                      <button
                        key={t.id}
                        onClick={() => toggleTagFilter(t.id)}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition-colors"
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: color.bg }}
                        />
                        <span className="flex-1 text-left">{t.name}</span>
                        {active && <Check size={12} className="shrink-0" />}
                      </button>
                    )
                  })}
                  {activeTagIds.size > 0 && (
                    <button
                      onClick={() => { setActiveTagIds(new Set()); setTagDropdownOpen(false) }}
                      className="w-full px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground border-t mt-1 text-left"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Inactive toggle */}
        <button
          onClick={() => setShowInactive(v => !v)}
          className={cn(
            'h-8 inline-flex items-center rounded-md border px-3 text-xs transition-colors',
            showInactive
              ? 'border-foreground bg-foreground text-background'
              : 'border-input bg-background text-muted-foreground hover:bg-muted/50'
          )}
        >
          Show inactive
        </button>

        {/* Needs attention toggle */}
        <button
          onClick={() => setShowNeedsAttention(v => !v)}
          className={cn(
            'h-8 inline-flex items-center rounded-md border px-3 text-xs transition-colors',
            showNeedsAttention
              ? 'border-destructive bg-destructive text-destructive-foreground'
              : 'border-input bg-background text-muted-foreground hover:bg-muted/50'
          )}
        >
          Needs attention
        </button>
      </div>

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
          <Button size="sm" variant="outline" onClick={openModifyTags}>
            <Tag size={13} className="mr-1" />Modify Tags
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
      {filtered.length > 0 && (
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer w-fit">
          <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded" />
          {allSelected ? 'Deselect all' : 'Select all'}
        </label>
      )}

      {/* Product grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(product => {
          const productTags = product.product_tag
            .map(pt => tags.find(t => t.id === pt.tag_id))
            .filter(Boolean) as TagType[]

          return (
            <div
              key={product.id}
              className={cn(
                'border rounded-lg p-4 flex gap-3 relative transition-colors',
                selected.has(product.id)
                  ? 'border-primary bg-primary/5'
                  : !product.is_active && !product.category_id
                    ? 'border-destructive bg-destructive/5'
                    : !product.is_active
                      ? 'bg-muted/60 border-muted-foreground/20'
                      : 'hover:bg-muted/50'
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

              <Link
                href={`/products/${product.id}`}
                className="flex gap-3 flex-1 min-w-0"
                onClick={e => { if (selected.size > 0) e.preventDefault(); toggle(product.id) }}
              >
                <div className={cn(!product.is_active && 'grayscale opacity-50')}>
                  <ProductImage url={product.image_url} name={product.name} size={56} />
                </div>
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-1.5">
                    <p className={cn('font-medium text-sm truncate', !product.is_active && 'text-muted-foreground')}>{product.name}</p>
                    {!product.is_active && (
                      <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground border rounded px-1 py-0">inactive</span>
                    )}
                  </div>
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
                  {productTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {productTags.map(t => {
                        const color = getTagColor(t.color)
                        return (
                          <span
                            key={t.id}
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                            style={{ backgroundColor: color.bg, color: color.text }}
                          >
                            {t.name}
                          </span>
                        )
                      })}
                    </div>
                  )}
                </div>
              </Link>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="col-span-3 text-center py-12 text-muted-foreground text-sm">
            {search.trim() || activeTagIds.size > 0
              ? 'No products match the current filters.'
              : <>No products yet. <Link href="/products/new" className="underline">Add one.</Link></>
            }
          </div>
        )}
      </div>

      {/* Change category dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Change Category</DialogTitle></DialogHeader>
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
                <SelectItem key={c.id} value={c.id}>{c.name} · ${c.base_price.toFixed(2)}</SelectItem>
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

      {/* Tag warning dialog */}
      <Dialog open={tagWarningOpen} onOpenChange={setTagWarningOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Different tags detected</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Currently selected products have different tags. Modifying tags will cause all selected products to have the same tags. Continue?
          </p>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setTagWarningOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={() => { setTagWarningOpen(false); setTagEditOpen(true) }}>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tag edit dialog */}
      <Dialog open={tagEditOpen} onOpenChange={setTagEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modify Tags</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Applying to {selected.size} product{selected.size > 1 ? 's' : ''}. Select the tags you want them to have.
          </p>
          {tags.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tags exist yet. Add some in Categories &amp; Tags.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags.map(t => {
                const color = getTagColor(t.color)
                const active = draftTagIds.has(t.id)
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setDraftTagIds(prev => {
                      const next = new Set(prev)
                      if (next.has(t.id)) next.delete(t.id)
                      else next.add(t.id)
                      return next
                    })}
                    className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium transition-opacity border-2"
                    style={active
                      ? { backgroundColor: color.bg, color: color.text, borderColor: color.bg }
                      : { backgroundColor: 'transparent', color: color.bg, borderColor: color.bg, opacity: 0.5 }
                    }
                  >
                    {t.name}
                    {active && <X size={11} className="opacity-70" />}
                  </button>
                )
              })}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setTagEditOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={applyTags} disabled={loading}>
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
