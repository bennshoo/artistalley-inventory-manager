import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { ProductForm } from '@/components/products/product-form'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [productRes, categoriesRes, tagsRes, productTagsRes] = await Promise.all([
    supabase.from('product').select('*').eq('id', id).single(),
    supabase.from('category').select('*').order('name'),
    supabase.from('tag').select('*').order('name'),
    supabase.from('product_tag').select('tag_id').eq('product_id', id),
  ])
  if (!productRes.data) notFound()

  const initialTagIds = (productTagsRes.data ?? []).map((r: any) => r.tag_id)

  return (
    <div className="space-y-4 max-w-xl">
      <Link href={`/products/${id}`} className="text-sm text-muted-foreground flex items-center gap-1 hover:text-foreground">
        <ChevronLeft size={14} /> {productRes.data.name}
      </Link>
      <h1 className="text-2xl font-semibold">Edit Product</h1>
      <ProductForm
        categories={categoriesRes.data ?? []}
        tags={tagsRes.data ?? []}
        product={productRes.data}
        initialTagIds={initialTagIds}
      />
    </div>
  )
}
