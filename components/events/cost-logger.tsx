'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Cost } from '@/lib/database.types'
import { Loader2, Trash2, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'

const COST_TYPES = ['table_fee', 'travel', 'hotel', 'supplies', 'supplier', 'other']

export function CostLogger({ eventId, initialCosts }: { eventId: string; initialCosts: Cost[] }) {
  const router = useRouter()
  const [costs, setCosts] = useState(initialCosts)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [form, setForm] = useState({ type: 'table_fee', amount: '', note: '' })
  const set = (f: string, v: string) => setForm(x => ({ ...x, [f]: v }))

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
          <div key={c.id} className="flex items-center justify-between text-xs border-b pb-1">
            <div>
              <span className="font-medium capitalize">{c.type.replace('_', ' ')}</span>
              {c.note && <span className="text-muted-foreground ml-2">{c.note}</span>}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">${c.amount.toFixed(2)}</span>
              <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                onClick={() => deleteCost(c.id)} disabled={deletingId === c.id}>
                {deletingId === c.id ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
              </Button>
            </div>
          </div>
        ))}
        {costs.length === 0 && !showForm && <p className="text-xs text-muted-foreground">No costs logged.</p>}
      </div>

      {showForm ? (
        <div className="space-y-2 border rounded p-3">
          <Select value={form.type} onValueChange={v => set('type', v ?? '')}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {COST_TYPES.map(t => <SelectItem key={t} value={t} className="text-xs capitalize">{t.replace('_', ' ')}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="number" step="0.01" placeholder="Amount" value={form.amount} onChange={e => set('amount', e.target.value)} className="h-8 text-xs" />
          <Input placeholder="Note (optional)" value={form.note} onChange={e => set('note', e.target.value)} className="h-8 text-xs" />
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
