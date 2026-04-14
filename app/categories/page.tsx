import { supabase } from "@/lib/supabase";
import { CategoryManager } from "@/components/categories/category-manager";
import { TagManager } from "@/components/categories/tag-manager";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const [{ data: categories }, { data: tags }] = await Promise.all([
    supabase.from("category").select("*").order("name"),
    supabase.from("tag").select("*").order("name"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Categories & Tags</h1>
      </div>

      <div className="flex flex-wrap gap-8 items-start">
        <div className="space-y-3 w-fit min-w-64">
          <div>
            <h2 className="text-base font-semibold">Categories</h2>
            <p className="text-xs text-muted-foreground">
              Each product can only belong to one category. Category price
              dictates the base sale price.
            </p>
          </div>
          <CategoryManager initialCategories={categories ?? []} />
        </div>

        <div className="space-y-3 w-fit min-w-64">
          <div>
            <h2 className="text-base font-semibold">Tags</h2>
            <p className="text-xs text-muted-foreground">
              Products can have multiple tags or none.
            </p>
          </div>
          <TagManager initialTags={tags ?? []} />
        </div>
      </div>
    </div>
  );
}
