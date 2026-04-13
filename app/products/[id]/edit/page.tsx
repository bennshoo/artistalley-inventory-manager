import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { ProductForm } from '@/components/products/product-form'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [productRes, categoriesRes] = await Promise.all([
    supabase.from('product').select('*').eq('id', id).single(),
    supabase.from('category').select('*').order('name'),
  ])
  if (!productRes.data) notFound()

  return (
    <div className="space-y-4 max-w-xl">
      <Link href={`/products/${id}`} className="text-sm text-muted-foreground flex items-center gap-1 hover:text-foreground">
        <ChevronLeft size={14} /> {productRes.data.name}
      </Link>
      <h1 className="text-2xl font-semibold">Edit Product</h1>
      <ProductForm categories={categoriesRes.data ?? []} product={productRes.data} />
    </div>
  )
}
