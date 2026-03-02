alter table public.gift_cards
  add column if not exists expiry_date date;

update public.gift_cards
set expiry_date = coalesce(
  expiry_date,
  (scheduled_date at time zone 'UTC')::date,
  ((created_at at time zone 'UTC')::date + 30),
  ((now() at time zone 'UTC')::date + 30)
)
where expiry_date is null;

alter table public.gift_cards
  alter column expiry_date set default ((now() at time zone 'UTC')::date + 30),
  alter column expiry_date set not null;
