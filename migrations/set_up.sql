begin;

-- Required for gen_random_uuid()
create extension if not exists pgcrypto;

-- =========================
-- Helper functions
-- =========================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.are_friends(user1 uuid, user2 uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.friendships f
    where (f.user_a_id = user1 and f.user_b_id = user2)
       or (f.user_a_id = user2 and f.user_b_id = user1)
  );
$$;

create or replace function public.can_view_content(owner_id uuid, is_public boolean)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() = owner_id
    or (
      is_public = true
      and public.are_friends(auth.uid(), owner_id)
    );
$$;

-- =========================
-- Core tables
-- =========================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  handle text not null unique,
  first_name text not null,
  last_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint handle_format_chk check (handle ~ '^[a-z0-9_]{3,30}$')
);

create table if not exists public.user_habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_habits_unique_name_per_user unique (user_id, name)
);

create table if not exists public.daily_journals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  mood smallint check (mood between 1 and 7),
  highlight text,
  smile text,
  grateful text,
  proudest_moment text,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_journals_unique_user_day unique (user_id, entry_date)
);

create table if not exists public.daily_journal_habits (
  journal_id uuid not null references public.daily_journals(id) on delete cascade,
  habit_id uuid not null references public.user_habits(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (journal_id, habit_id)
);

create table if not exists public.weekly_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  read text,
  eat text,
  play text,
  obsess text,
  recommend text,
  treat text,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.individual_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  journal_id uuid references public.daily_journals(id) on delete cascade,
  entry_type text not null check (entry_type in ('highlight', 'smile', 'grateful', 'proudestMoment')),
  content text not null check (length(trim(content)) > 0),
  entry_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'canceled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friend_requests_unique_pair unique (requester_id, addressee_id),
  constraint friend_requests_not_self check (requester_id <> addressee_id)
);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid not null references auth.users(id) on delete cascade,
  user_b_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint friendships_not_self check (user_a_id <> user_b_id),
  constraint friendships_ordered_pair check (user_a_id < user_b_id),
  constraint friendships_unique_pair unique (user_a_id, user_b_id)
);

-- =========================
-- Likes + Comments tables
-- =========================

create table if not exists public.daily_journal_likes (
  journal_id uuid not null references public.daily_journals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (journal_id, user_id)
);

