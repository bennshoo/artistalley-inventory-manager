'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { toast } from 'sonner'
import { Cost } from '@/lib/database.types'
import { Loader2, Trash2, Plus, Pencil, Check, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

const COST_TYPES = ['booth_setup', 'inventory', 'table_fee', 'travel', 'hotel', 'food', 'other']

function formatCostType(type: string) {
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export function CostLogger({ eventId, initialCosts }: { eventId: string | null; initialCosts: Cost[] }) {
  const router = useRouter()
  const [costs, setCosts] = useState(initialCosts)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState({ type: 'table_fee', amount: '', note: '' })
  const [savingEditId, setSavingEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ type: 'booth_setup', amount: '', note: '' })
  const set = (f: string, v: string) => setForm(x => ({ ...x, [f]: v }))

  function startEdit(c: Cost) {
    setEditingId(c.id)
    setEditDraft({ type: c.type, amount: c.amount.toString(), note: c.note ?? '' })
  }

  async function saveEdit(id: string) {
    if (!editDraft.amount) return
    setSavingEditId(id)
    const { data, error } = await supabase.from('cost')
      .update({ type: editDraft.type, amount: parseFloat(editDraft.amount), note: editDraft.note || null })
      .eq('id', id).select().single()
    if (error) { toast.error(error.message); setSavingEditId(null); return }
    setCosts(c => c.map(x => x.id === id ? data : x))
    setEditingId(null)
    setSavingEditId(null)
    toast.success('Cost updated')
  }

  async function addCost() {
    if (!form.amount) return
    setSaving(true)
    const { data, error } = await supabase.from('cost').insert({
      event_id: eventId,
      type: form.type,
      amount: parseFloat(form.amount),
      note: form.note || null,
    }).select().single()
    if (error) { toast.error(error.message); setSaving(false); return }
    setCosts(c => [...c, data])
    setForm({ type: 'table_fee', amount: '', note: '' })
    setShowForm(false)
    setSaving(false)
    toast.success('Cost logged')
    router.refresh()
  }

  async function deleteCost(id: string) {
    setDeletingId(id)
    const { error } = await supabase.from('cost').delete().eq('id', id)
    if (error) { toast.error(error.message); setDeletingId(null); return }
    setCosts(c => c.filter(x => x.id !== id))
    setDeletingId(null)
    router.refresh()
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        {costs.map(c => (
          <div key={c.id} className="border-b pb-1">
            {editingId === c.id ? (
              <div className="space-y-1.5 py-1">
                <Select value={editDraft.type} onValueChange={v => setEditDraft(d => ({ ...d, type: v ?? '' }))}>
                  <SelectTrigger className="h-7 text-xs"><span className="text-xs">{formatCostType(editDraft.type)}</span></SelectTrigger>
                  <SelectContent>
                    {COST_TYPES.map(t => <SelectItem key={t} value={t} className="text-xs">{formatCostType(t)}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="flex gap-1.5">
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">$</span>
                    <Input type="number" step="0.01" placeholder="0.00" value={editDraft.amount}
                      onChange={e => setEditDraft(d => ({ ...d, amount: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && saveEdit(c.id)}
                      className="h-7 text-xs pl-5" autoFocus />
                  </div>
                  <Input placeholder="Note" value={editDraft.note}
                    onChange={e => setEditDraft(d => ({ ...d, note: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && saveEdit(c.id)}
                    className="h-7 text-xs flex-1" />
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => saveEdit(c.id)} disabled={savingEditId === c.id}>
                    {savingEditId === c.id ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingId(null)}>
                    <X size={10} />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="font-medium">{formatCostType(c.type)}</span>
                  {c.note && <span className="text-muted-foreground ml-2">{c.note}</span>}
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-medium">${c.amount.toFixed(2)}</span>
                  <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => startEdit(c)}>
                    <Pencil size={10} />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteCost(c.id)} disabled={deletingId === c.id}>
                    {deletingId === c.id ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
        {costs.length === 0 && !showForm && <p className="text-xs text-muted-foreground">No costs logged.</p>}
      </div>

      {showForm ? (
        <div className="space-y-2 border rounded p-3">
          <Select value={form.type} onValueChange={v => set('type', v ?? '')}>
            <SelectTrigger className="h-8 text-xs"><span className="text-xs">{formatCostType(form.type)}</span></SelectTrigger>
            <SelectContent>
              {COST_TYPES.map(t => <SelectItem key={t} value={t} className="text-xs">{formatCostType(t)}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">$</span>
            <Input type="number" step="0.01" placeholder="0.00" value={form.amount} onChange={e => set('amount', e.target.value)} onKeyDown={e => e.key === 'Enter' && addCost()} className="h-8 text-xs pl-5" />
          </div>
          <Input placeholder="Note (optional)" value={form.note} onChange={e => set('note', e.target.value)} onKeyDown={e => e.key === 'Enter' && addCost()} className="h-8 text-xs" />
          <div className="flex gap-2">
            <Button size="sm" onClick={addCost} disabled={saving} className="h-7 text-xs">
              {saving && <Loader2 size={10} className="mr-1 animate-spin" />}Add
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)} className="h-7 text-xs">Cancel</Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setShowForm(true)} className="h-7 text-xs">
          <Plus size={12} className="mr-1" />Add Cost
        </Button>
      )}
    </div>
  )
}
