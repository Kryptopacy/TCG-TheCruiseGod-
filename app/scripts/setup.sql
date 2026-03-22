-- Enable UUID extension just in case (inherent to Supabase but good practice)
create extension if not exists "uuid-ossp";

-- Trophies Table
create table if not exists public.trophies (
    id uuid default gen_random_uuid() primary key,
    -- Best Practice: Enforce cascading deletes so data is cleaned up if the user is removed from auth.users
    user_id uuid references auth.users(id) on delete cascade not null,
    type text not null,
    title text not null,
    content text not null,
    mode text not null,
    image_url text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Best Practice: Always index foreign keys and columns you explicitly order/filter by in queries 
create index if not exists idx_trophies_user_id on public.trophies(user_id);
create index if not exists idx_trophies_created_at on public.trophies(created_at desc);

alter table public.trophies enable row level security;

-- Strict Authentication Policies
create policy "Users can view their own trophies"
    on public.trophies for select
    to authenticated
    using ( auth.uid() = user_id );

create policy "Users can insert their own trophies"
    on public.trophies for insert
    to authenticated
    with check ( auth.uid() = user_id );

create policy "Users can delete their own trophies"
    on public.trophies for delete
    to authenticated
    using ( auth.uid() = user_id );

-- Storage bucket for trophies
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
values ('trophies', 'trophies', true, 5242880, '{"image/png","image/jpeg","image/webp"}')
on conflict (id) do nothing;

create policy "Trophy images are publicly accessible"
    on storage.objects for select
    using ( bucket_id = 'trophies' );

create policy "Users can upload trophy images to their own folder"
    on storage.objects for insert
    to authenticated
    with check ( 
        bucket_id = 'trophies' and 
        -- Best Practice: Strictly force users to only upload logic inside their respective UUID folders
        (storage.foldername(name))[1] = auth.uid()::text 
    );
