-- Terapkan HANYA pada project yang dipilih sebagai backend Media.
-- Tidak mengubah tabel bbweb_articles atau autentikasi website utama.
create extension if not exists pgcrypto;

create table if not exists public.media_staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('chief_editor','editor','writer')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.media_articles (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 5 and 220),
  slug text not null unique check (slug ~ '^[a-z0-9-]{4,120}$'),
  category text not null check(category in ('Nasional','Ekonomi','Bisnis','Teknologi','Internasional','Pendidikan','Lifestyle','Digital')),
  excerpt text not null default '',
  body jsonb not null default '[]'::jsonb check (jsonb_typeof(body) = 'array'),
  image text,
  image_alt text,
  image_credit text,
  author text not null default 'Tim Redaksi',
  author_id uuid not null references auth.users(id),
  status text not null default 'draft' check (status in ('draft','pending_review','published')),
  featured boolean not null default false,
  read_minutes int not null default 5 check (read_minutes between 1 and 120),
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists media_articles_public_idx on public.media_articles(status,published_at desc);
create index if not exists media_articles_author_idx on public.media_articles(author_id,created_at desc);

create or replace function public.media_article_timestamps()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  if new.status = 'published' and new.published_at is null then new.published_at = now(); end if;
  if tg_op = 'UPDATE' and old.published_at is not null then new.published_at = old.published_at; end if;
  return new;
end;
$$;
drop trigger if exists media_article_timestamp_trigger on public.media_articles;
create trigger media_article_timestamp_trigger before insert or update on public.media_articles
for each row execute function public.media_article_timestamps();

alter table public.media_staff enable row level security;
alter table public.media_articles enable row level security;

-- Baca role sendiri; tidak ada kebijakan INSERT/UPDATE/DELETE untuk staf dari browser.
drop policy if exists media_staff_read_own on public.media_staff;
create policy media_staff_read_own on public.media_staff for select to authenticated
using (user_id = (select auth.uid()));

-- Semua pembaca hanya melihat artikel yang sudah diterbitkan.
drop policy if exists media_public_read on public.media_articles;
create policy media_public_read on public.media_articles for select to anon, authenticated
using (status = 'published');

-- Staf aktif dapat membaca artikel redaksi, termasuk draft.
drop policy if exists media_staff_read on public.media_articles;
create policy media_staff_read on public.media_articles for select to authenticated
using (exists (select 1 from public.media_staff s where s.user_id=(select auth.uid()) and s.active));

-- Penulis hanya bisa membuat draft atau review; editor boleh menerbitkan.
drop policy if exists media_staff_create on public.media_articles;
create policy media_staff_create on public.media_articles for insert to authenticated
with check (
  author_id=(select auth.uid()) and exists (
    select 1 from public.media_staff s where s.user_id=(select auth.uid()) and s.active
    and (s.role in ('chief_editor','editor') or status in ('draft','pending_review'))
  )
);

-- Editor dapat mengubah semua artikel, penulis hanya draft/review miliknya.
drop policy if exists media_staff_update on public.media_articles;
create policy media_staff_update on public.media_articles for update to authenticated
using (
  exists (select 1 from public.media_staff s where s.user_id=(select auth.uid()) and s.active
   and (s.role in ('chief_editor','editor') or (s.role='writer' and author_id=(select auth.uid()) and status in ('draft','pending_review'))))
)
with check (
  exists (select 1 from public.media_staff s where s.user_id=(select auth.uid()) and s.active
   and (s.role in ('chief_editor','editor') or (s.role='writer' and author_id=(select auth.uid()) and status in ('draft','pending_review'))))
);

-- Hanya pemimpin redaksi boleh menghapus.
drop policy if exists media_chief_delete on public.media_articles;
create policy media_chief_delete on public.media_articles for delete to authenticated
using (exists (select 1 from public.media_staff s where s.user_id=(select auth.uid()) and s.active and s.role='chief_editor'));

revoke all on public.media_staff from anon,authenticated;
revoke all on public.media_articles from anon,authenticated;
grant select on public.media_staff to authenticated;
grant select on public.media_articles to anon;
grant select,insert,update,delete on public.media_articles to authenticated;

-- Memberikan role pertama, setelah memastikan UUID dari Auth Users (jangan gunakan user_metadata):
-- insert into public.media_staff (user_id,role) values ('<AUTH_USER_UUID>','chief_editor');
