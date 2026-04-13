-- Move base_price from product to category
alter table category add column if not exists base_price numeric(10,2) not null default 0;
alter table product drop column if exists base_price;
