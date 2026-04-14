'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Power, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export function ToggleProductActiveButton({ productId, isActive }: { productId: string; isActive: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleToggle() {
    setLoading(true)
    const { error } = await supabase.from('product').update({ is_active: !isActive }).eq('id', productId)
    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }
    toast.success(isActive ? 'Product deactivated' : 'Product activated')
    router.refresh()
    setLoading(false)
  }

  return (
    <Button size="sm" variant="outline" onClick={handleToggle} disabled={loading}>
      {loading ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Power size={14} className="mr-1" />}
      {isActive ? 'Deactivate' : 'Activate'}
    </Button>
  )
}
