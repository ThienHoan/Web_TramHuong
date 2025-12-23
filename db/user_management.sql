-- Create a table for public profiles if it doesn't exist
create table if not exists public.users (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  full_name text,
  avatar_url text,
  role text check (role in ('ADMIN', 'STAFF', 'CUSTOMER')) default 'CUSTOMER',
  is_banned boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_sign_in_at timestamp with time zone
);

-- Set up Row Level Security (RLS)
alter table public.users enable row level security;

-- Policies (Drop first to avoid "already exists" error)
drop policy if exists "Public profiles are viewable by everyone." on public.users;
create policy "Public profiles are viewable by everyone." on public.users
  for select using (true);

drop policy if exists "Users can insert their own profile." on public.users;
create policy "Users can insert their own profile." on public.users
  for insert with check (auth.uid() = id);

drop policy if exists "Users can update own profile." on public.users;
create policy "Users can update own profile." on public.users
  for update using (auth.uid() = id);

-- Trigger to handle new user signups
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name, role)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name',
    'CUSTOMER' -- Default role
  );
  return new;
end;
$$ language plpgsql security definer;

-- Re-create trigger (Drop first to avoid error if exists)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trigger to sync email updates
create or replace function public.handle_user_update()
returns trigger as $$
begin
  update public.users
  set 
    email = new.email,
    last_sign_in_at = new.last_sign_in_at
  where id = new.id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update on auth.users
  for each row execute procedure public.handle_user_update();
