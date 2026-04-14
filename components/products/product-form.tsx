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
import { cn } from '@/lib/utils'

interface ProductFormProps {
  categories: Category[]
  product?: Product
}

interface Errors {
  name?: string
  sku?: string
  category_id?: string
}

export function ProductForm({ categories, product }: ProductFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<Errors>({})
  const [form, setForm] = useState({
    name: product?.name ?? '',
    sku: product?.sku ?? '',
    category_id: product?.category_id ?? '',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => ({ ...e, [field]: undefined }))
  }

  const selectedCategory = categories.find(c => c.id === form.category_id)

  function validate(): Errors {
    const e: Errors = {}
    if (!form.name.trim()) e.name = 'Name is required.'
    if (!form.sku.trim()) e.sku = 'SKU is required.'
    if (!form.category_id) e.category_id = 'Category is required.'
    return e
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

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
      const { error } = await supabase.from('product').update({
        ...payload,
        ...(product.category_id && !form.category_id ? { is_active: false } : {}),
      }).eq('id', product.id)
      if (error) { toast.error(error.message); setLoading(false); return }
      toast.success('Product updated')
      router.push(`/products/${product.id}`)
    } else {
      const { data, error } = await supabase.from('product').insert({
        ...payload,
        is_active: !!form.category_id,
      }).select().single()
      if (error) { toast.error(error.message); setLoading(false); return }
      toast.success('Product created')
      router.push('/products')
    }
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          className={cn(errors.name && 'border-destructive focus-visible:ring-destructive/50')}
        />
        {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="sku">SKU</Label>
        <Input
          id="sku"
          value={form.sku}
          onChange={e => set('sku', e.target.value)}
          placeholder="e.g. STK-001"
          className={cn(errors.sku && 'border-destructive focus-visible:ring-destructive/50')}
        />
        {errors.sku && <p className="text-xs text-destructive">{errors.sku}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Category</Label>
        <Select value={form.category_id} onValueChange={v => set('category_id', v ?? '')}>
          <SelectTrigger className={cn('w-full', errors.category_id && 'border-destructive focus-visible:ring-destructive/50')}>
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
        {errors.category_id
          ? <p className="text-xs text-destructive">{errors.category_id}</p>
          : selectedCategory && (
            <p className="text-xs text-muted-foreground">
              Price: ${selectedCategory.base_price.toFixed(2)} — edit in{' '}
              <a href="/categories" className="underline">Categories</a>
            </p>
          )
        }
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
