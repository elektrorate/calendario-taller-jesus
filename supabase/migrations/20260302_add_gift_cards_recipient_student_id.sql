alter table public.gift_cards
  add column if not exists recipient_student_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'gift_cards_recipient_student_id_fkey'
      and conrelid = 'public.gift_cards'::regclass
  ) then
    alter table public.gift_cards
      add constraint gift_cards_recipient_student_id_fkey
      foreign key (recipient_student_id)
      references public.students(id)
      on delete set null;
  end if;
end $$;

create index if not exists idx_gift_cards_recipient_student_id
  on public.gift_cards(recipient_student_id);

with unique_full_name as (
  select g.id as gift_id, (array_agg(s.id order by s.id))[1] as student_id
  from public.gift_cards g
  join public.students s
    on s.sede_id = g.sede_id
   and upper(trim(g.recipient)) = upper(trim(s.full_name))
  where g.recipient_student_id is null
    and g.recipient is not null
    and g.recipient <> ''
  group by g.id
  having count(*) = 1
)
update public.gift_cards g
set recipient_student_id = u.student_id
from unique_full_name u
where g.id = u.gift_id
  and g.recipient_student_id is null;

with unique_name as (
  select g.id as gift_id, (array_agg(s.id order by s.id))[1] as student_id
  from public.gift_cards g
  join public.students s
    on s.sede_id = g.sede_id
   and upper(trim(g.recipient)) = upper(trim(s.name))
  where g.recipient_student_id is null
    and g.recipient is not null
    and g.recipient <> ''
  group by g.id
  having count(*) = 1
)
update public.gift_cards g
set recipient_student_id = u.student_id
from unique_name u
where g.id = u.gift_id
  and g.recipient_student_id is null;
