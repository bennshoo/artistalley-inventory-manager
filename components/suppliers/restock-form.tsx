'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface RestockFormProps {
  products: { id: string; name: string; sku: string }[]
  suppliers: { id: string; name: string }[]
}

export function RestockForm({ products, suppliers }: RestockFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    product_id: '',
    supplier_id: '',
    quantity: '',
    unit_cost: '',
    date: new Date().toISOString().split('T')[0],
  })
  const set = (f: string, v: string) => setForm(x => ({ ...x, [f]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const qty = parseInt(form.quantity)
    const cost = parseFloat(form.unit_cost)

    // Insert restock
    const { error: restockError } = await supabase.from('restock').insert({
      product_id: form.product_id,
      supplier_id: form.supplier_id || null,
      quantity: qty,
      unit_cost: cost,
      date: form.date,
    })
    if (restockError) { toast.error(restockError.message); setLoading(false); return }

    toast.success(`Restock logged — +${qty} units`)
    router.push('/suppliers')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Product</Label>
        <Select value={form.product_id} onValueChange={v => set('product_id', v ?? '')} required>
          <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
          <SelectContent>
            {products.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Supplier</Label>
        <Select value={form.supplier_id} onValueChange={v => set('supplier_id', v ?? '')}>
          <SelectTrigger><SelectValue placeholder="Select supplier (optional)" /></SelectTrigger>
          <SelectContent>
            {suppliers.map(s => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="qty">Quantity</Label>
          <Input id="qty" type="number" min="1" value={form.quantity} onChange={e => set('quantity', e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cost">Unit Cost ($)</Label>
          <Input id="cost" type="number" step="0.0001" min="0" value={form.unit_cost} onChange={e => set('unit_cost', e.target.value)} required />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="date">Date Received</Label>
        <Input id="date" type="date" value={form.date} onChange={e => set('date', e.target.value)} required />
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
