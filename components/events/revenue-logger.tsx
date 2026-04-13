'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { EventRevenue } from '@/lib/database.types'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

const METHODS = ['square', 'cash', 'venmo'] as const

export function RevenueLogger({
  eventId,
  initialRevenues,
}: {
  eventId: string
  initialRevenues: EventRevenue[]
}) {
  const router = useRouter()
  const [revenues, setRevenues] = useState<EventRevenue[]>(initialRevenues)
  const [saving, setSaving] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, { starting: string; ending: string }>>(() => {
    const d: Record<string, { starting: string; ending: string }> = {}
    for (const m of METHODS) {
      const existing = initialRevenues.find(r => r.payment_method === m)
      d[m] = {
        starting: existing?.starting_balance?.toString() ?? '',
        ending: existing?.ending_balance?.toString() ?? '',
      }
    }
    return d
  })

  async function save(method: typeof METHODS[number]) {
    setSaving(method)
    const existing = revenues.find(r => r.payment_method === method)
    const starting = parseFloat(drafts[method].starting) || 0
    const ending = parseFloat(drafts[method].ending) || 0
    const payload = { payment_method: method, starting_balance: starting, ending_balance: ending, event_id: eventId }

    let result
    if (existing) {
      result = await supabase.from('event_revenue').update(payload).eq('id', existing.id).select().single()
    } else {
      result = await supabase.from('event_revenue').insert(payload).select().single()
    }

    if (result.error) { toast.error(result.error.message); setSaving(null); return }
    setRevenues(r => {
      const filtered = r.filter(x => x.payment_method !== method)
      return [...filtered, result.data!]
    })
    toast.success(`${method} saved`)
    setSaving(null)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {METHODS.map(method => {
        const rev = revenues.find(r => r.payment_method === method)
        const net = rev ? rev.ending_balance - rev.starting_balance : 0
        return (
          <div key={method} className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="capitalize font-medium">{method}</Label>
              {rev && <span className="text-xs font-medium text-green-700">+${net.toFixed(2)}</span>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Starting</p>
                <Input
                  type="number" step="0.01"
                  value={drafts[method].starting}
                  onChange={e => setDrafts(d => ({ ...d, [method]: { ...d[method], starting: e.target.value } }))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Ending</p>
                <Input
                  type="number" step="0.01"
                  value={drafts[method].ending}
                  onChange={e => setDrafts(d => ({ ...d, [method]: { ...d[method], ending: e.target.value } }))}
                  placeholder="0.00"
                />
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => save(method)} disabled={saving === method}>
              {saving === method && <Loader2 size={12} className="mr-1 animate-spin" />}Save {method}
            </Button>
          </div>
        )
      })}
    </div>
  )
}
