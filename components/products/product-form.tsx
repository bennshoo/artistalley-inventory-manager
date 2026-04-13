'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { toast } from 'sonner'
import { Category, Product } from '@/lib/database.types'
import { Loader2 } from 'lucide-react'

interface ProductFormProps {
  categories: Category[]
  product?: Product
}

export function ProductForm({ categories, product }: ProductFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [form, setForm] = useState({
    name: product?.name ?? '',
    sku: product?.sku ?? '',
    category_id: product?.category_id ?? '',
  })

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }))

  const selectedCategory = categories.find(c => c.id === form.category_id)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    let image_url = product?.image_url ?? null

    if (imageFile) {
      const ext = imageFile.name.split('.').pop()
      const path = `${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(path, imageFile, { upsert: true })
      if (uploadError) {
        toast.error('Image upload failed: ' + uploadError.message)
        setLoading(false)
        return
      }
      image_url = path
    }

    const payload = {
      name: form.name,
      sku: form.sku,
      category_id: form.category_id || null,
      image_url,
    }

    if (product) {
      const { error } = await supabase.from('product').update(payload).eq('id', product.id)
      if (error) { toast.error(error.message); setLoading(false); return }
      toast.success('Product updated')
      router.push(`/products/${product.id}`)
    } else {
      const { data, error } = await supabase.from('product').insert(payload).select().single()
      if (error) { toast.error(error.message); setLoading(false); return }
      toast.success('Product created')
      router.push(`/products/${data.id}`)
    }
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" value={form.name} onChange={e => set('name', e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="sku">SKU</Label>
        <Input id="sku" value={form.sku} onChange={e => set('sku', e.target.value)} required placeholder="e.g. STK-001" />
      </div>
      <div className="space-y-1.5">
        <Label>Category</Label>
        <Select value={form.category_id} onValueChange={v => set('category_id', v ?? '')}>
          <SelectTrigger className="w-full">
            <span className={form.category_id ? '' : 'text-muted-foreground text-sm'}>
              {form.category_id
                ? (() => { const c = categories.find(x => x.id === form.category_id); return c ? `${c.name} — $${c.base_price.toFixed(2)}` : 'Select category' })()
                : 'Select category'}
            </span>
          </SelectTrigger>
          <SelectContent>
            {categories.map(c => (
              <SelectItem key={c.id} value={c.id}>
                {c.name} — ${c.base_price.toFixed(2)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedCategory && (
          <p className="text-xs text-muted-foreground">
            Price: ${selectedCategory.base_price.toFixed(2)} — edit in{' '}
            <a href="/categories" className="underline">Categories</a>
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="image">Product Image</Label>
        <Input id="image" type="file" accept="image/*"
          onChange={e => setImageFile(e.target.files?.[0] ?? null)} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={loading} size="sm">
          {loading && <Loader2 size={14} className="mr-1 animate-spin" />}
          {product ? 'Save Changes' : 'Create Product'}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  )
}
