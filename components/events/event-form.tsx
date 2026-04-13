'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Event } from '@/lib/database.types'

export function EventForm({ event }: { event?: Event }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: event?.name ?? '',
    date: event?.date ?? new Date().toISOString().split('T')[0],
    location: event?.location ?? '',
    tax_rate: event?.tax_rate?.toString() ?? '0',
  })
  const set = (f: string, v: string) => setForm(x => ({ ...x, [f]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const payload = {
      name: form.name,
      date: form.date,
      location: form.location || null,
      tax_rate: parseFloat(form.tax_rate) || 0,
    }
    if (event) {
      const { error } = await supabase.from('event').update(payload).eq('id', event.id)
      if (error) { toast.error(error.message); setLoading(false); return }
      toast.success('Event updated')
      router.push(`/events/${event.id}`)
    } else {
      const { data, error } = await supabase.from('event').insert(payload).select().single()
      if (error) { toast.error(error.message); setLoading(false); return }
      toast.success('Event created')
      router.push(`/events/${data.id}`)
    }
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Event Name</Label>
        <Input id="name" value={form.name} onChange={e => set('name', e.target.value)} required placeholder="e.g. Anime Expo 2025" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="date">Date</Label>
        <Input id="date" type="date" value={form.date} onChange={e => set('date', e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="location">Location</Label>
        <Input id="location" value={form.location} onChange={e => set('location', e.target.value)} placeholder="City, State" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="tax_rate">Sales Tax Rate</Label>
        <Input id="tax_rate" type="number" step="0.0001" min="0" max="1" value={form.tax_rate}
          onChange={e => set('tax_rate', e.target.value)} placeholder="e.g. 0.0825 for 8.25%" />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={loading} size="sm">
          {loading && <Loader2 size={14} className="mr-1 animate-spin" />}
          {event ? 'Save Changes' : 'Create Event'}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  )
}
