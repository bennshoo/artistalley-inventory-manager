'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export function DeleteEventButton({ eventId }: { eventId: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    const { error } = await supabase.from('event').delete().eq('id', eventId)
    if (error) {
      toast.error(error.message)
      setLoading(false)
      setConfirming(false)
      return
    }
    toast.success('Event deleted')
    router.push('/events')
    router.refresh()
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Delete this event?</span>
        <Button size="sm" variant="destructive" onClick={handleDelete} disabled={loading}>
          {loading && <Loader2 size={14} className="mr-1 animate-spin" />}
          Yes, delete
        </Button>
        <Button size="sm" variant="outline" onClick={() => setConfirming(false)} disabled={loading}>
          Cancel
        </Button>
      </div>
    )
  }

  return (
    <Button size="sm" variant="outline" onClick={() => setConfirming(true)}>
      <Trash2 size={14} className="mr-1" />Delete
    </Button>
  )
}
