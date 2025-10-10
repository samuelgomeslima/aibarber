alter table public.bookings
  add column if not exists performed_at timestamp with time zone;

comment on column public.bookings.performed_at is
  'Timestamp recorded when the service was confirmed as performed.';
