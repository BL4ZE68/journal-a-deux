-- À exécuter dans Supabase : Dashboard > SQL Editor > New query

create extension if not exists pgcrypto;

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  author_key text not null check (author_key in ('a', 'b')),
  content text,
  photo_url text,
  mood text,
  created_at timestamptz not null default now()
);

alter table public.entries enable row level security;

-- Accès simple par clé anon : suffisant pour un projet privé à deux,
-- protégé en amont par le code d'accès de l'app (voir .env / VITE_APP_PASSCODE).
drop policy if exists "read entries" on public.entries;
drop policy if exists "insert entries" on public.entries;
create policy "read entries"
  on public.entries for select
  using (true);

create policy "insert entries"
  on public.entries for insert
  with check (true);

-- Bucket de stockage pour les photos
insert into storage.buckets (id, name, public)
values ('journal-photos', 'journal-photos', true)
on conflict (id) do nothing;

drop policy if exists "read journal photos" on storage.objects;
drop policy if exists "upload journal photos" on storage.objects;
create policy "read journal photos"
  on storage.objects for select
  using (bucket_id = 'journal-photos');

create policy "upload journal photos"
  on storage.objects for insert
  with check (bucket_id = 'journal-photos');

-- Active le temps réel sur la table pour que les nouvelles entrées
-- apparaissent instantanément sans recharger la page
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'entries'
  ) then
    alter publication supabase_realtime add table public.entries;
  end if;
end $$;
