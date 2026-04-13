'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Supplier } from '@/lib/database.types'
import { Plus, Loader2, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function SupplierManager({ initialSuppliers }: { initialSuppliers: Supplier[] }) {
  const router = useRouter()
  const [suppliers, setSuppliers] = useState(initialSuppliers)
  const [showForm, setShowForm] = useState(false)
  const [adding, setAdding] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', contact: '' })

  async function handleDeleteClick(id: string) {
    const { count } = await supabase.from('restock').select('id', { count: 'exact', head: true }).eq('supplier_id', id)
    if ((count ?? 0) > 0) {
      setConfirmId(id)
    } else {
      await deleteSupplier(id)
    }
  }

  async function deleteSupplier(id: string) {
    setDeleting(id)
    setConfirmId(null)
    const { error } = await supabase.from('supplier').delete().eq('id', id)
    if (error) { toast.error(error.message); setDeleting(null); return }
    setSuppliers(s => s.filter(x => x.id !== id))
    setDeleting(null)
    toast.success('Supplier deleted')
    router.refresh()
  }

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
        <div key={s.id} className="border rounded px-3 py-2 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{s.name}</p>
            {s.contact && <p className="text-xs text-muted-foreground">{s.contact}</p>}
          </div>
          <button
            onClick={() => handleDeleteClick(s.id)}
            disabled={deleting === s.id}
            className="text-muted-foreground hover:text-destructive disabled:opacity-50"
          >
            {deleting === s.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          </button>
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
      <Dialog open={!!confirmId} onOpenChange={open => { if (!open) setConfirmId(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete supplier?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This supplier has restocks associated with it. Deleting the supplier will also delete those restocks. Delete anyway?
          </p>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setConfirmId(null)}>Cancel</Button>
            <Button variant="destructive" size="sm" onClick={() => confirmId && deleteSupplier(confirmId)} disabled={!!deleting}>
              {deleting && <Loader2 size={14} className="mr-1 animate-spin" />}Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
