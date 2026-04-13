import { supabase } from '@/lib/supabase'
import { ProductForm } from '@/components/products/product-form'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default async function NewProductPage() {
  const { data: categories } = await supabase.from('category').select('*').order('name')

  return (
    <div className="space-y-4 max-w-xl">
      <Link href="/products" className="text-sm text-muted-foreground flex items-center gap-1 hover:text-foreground">
        <ChevronLeft size={14} /> Products
      </Link>
      <h1 className="text-2xl font-semibold">New Product</h1>
      <ProductForm categories={categories ?? []} />
    </div>
  )
}
