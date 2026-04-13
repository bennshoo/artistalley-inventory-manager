import { supabase } from '@/lib/supabase'
import { CategoryManager } from '@/components/categories/category-manager'

export const dynamic = 'force-dynamic'

export default async function CategoriesPage() {
  const { data: categories } = await supabase.from('category').select('*').order('name')

  return (
    <div className="space-y-4 max-w-md">
      <h1 className="text-2xl font-semibold">Categories</h1>
      <CategoryManager initialCategories={categories ?? []} />
    </div>
  )
}
