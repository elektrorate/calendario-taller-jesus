alter table public.students
  add column if not exists membership_tier text,
  add column if not exists membership_activated_at date,
  add column if not exists archived_at date;

update public.students
set membership_tier = case
  when price = 90 then 'plata'
  when price = 180 then 'platinum'
  else 'gold'
end
where coalesce(student_category, 'membresia') = 'membresia'
  and membership_tier is null;

update public.students
set membership_activated_at = coalesce(expiry_date, created_at::date)
where coalesce(student_category, 'membresia') = 'membresia'
  and membership_activated_at is null;

update public.students
set bonos_asignados = case
  when coalesce(student_category, 'membresia') = 'temporal' then 1
  when membership_tier = 'plata' then 3
  when membership_tier = 'platinum' then 8
  else 4
end
where bonos_asignados is null;

create index if not exists students_archived_at_idx on public.students (archived_at);
create index if not exists students_membership_tier_idx on public.students (membership_tier);
