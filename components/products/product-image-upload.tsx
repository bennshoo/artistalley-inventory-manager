'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { Camera, Loader2, Package } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ProductImageUploadProps {
  productId: string
  initialUrl: string | null
  name: string
  size?: number
}

export function ProductImageUpload({ productId, initialUrl, name, size = 80 }: ProductImageUploadProps) {
  const [url, setUrl] = useState(initialUrl)
  const [uploading, setUploading] = useState(false)
  const [hovered, setHovered] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const src = url
    ? (url.startsWith('http') ? url : supabase.storage.from('product-images').getPublicUrl(url).data.publicUrl)
    : null

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('product-images').upload(path, file, { upsert: true })
    if (uploadError) {
      toast.error('Upload failed: ' + uploadError.message)
      setUploading(false)
      return
    }
    const { error: updateError } = await supabase.from('product').update({ image_url: path }).eq('id', productId)
    if (updateError) {
      toast.error('Failed to save image: ' + updateError.message)
      setUploading(false)
      return
    }
    setUrl(path)
    setUploading(false)
    toast.success('Image updated')
    // Reset input so the same file can be re-selected
    e.target.value = ''
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="relative rounded overflow-hidden shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        style={{ width: size, height: size }}
        title="Replace image"
        disabled={uploading}
      >
        {src ? (
          <Image src={src} alt={name} width={size} height={size} className="object-cover w-full h-full" />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
            <Package size={size * 0.4} />
          </div>
        )}
        <div className={cn(
          'absolute inset-0 flex items-center justify-center transition-opacity bg-black/40',
          (hovered || uploading) ? 'opacity-100' : 'opacity-0'
        )}>
          {uploading
            ? <Loader2 size={size * 0.3} className="text-white animate-spin" />
            : <Camera size={size * 0.3} className="text-white" />
          }
        </div>
      </button>
    </>
  )
}
