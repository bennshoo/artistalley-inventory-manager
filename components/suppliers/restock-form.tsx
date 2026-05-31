'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2, ChevronDown } from 'lucide-react'

interface ProductComboboxProps {
  products: { id: string; name: string; sku: string }[]
  value: string
  onChange: (id: string) => void
}

function ProductCombobox({ products, value, onChange }: ProductComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const selected = products.find(p => p.id === value)

  const filtered = products.filter(p =>
    !search.trim() ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => { setOpen(v => !v); setSearch('') }}
        className="w-full flex items-center justify-between border rounded-md px-3 h-9 text-sm bg-background hover:bg-muted/50 transition-colors"
      >
        <span className={value ? 'text-sm' : 'text-muted-foreground text-sm'}>
          {selected ? `${selected.name} (${selected.sku})` : 'Select product'}
        </span>
        <ChevronDown size={14} className="text-muted-foreground shrink-0 ml-2" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md">
            <div className="p-2 border-b">
              <input
                autoFocus
                placeholder="Search by name or SKU…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full text-sm px-2 py-1 outline-none bg-transparent placeholder:text-muted-foreground"
              />
            </div>
            <div className="max-h-52 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <p className="text-xs text-muted-foreground px-3 py-2">No products found.</p>
              ) : filtered.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { onChange(p.id); setOpen(false); setSearch('') }}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors flex items-center gap-2"
                >
                  <span>{p.name}</span>
                  <span className="text-muted-foreground text-xs">({p.sku})</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

interface RestockFormProps {
  products: { id: string; name: string; sku: string }[]
  suppliers: { id: string; name: string }[]
}

interface RestockRow {
  id: number
  product_id: string
  quantity: string
  unit_cost: string
}

let rowCounter = 0

function emptyRow(): RestockRow {
  return { id: ++rowCounter, product_id: '', quantity: '', unit_cost: '' }
}

export function RestockForm({ products, suppliers }: RestockFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [supplier_id, setSupplier] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [rows, setRows] = useState<RestockRow[]>([emptyRow()])

  function updateRow(id: number, field: keyof RestockRow, value: string) {
    setRows(rs => rs.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  function addRow() {
    setRows(rs => [...rs, emptyRow()])
  }

  function removeRow(id: number) {
    setRows(rs => rs.filter(r => r.id !== id))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (rows.some(r => !r.product_id || !r.quantity || !r.unit_cost)) {
      toast.error('Fill in all product rows before submitting')
      return
    }
    setLoading(true)

    const records = rows.map(r => ({
      product_id: r.product_id,
      supplier_id: supplier_id || null,
      quantity: parseInt(r.quantity),
      unit_cost: parseFloat(r.unit_cost),
      date,
    }))

    const { error } = await supabase.from('restock').insert(records)
    if (error) { toast.error(error.message); setLoading(false); return }

    const total = records.reduce((sum, r) => sum + r.quantity, 0)
    toast.success(`Restock logged — ${records.length} product${records.length > 1 ? 's' : ''}, +${total} units total`)
    router.push('/suppliers')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {/* Shared fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Supplier</Label>
          <Select value={supplier_id} onValueChange={v => setSupplier(v ?? '')}>
            <SelectTrigger className="w-full">
              <span className={supplier_id ? '' : 'text-muted-foreground text-sm'}>
                {supplier_id
                  ? suppliers.find(s => s.id === supplier_id)?.name ?? 'Select supplier'
                  : 'Select supplier (optional)'}
              </span>
            </SelectTrigger>
            <SelectContent>
              {suppliers.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="date">Date Received</Label>
          <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
        </div>
      </div>

      {/* Per-product rows */}
      <div className="space-y-3">
        <div className="grid grid-cols-[1fr_100px_110px_32px] gap-2 px-1">
          <span className="text-xs font-medium text-muted-foreground">Product</span>
          <span className="text-xs font-medium text-muted-foreground">Qty</span>
          <span className="text-xs font-medium text-muted-foreground">Unit Cost ($)</span>
          <span />
        </div>

        {rows.map(row => (
          <div key={row.id} className="grid grid-cols-[1fr_100px_110px_32px] gap-2 items-center">
            <ProductCombobox
              products={products}
              value={row.product_id}
              onChange={v => updateRow(row.id, 'product_id', v)}
            />

            <Input
              type="number" min="1" placeholder="0"
              value={row.quantity}
              onChange={e => updateRow(row.id, 'quantity', e.target.value)}
              required
            />

            <Input
              type="number" step="0.0001" min="0" placeholder="0.00"
              value={row.unit_cost}
              onChange={e => updateRow(row.id, 'unit_cost', e.target.value)}
              required
            />

            <button
              type="button"
              onClick={() => removeRow(row.id)}
              disabled={rows.length === 1}
              className="text-muted-foreground hover:text-destructive disabled:opacity-30 flex items-center justify-center"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}

        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus size={13} className="mr-1" />Add another product
        </Button>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={loading} size="sm">
          {loading && <Loader2 size={14} className="mr-1 animate-spin" />}Log Restock
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  )
}
