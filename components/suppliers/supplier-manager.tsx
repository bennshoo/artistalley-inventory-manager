'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Supplier } from '@/lib/database.types'
import { Plus, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function SupplierManager({ initialSuppliers }: { initialSuppliers: Supplier[] }) {
  const router = useRouter()
  const [suppliers, setSuppliers] = useState(initialSuppliers)
  const [showForm, setShowForm] = useState(false)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', contact: '' })

  async function addSupplier() {
    if (!form.name.trim()) return
    setAdding(true)
    const { data, error } = await supabase.from('supplier').insert({
      name: form.name.trim(),
      contact: form.contact.trim() || null,
    }).select().single()
    if (error) { toast.error(error.message); setAdding(false); return }
    setSuppliers(s => [...s, data].sort((a, b) => a.name.localeCompare(b.name)))
    setForm({ name: '', contact: '' })
    setShowForm(false)
    setAdding(false)
    toast.success('Supplier added')
    router.refresh()
  }

  return (
    <div className="space-y-2">
      {suppliers.map(s => (
        <div key={s.id} className="border rounded px-3 py-2">
          <p className="text-sm font-medium">{s.name}</p>
          {s.contact && <p className="text-xs text-muted-foreground">{s.contact}</p>}
        </div>
      ))}
      {suppliers.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground">No suppliers yet.</p>
      )}

      {showForm ? (
        <div className="border rounded p-3 space-y-2">
          <Input placeholder="Supplier name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Input placeholder="Contact (email, URL, phone)" value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} />
          <div className="flex gap-2">
            <Button size="sm" onClick={addSupplier} disabled={adding}>
              {adding ? <Loader2 size={14} className="animate-spin mr-1" /> : null}Add
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
          <Plus size={14} className="mr-1" />Add Supplier
        </Button>
      )}
    </div>
  )
}
