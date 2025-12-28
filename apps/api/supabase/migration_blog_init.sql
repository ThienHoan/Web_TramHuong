-- Create Posts Table
create table if not exists public.posts (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  slug text unique not null,
  title text not null,
  excerpt text,
  content text,
  cover_image text,
  
  author_id uuid references auth.users(id),
  category text,
  tags text[],
  
  is_featured boolean default false,
  status text default 'draft', -- 'draft', 'published'
  published_at timestamp with time zone,
  
  seo_title text,
  seo_description text
);

-- Enable RLS
alter table public.posts enable row level security;

-- Policies for Public Read
create policy "Public posts are viewable by everyone." 
on public.posts for select 
using (status = 'published');

-- Policies for Admin (Simplified for MVP: Authenticated users can do everything for now, 
-- ideally should check for admin role/claims)
create policy "Admins can insert posts" 
on public.posts for insert 
to authenticated 
with check (true);

create policy "Admins can update posts" 
on public.posts for update 
to authenticated 
using (true);

create policy "Admins can delete posts" 
on public.posts for delete
to authenticated 
using (true);

-- Indexes for performance
create index if not exists posts_slug_idx on public.posts (slug);
create index if not exists posts_status_idx on public.posts (status);
create index if not exists posts_category_idx on public.posts (category);
