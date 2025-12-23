-- Categories Table
create table public.categories (
  id uuid default uuid_generate_v4() primary key,
  slug text not null unique,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Category Translations Table
create table public.category_translations (
  id uuid default uuid_generate_v4() primary key,
  category_id uuid references public.categories(id) on delete cascade not null,
  locale text not null check (locale in ('en', 'vi')),
  name text not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(category_id, locale)
);

-- RLS Policies
alter table public.categories enable row level security;
alter table public.category_translations enable row level security;

create policy "Public categories are viewable by everyone"
  on public.categories for select
  using ( is_active = true );

create policy "Public category_translations are viewable by everyone"
  on public.category_translations for select
  using ( true );

-- Admin Write Policies (Assuming 'authenticated' role + logic handling elsewhere or simple check)
-- For now enabling full access for authenticated service role or via API logic
-- But if using Supabase client in API with Service Role Key, RLS is bypassed.
-- If using Client Key, we need policies.
-- Let's add basic authenticated policy for simplicity if needed, but usually Service Role is used in API.
