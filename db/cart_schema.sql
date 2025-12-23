-- Create cart_items table
create table if not exists public.cart_items (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete cascade not null,
  quantity integer not null check (quantity > 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, product_id) -- Prevent duplicate rows for same product
);

-- RLS Policies
alter table public.cart_items enable row level security;

create policy "Users can view their own cart items"
  on public.cart_items for select
  using ( auth.uid() = user_id );

create policy "Users can insert into their own cart"
  on public.cart_items for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own cart items"
  on public.cart_items for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own cart items"
  on public.cart_items for delete
  using ( auth.uid() = user_id );
