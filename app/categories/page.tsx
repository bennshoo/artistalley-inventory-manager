import { supabase } from '@/lib/supabase'
import { CategoryManager } from '@/components/categories/category-manager'
import { TagManager } from '@/components/categories/tag-manager'

export const dynamic = 'force-dynamic'

export default async function CategoriesPage() {
  const [{ data: categories }, { data: tags }] = await Promise.all([
    supabase.from('category').select('*').order('name'),
    supabase.from('tag').select('*').order('name'),
  ])

  return (
    <div className="space-y-8 max-w-md">
      <div>
        <h1 className="text-2xl font-semibold">Categories & Tags</h1>
      </div>

      <div className="space-y-3">
        <div>
          <h2 className="text-base font-semibold">Categories</h2>
          <p className="text-xs text-muted-foreground">Each product belongs to one category. Category price is used as the base sale price.</p>
        </div>
        <CategoryManager initialCategories={categories ?? []} />
      </div>

      <div className="space-y-3">
        <div>
          <h2 className="text-base font-semibold">Tags</h2>
          <p className="text-xs text-muted-foreground">Tags are freeform labels. A product can have multiple tags or none.</p>
        </div>
        <TagManager initialTags={tags ?? []} />
      </div>
    </div>
  )
}
