'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Loader2, ChevronsUpDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Product {
  id: string
  name: string
  sku: string
  quantity: number
}

export function AdjustmentForm({ products }: { products: Product[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const [form, setForm] = useState({
    product_id: '',
    delta: '',
    note: '',
    date: new Date().toISOString().split('T')[0],
  })
  const set = (f: string, v: string) => setForm(x => ({ ...x, [f]: v }))

  const selected = products.find(p => p.id === form.product_id)

  const filtered = search.trim()
    ? products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase())
      )
    : products

  // Close on click outside
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  function selectProduct(p: Product) {
    set('product_id', p.id)
    setSearch('')
    setOpen(false)
  }

  function clearProduct() {
    set('product_id', '')
    setSearch('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.product_id || !form.delta) return
    setLoading(true)

    const delta = parseInt(form.delta)

    const { error: adjError } = await supabase.from('inventory_adjustment').insert({
      product_id: form.product_id,
      delta,
      note: form.note || null,
      date: form.date,
    })
    if (adjError) { toast.error(adjError.message); setLoading(false); return }

    const newQty = Math.max(0, (selected?.quantity ?? 0) + delta)
    await supabase.from('product').update({ quantity: newQty }).eq('id', form.product_id)

    toast.success(`Adjusted ${selected?.name}: ${delta > 0 ? '+' : ''}${delta} units`)
    setForm({ product_id: '', delta: '', note: '', date: new Date().toISOString().split('T')[0] })
    setLoading(false)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label>Product</Label>
        <div ref={containerRef} className="relative">
          {selected ? (
            <div className="flex items-center justify-between border rounded-lg px-3 py-2 bg-background">
              <div>
                <span className="text-sm font-medium">{selected.name}</span>
                <span className="text-xs text-muted-foreground ml-2">
                  {selected.sku} · {selected.quantity} in stock
                </span>
              </div>
              <button
                type="button"
                onClick={clearProduct}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="relative">
              <Input
                placeholder="Search products by name or SKU…"
                value={search}
                onChange={e => { setSearch(e.target.value); setOpen(true) }}
                onFocus={() => setOpen(true)}
                className="pr-8"
              />
              <ChevronsUpDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          )}

          {open && !selected && (
            <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover shadow-md overflow-hidden">
              <div className="max-h-60 overflow-y-auto">
                {filtered.length === 0 && (
                  <p className="py-6 text-center text-sm text-muted-foreground">No products found.</p>
                )}
                {filtered.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onMouseDown={e => { e.preventDefault(); selectProduct(p) }}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted text-left'
                    )}
                  >
                    <span>
                      <span className="font-medium">{p.name}</span>
                      <span className="text-muted-foreground ml-2 text-xs">{p.sku}</span>
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0 ml-4">
                      {p.quantity} in stock
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="delta">Delta (positive = add, negative = remove)</Label>
        <Input id="delta" type="number" value={form.delta} onChange={e => set('delta', e.target.value)}
          required placeholder="e.g. -5 or +10" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="adj-date">Date</Label>
        <Input id="adj-date" type="date" value={form.date} onChange={e => set('date', e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="note">Note</Label>
        <Textarea id="note" value={form.note} onChange={e => set('note', e.target.value)}
          placeholder="e.g. Forgot to log AX Con 2024" rows={2} />
      </div>
      {selected && form.delta && (
        <p className="text-xs text-muted-foreground">
          New quantity: {Math.max(0, selected.quantity + (parseInt(form.delta) || 0))}
        </p>
      )}
      <Button type="submit" disabled={loading || !form.product_id} size="sm">
        {loading && <Loader2 size={14} className="mr-1 animate-spin" />}Apply Adjustment
      </Button>
    </form>
  )
}