create table if not exists public.weekly_report_likes (
  report_id uuid not null references public.weekly_reports(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (report_id, user_id)
);

create table if not exists public.daily_journal_comments (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid not null references public.daily_journals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  comment_text text not null check (length(trim(comment_text)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.weekly_report_comments (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.weekly_reports(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  comment_text text not null check (length(trim(comment_text)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================
-- Indexes
-- =========================

create index if not exists idx_profiles_handle on public.profiles(handle);
create index if not exists idx_profiles_email on public.profiles(email);

create index if not exists idx_user_habits_user_sort on public.user_habits(user_id, sort_order, name);

create index if not exists idx_daily_journals_user_date on public.daily_journals(user_id, entry_date desc);
create index if not exists idx_daily_journals_public_date on public.daily_journals(is_public, entry_date desc);

create index if not exists idx_weekly_reports_user_week on public.weekly_reports(user_id, week_start desc);
create index if not exists idx_weekly_reports_public_week on public.weekly_reports(is_public, week_start desc);

create index if not exists idx_individual_entries_user_date on public.individual_entries(user_id, entry_date desc);
create index if not exists idx_individual_entries_type on public.individual_entries(entry_type);

create index if not exists idx_friend_requests_addressee_status on public.friend_requests(addressee_id, status, created_at desc);
create index if not exists idx_friend_requests_requester_status on public.friend_requests(requester_id, status, created_at desc);

create index if not exists idx_friendships_a on public.friendships(user_a_id);
create index if not exists idx_friendships_b on public.friendships(user_b_id);

create index if not exists idx_daily_journal_comments_journal_created on public.daily_journal_comments(journal_id, created_at desc);
create index if not exists idx_weekly_report_comments_report_created on public.weekly_report_comments(report_id, created_at desc);

-- =========================
-- updated_at triggers
-- =========================

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_user_habits_updated_at on public.user_habits;
create trigger trg_user_habits_updated_at
before update on public.user_habits
for each row execute function public.set_updated_at();

drop trigger if exists trg_daily_journals_updated_at on public.daily_journals;
create trigger trg_daily_journals_updated_at
before update on public.daily_journals
for each row execute function public.set_updated_at();

drop trigger if exists trg_weekly_reports_updated_at on public.weekly_reports;
create trigger trg_weekly_reports_updated_at
before update on public.weekly_reports
for each row execute function public.set_updated_at();

drop trigger if exists trg_individual_entries_updated_at on public.individual_entries;
create trigger trg_individual_entries_updated_at
before update on public.individual_entries
for each row execute function public.set_updated_at();

drop trigger if exists trg_friend_requests_updated_at on public.friend_requests;
create trigger trg_friend_requests_updated_at
before update on public.friend_requests
for each row execute function public.set_updated_at();

drop trigger if exists trg_daily_journal_comments_updated_at on public.daily_journal_comments;
create trigger trg_daily_journal_comments_updated_at
before update on public.daily_journal_comments
for each row execute function public.set_updated_at();

drop trigger if exists trg_weekly_report_comments_updated_at on public.weekly_report_comments;
create trigger trg_weekly_report_comments_updated_at
before update on public.weekly_report_comments
for each row execute function public.set_updated_at();

-- =========================
-- RLS enable
-- =========================

alter table public.profiles enable row level security;
alter table public.user_habits enable row level security;
alter table public.daily_journals enable row level security;
alter table public.daily_journal_habits enable row level security;
alter table public.weekly_reports enable row level security;
alter table public.individual_entries enable row level security;
alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;
alter table public.daily_journal_likes enable row level security;
alter table public.weekly_report_likes enable row level security;
alter table public.daily_journal_comments enable row level security;
alter table public.weekly_report_comments enable row level security;

-- =========================
-- Drop existing policies (safe rerun)
-- =========================

drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_insert on public.profiles;
drop policy if exists profiles_update on public.profiles;
drop policy if exists profiles_delete on public.profiles;

drop policy if exists user_habits_select on public.user_habits;
drop policy if exists user_habits_insert on public.user_habits;
drop policy if exists user_habits_update on public.user_habits;
drop policy if exists user_habits_delete on public.user_habits;

drop policy if exists daily_journals_select on public.daily_journals;
drop policy if exists daily_journals_insert on public.daily_journals;
drop policy if exists daily_journals_update on public.daily_journals;
drop policy if exists daily_journals_delete on public.daily_journals;

drop policy if exists daily_journal_habits_select on public.daily_journal_habits;
drop policy if exists daily_journal_habits_insert on public.daily_journal_habits;
drop policy if exists daily_journal_habits_delete on public.daily_journal_habits;

drop policy if exists weekly_reports_select on public.weekly_reports;
drop policy if exists weekly_reports_insert on public.weekly_reports;
drop policy if exists weekly_reports_update on public.weekly_reports;
drop policy if exists weekly_reports_delete on public.weekly_reports;

drop policy if exists individual_entries_select on public.individual_entries;
drop policy if exists individual_entries_insert on public.individual_entries;
drop policy if exists individual_entries_update on public.individual_entries;
drop policy if exists individual_entries_delete on public.individual_entries;

drop policy if exists friend_requests_select on public.friend_requests;
drop policy if exists friend_requests_insert on public.friend_requests;
drop policy if exists friend_requests_update on public.friend_requests;
drop policy if exists friend_requests_delete on public.friend_requests;

drop policy if exists friendships_select on public.friendships;
drop policy if exists friendships_insert on public.friendships;
drop policy if exists friendships_delete on public.friendships;

drop policy if exists daily_journal_likes_select on public.daily_journal_likes;
drop policy if exists daily_journal_likes_insert on public.daily_journal_likes;
drop policy if exists daily_journal_likes_delete on public.daily_journal_likes;

drop policy if exists weekly_report_likes_select on public.weekly_report_likes;
drop policy if exists weekly_report_likes_insert on public.weekly_report_likes;
drop policy if exists weekly_report_likes_delete on public.weekly_report_likes;

drop policy if exists daily_journal_comments_select on public.daily_journal_comments;
drop policy if exists daily_journal_comments_insert on public.daily_journal_comments;
drop policy if exists daily_journal_comments_update on public.daily_journal_comments;
drop policy if exists daily_journal_comments_delete on public.daily_journal_comments;

drop policy if exists weekly_report_comments_select on public.weekly_report_comments;
drop policy if exists weekly_report_comments_insert on public.weekly_report_comments;
drop policy if exists weekly_report_comments_update on public.weekly_report_comments;
drop policy if exists weekly_report_comments_delete on public.weekly_report_comments;

-- =========================
-- Policies: profiles
-- =========================

-- All authenticated users can read profiles (needed for user search/discovery)
create policy profiles_select
on public.profiles
for select
to public
using (true);

create policy profiles_insert
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

create policy profiles_update
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy profiles_delete
on public.profiles
for delete
to authenticated
using (id = auth.uid());

-- =========================
-- Policies: user_habits
-- =========================

create policy user_habits_select
on public.user_habits
for select
to authenticated
using (
  user_id = auth.uid()
  or public.are_friends(auth.uid(), user_id)
);

create policy user_habits_insert
on public.user_habits
for insert
to authenticated
with check (user_id = auth.uid());

create policy user_habits_update
on public.user_habits
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy user_habits_delete
on public.user_habits
for delete
to authenticated
using (user_id = auth.uid());

-- =========================
-- Policies: daily_journals
-- =========================

create policy daily_journals_select
on public.daily_journals
for select
to authenticated
using (
  public.can_view_content(user_id, is_public)
);

create policy daily_journals_insert
on public.daily_journals
for insert
to authenticated
with check (user_id = auth.uid());

create policy daily_journals_update
on public.daily_journals
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy daily_journals_delete
on public.daily_journals
for delete
to authenticated
using (user_id = auth.uid());

-- =========================
-- Policies: daily_journal_habits
-- =========================

create policy daily_journal_habits_select
on public.daily_journal_habits
for select
to authenticated
using (
  exists (
    select 1
    from public.daily_journals j
    where j.id = journal_id
      and public.can_view_content(j.user_id, j.is_public)
  )
);

create policy daily_journal_habits_insert
on public.daily_journal_habits
for insert
to authenticated
with check (
  exists (
    select 1
    from public.daily_journals j
    where j.id = journal_id
      and j.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.user_habits h
    where h.id = habit_id
      and h.user_id = auth.uid()
  )
);

create policy daily_journal_habits_delete
on public.daily_journal_habits
for delete
to authenticated
using (
  exists (
    select 1
    from public.daily_journals j
    where j.id = journal_id
      and j.user_id = auth.uid()
  )
);

-- =========================
-- Policies: weekly_reports
-- =========================

create policy weekly_reports_select
on public.weekly_reports
for select
to authenticated
using (
  public.can_view_content(user_id, is_public)
);

create policy weekly_reports_insert
on public.weekly_reports
for insert
to authenticated
with check (user_id = auth.uid());

create policy weekly_reports_update
on public.weekly_reports
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy weekly_reports_delete
on public.weekly_reports
for delete
to authenticated
using (user_id = auth.uid());

-- =========================
-- Policies: individual_entries
-- =========================

create policy individual_entries_select
on public.individual_entries
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.daily_journals j
    where j.id = journal_id
      and public.can_view_content(j.user_id, j.is_public)
  )
);

create policy individual_entries_insert
on public.individual_entries
for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    journal_id is null
    or exists (
      select 1
      from public.daily_journals j
      where j.id = journal_id
        and j.user_id = auth.uid()
    )
  )
);

create policy individual_entries_update
on public.individual_entries
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy individual_entries_delete
on public.individual_entries
for delete
to authenticated
using (user_id = auth.uid());

-- =========================
-- Policies: friend_requests
-- =========================

create policy friend_requests_select
on public.friend_requests
for select
to authenticated
using (
  requester_id = auth.uid()
  or addressee_id = auth.uid()
);

create policy friend_requests_insert
on public.friend_requests
for insert
to authenticated
with check (
  requester_id = auth.uid()
  and requester_id <> addressee_id
  and status = 'pending'
);

create policy friend_requests_update
on public.friend_requests
for update
to authenticated
using (
  requester_id = auth.uid()
  or addressee_id = auth.uid()
)
with check (
  requester_id = auth.uid()
  or addressee_id = auth.uid()
);

create policy friend_requests_delete
on public.friend_requests
for delete
to authenticated
using (
  requester_id = auth.uid()
  or addressee_id = auth.uid()
);

-- =========================
-- Policies: friendships
-- =========================

create policy friendships_select
on public.friendships
for select
to authenticated
using (
  user_a_id = auth.uid()
  or user_b_id = auth.uid()
);

create policy friendships_insert
on public.friendships
for insert
to authenticated
with check (
  (user_a_id = auth.uid() or user_b_id = auth.uid())
  and user_a_id < user_b_id
  and user_a_id <> user_b_id
);

create policy friendships_delete
on public.friendships
for delete
to authenticated
using (
  user_a_id = auth.uid()
  or user_b_id = auth.uid()
);

-- =========================
-- Policies: daily_journal_likes
-- =========================

create policy daily_journal_likes_select
on public.daily_journal_likes
for select
to authenticated
using (
  exists (
    select 1
    from public.daily_journals j
    where j.id = journal_id
      and public.can_view_content(j.user_id, j.is_public)
  )
);

create policy daily_journal_likes_insert
on public.daily_journal_likes
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.daily_journals j
    where j.id = journal_id
      and public.can_view_content(j.user_id, j.is_public)
  )
);

create policy daily_journal_likes_delete
on public.daily_journal_likes
for delete
to authenticated
using (user_id = auth.uid());

-- =========================
-- Policies: weekly_report_likes
-- =========================

create policy weekly_report_likes_select
on public.weekly_report_likes
for select
to authenticated
using (
  exists (
    select 1
    from public.weekly_reports r
    where r.id = report_id
      and public.can_view_content(r.user_id, r.is_public)
  )
);

create policy weekly_report_likes_insert
on public.weekly_report_likes
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.weekly_reports r
    where r.id = report_id
      and public.can_view_content(r.user_id, r.is_public)
  )
);

