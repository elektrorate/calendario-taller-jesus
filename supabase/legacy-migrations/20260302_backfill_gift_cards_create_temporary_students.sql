with unresolved as (
  select
    g.id as gift_card_id,
    g.sede_id,
    btrim(g.recipient) as recipient,
    g.type,
    g.num_classes,
    g.expiry_date
  from public.gift_cards g
  where g.recipient_student_id is null
    and g.sede_id is not null
    and coalesce(btrim(g.recipient), '') <> ''
),
existing_unique as (
  select
    u.gift_card_id,
    (array_agg(s.id order by s.id))[1] as student_id
  from unresolved u
  join public.students s
    on s.sede_id = u.sede_id
   and (
     upper(btrim(s.full_name)) = upper(u.recipient)
     or upper(btrim(s.name)) = upper(u.recipient)
   )
  group by u.gift_card_id
  having count(*) = 1
),
attach_existing as (
  update public.gift_cards g
  set recipient_student_id = e.student_id
  from existing_unique e
  where g.id = e.gift_card_id
    and g.recipient_student_id is null
  returning g.id
),
remaining as (
  select
    u.gift_card_id,
    u.sede_id,
    u.recipient,
    u.type,
    u.num_classes,
    u.expiry_date
  from unresolved u
  join public.gift_cards g on g.id = u.gift_card_id
  where g.recipient_student_id is null
),
candidates as (
  select
    r.sede_id,
    r.recipient,
    max(r.expiry_date) as expiry_date,
    max(r.num_classes) as num_classes,
    (array_agg(r.type order by r.gift_card_id desc))[1] as type
  from remaining r
  where not exists (
    select 1
    from public.students s
    where s.sede_id = r.sede_id
      and (
        upper(btrim(s.full_name)) = upper(r.recipient)
        or upper(btrim(s.name)) = upper(r.recipient)
      )
  )
  group by r.sede_id, r.recipient
),
created as (
  insert into public.students (
    sede_id,
    full_name,
    name,
    surname,
    phone,
    classes_remaining,
    status,
    student_category,
    class_type,
    expiry_date,
    notes
  )
  select
    c.sede_id,
    c.recipient,
    split_part(c.recipient, ' ', 1),
    nullif(btrim(substr(c.recipient, length(split_part(c.recipient, ' ', 1)) + 1)), ''),
    '',
    coalesce(c.num_classes, 0),
    'new',
    'temporal',
    case when c.type = 'torno' then 'Torno' when c.type = 'modelado' then 'Modelado' else null end,
    case when c.expiry_date is not null then (c.expiry_date::timestamp at time zone 'UTC') else null end,
    'Creado automaticamente desde bono regalo'
  from candidates c
  returning id, sede_id, full_name
)
update public.gift_cards g
set recipient_student_id = c.id
from remaining r
join created c
  on c.sede_id = r.sede_id
 and upper(btrim(c.full_name)) = upper(r.recipient)
where g.id = r.gift_card_id
  and g.recipient_student_id is null;
