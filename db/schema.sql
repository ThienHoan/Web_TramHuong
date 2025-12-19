-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Products Table
create table public.products (
  id uuid default uuid_generate_v4() primary key,
  slug text not null unique,
  price decimal(12, 2) not null default 0,
  images jsonb default '[]'::jsonb,
  style_affinity text check (style_affinity in ('zen', 'traditional', 'both')) default 'both',
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Product Translations Table
create table public.product_translations (
  id uuid default uuid_generate_v4() primary key,
  product_id uuid references public.products(id) on delete cascade not null,
  locale text not null check (locale in ('en', 'vi')),
  title text not null,
  description text,
  story text, -- For Zen storytelling
  specifications jsonb, -- For Traditional specs
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(product_id, locale)
);

-- RLS Policies (Simple public read)
alter table public.products enable row level security;
alter table public.product_translations enable row level security;

create policy "Public products are viewable by everyone"
  on public.products for select
  using ( is_active = true );

create policy "Public translations are viewable by everyone"
  on public.product_translations for select
  using ( true );
