-- Convert many-to-many "tags" into a single "collection" per product.
-- Run this in the Supabase SQL editor.

-- 1. Rename the tag table to collection (keeps its RLS policies and data)
alter table tag rename to collection;

-- 2. Give each product a single optional collection
alter table product
  add column if not exists collection_id uuid references collection(id) on delete set null;

-- 3. Backfill: for products with tags, keep the alphabetically-first one
update product p
set collection_id = sub.collection_id
from (
  select distinct on (pt.product_id)
    pt.product_id,
    pt.tag_id as collection_id
  from product_tag pt
  join collection c on c.id = pt.tag_id
  order by pt.product_id, c.name asc
) sub
where p.id = sub.product_id;

-- 4. Drop the old join table
drop table if exists product_tag;
