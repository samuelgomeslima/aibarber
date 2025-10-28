-- Stores per-user language and appearance settings for the mobile app.
-- Run these statements inside the `public` schema of your Supabase project.

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  language text,
  appearance text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_preferences_language_check check (
    language is null or language in ('en', 'pt')
  ),
  constraint user_preferences_appearance_check check (
    appearance is null or appearance in ('system', 'light', 'dark')
  )
);

create trigger on_user_preferences_updated
before update on public.user_preferences
for each row
execute function public.update_updated_at_column();

alter table public.user_preferences enable row level security;

create policy if not exists "Users can manage their own preferences" on public.user_preferences
for all using (
  auth.uid() = user_preferences.user_id
)
with check (
  auth.uid() = user_preferences.user_id
);

comment on table public.user_preferences is 'Tracks each users language and appearance selections for the app.';
