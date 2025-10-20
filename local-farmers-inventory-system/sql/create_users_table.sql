-- Users table for demo auth
-- Run this in Supabase SQL editor (public schema)

-- Ensure pgcrypto extension (for gen_random_uuid) is available
create extension if not exists pgcrypto;

create table if not exists public.users_demo (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text not null unique,
  contact text,
  password_hash text not null,
  is_admin boolean default false,
  created_at timestamptz default now()
);

-- create a demo admin user (password: adminpass)
-- NOTE: Replace the hashed password with a real bcrypt hash if you precompute one.
-- Example hash for 'adminpass' (bcrypt, 10 rounds):
-- $2a$10$e0NRwZaZQy8cQv0Z0f9q6u3g1Kk5Vb0kXU6xQ1cZ8qf9bZ1r8YzE6

insert into public.users_demo (name,email,contact,password_hash,is_admin)
values ('Admin','admin@example.com','', '$2a$10$e0NRwZaZQy8cQv0Z0f9q6u3g1Kk5Vb0kXU6xQ1cZ8qf9bZ1r8YzE6', true)
on conflict (email) do nothing;
