'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export function EventNotesEditor({ eventId, initialNotes }: { eventId: string; initialNotes: string | null }) {
  const [notes, setNotes] = useState(initialNotes ?? '')
  const [saving, setSaving] = useState(false)
  const lastSaved = useRef(initialNotes ?? '')

  async function save() {
    const trimmed = notes.trim()
    if (trimmed === lastSaved.current.trim()) return
    setSaving(true)
    const { error } = await supabase
      .from('event')
      .update({ notes: trimmed || null })
      .eq('id', eventId)
    setSaving(false)
    if (error) {
      toast.error(error.message)
    } else {
      lastSaved.current = trimmed
    }
  }

  return (
    <div className="relative">
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        onBlur={save}
        placeholder="Add notes…"
        rows={3}
        className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
      {saving && (
        <Loader2 size={12} className="absolute bottom-2.5 right-2.5 animate-spin text-muted-foreground" />
      )}
    </div>
  )
}
