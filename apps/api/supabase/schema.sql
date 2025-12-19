-- Create Products Table
create table if not exists products (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  slug text unique not null,
  price numeric not null,
  images text[] not null default '{}',
  style_affinity text check (style_affinity in ('zen', 'traditional', 'both')) not null default 'both',
  is_active boolean default true
);

-- Create Product Translations Table
create table if not exists product_translations (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references products(id) on delete cascade not null,
  locale text not null check (locale in ('en', 'vi')),
  title text not null,
  description text,
  story text,
  specifications text,
  unique(product_id, locale)
);

-- Enable Row Level Security (RLS)
alter table products enable row level security;
alter table product_translations enable row level security;

-- Create Policies (Public Read, Authenticated Write)
create policy "Public products are viewable by everyone."
  on products for select
  using ( is_active = true );

create policy "Public translations are viewable by everyone."
  on product_translations for select
  using ( true );

-- (Optional) If you want the API to write, it uses SERVICE_ROLE key which bypasses RLS.
-- But if logging in as a user, you'd need insert policies.
-- For now, we assume Service Role usage for seeding/admin.