create policy weekly_report_likes_delete
on public.weekly_report_likes
for delete
to authenticated
using (user_id = auth.uid());

-- =========================
-- Policies: daily_journal_comments
-- =========================

create policy daily_journal_comments_select
on public.daily_journal_comments
for select
to authenticated
using (
  exists (
    select 1
    from public.daily_journals j
    where j.id = journal_id
      and public.can_view_content(j.user_id, j.is_public)
  )
);

create policy daily_journal_comments_insert
on public.daily_journal_comments
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.daily_journals j
    where j.id = journal_id
      and public.can_view_content(j.user_id, j.is_public)
  )
);

create policy daily_journal_comments_update
on public.daily_journal_comments
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy daily_journal_comments_delete
on public.daily_journal_comments
for delete
to authenticated
using (user_id = auth.uid());

-- =========================
-- Policies: weekly_report_comments
-- =========================

create policy weekly_report_comments_select
on public.weekly_report_comments
for select
to authenticated
using (
  exists (
    select 1
    from public.weekly_reports r
    where r.id = report_id
      and public.can_view_content(r.user_id, r.is_public)
  )
);

create policy weekly_report_comments_insert
on public.weekly_report_comments
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.weekly_reports r
    where r.id = report_id
      and public.can_view_content(r.user_id, r.is_public)
  )
);

create policy weekly_report_comments_update
on public.weekly_report_comments
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy weekly_report_comments_delete
on public.weekly_report_comments
for delete
to authenticated
using (user_id = auth.uid());

-- =========================
-- Grants for authenticated users
-- =========================

grant usage on schema public to authenticated;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.user_habits to authenticated;
grant select, insert, update, delete on public.daily_journals to authenticated;
grant select, insert, delete on public.daily_journal_habits to authenticated;
grant select, insert, update, delete on public.weekly_reports to authenticated;
grant select, insert, update, delete on public.individual_entries to authenticated;
grant select, insert, update, delete on public.friend_requests to authenticated;
grant select, insert, delete on public.friendships to authenticated;
grant select, insert, delete on public.daily_journal_likes to authenticated;
grant select, insert, delete on public.weekly_report_likes to authenticated;
grant select, insert, update, delete on public.daily_journal_comments to authenticated;
grant select, insert, update, delete on public.weekly_report_comments to authenticated;

grant execute on function public.are_friends(uuid, uuid) to authenticated;
grant execute on function public.can_view_content(uuid, boolean) to authenticated;

commit;