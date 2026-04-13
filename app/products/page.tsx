import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Plus } from 'lucide-react'
import { ProductImage } from '@/components/products/product-image'
import { LinkButton } from '@/components/ui/link-button'

export const dynamic = 'force-dynamic'

export default async function ProductsPage() {
  const { data: products } = await supabase
    .from('product')
    .select('*, category(name, base_price)')
    .order('name')

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Products</h1>
          <p className="text-muted-foreground text-sm">{products?.length ?? 0} items</p>
        </div>
        <LinkButton href="/products/new" size="sm"><Plus size={14} className="mr-1" />Add Product</LinkButton>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {products?.map(product => (
          <Link
            key={product.id}
            href={`/products/${product.id}`}
            className="border rounded-lg p-4 hover:bg-muted/50 transition-colors flex gap-3"
          >
            <ProductImage url={product.image_url} name={product.name} size={56} />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{product.name}</p>
              <p className="text-xs text-muted-foreground">{product.sku}</p>
              <div className="flex items-center gap-2 mt-1">
                {(product as any).category ? (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0">
                    {(product as any).category.name} · ${(product as any).category.base_price.toFixed(2)}
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">No category</span>
                )}
              </div>
              <Badge
                variant={product.quantity === 0 ? 'destructive' : product.quantity <= 5 ? 'outline' : 'secondary'}
                className="text-xs mt-1"
              >
                {product.quantity} in stock
              </Badge>
            </div>
          </Link>
        ))}
        {(!products || products.length === 0) && (
          <div className="col-span-3 text-center py-12 text-muted-foreground text-sm">
            No products yet. <Link href="/products/new" className="underline">Add one.</Link>
          </div>
        )}
      </div>
    </div>
  )
}
