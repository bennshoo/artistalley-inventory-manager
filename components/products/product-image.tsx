'use client'

import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { Package } from 'lucide-react'

interface ProductImageProps {
  url: string | null
  name: string
  size?: number
}

export function ProductImage({ url, name, size = 48 }: ProductImageProps) {
  if (!url) {
    return (
      <div
        className="rounded bg-muted flex items-center justify-center shrink-0 text-muted-foreground"
        style={{ width: size, height: size }}
      >
        <Package size={size * 0.4} />
      </div>
    )
  }

  // Check if it's a Supabase storage path or full URL
  const src = url.startsWith('http') ? url : supabase.storage.from('product-images').getPublicUrl(url).data.publicUrl

  return (
    <div className="rounded overflow-hidden shrink-0 bg-muted" style={{ width: size, height: size }}>
      <Image src={src} alt={name} width={size} height={size} className="object-cover w-full h-full" />
    </div>
  )
}
