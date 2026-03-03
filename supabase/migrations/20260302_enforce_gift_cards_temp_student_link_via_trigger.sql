create or replace function public.ensure_gift_card_recipient_student_link()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient text;
  v_student_id uuid;
  v_name text;
  v_surname text;
  v_effective_type text;
begin
  v_recipient := btrim(coalesce(new.recipient, ''));

  if new.sede_id is null or v_recipient = '' then
    return new;
  end if;

  if new.recipient_student_id is not null then
    select s.id
      into v_student_id
    from public.students s
    where s.id = new.recipient_student_id
      and s.sede_id = new.sede_id
      and s.student_category in ('temporal', 'grupo_temporal', 'grupal')
    limit 1;

    if v_student_id is not null then
      new.recipient_student_id := v_student_id;
      return new;
    end if;

    new.recipient_student_id := null;
  end if;

  select s.id
    into v_student_id
  from public.students s
  where s.sede_id = new.sede_id
    and s.student_category in ('temporal', 'grupo_temporal', 'grupal')
    and (
      upper(btrim(s.full_name)) = upper(v_recipient)
      or upper(btrim(s.name)) = upper(v_recipient)
    )
  order by
    case when upper(btrim(s.full_name)) = upper(v_recipient) then 0 else 1 end,
    s.created_at desc nulls last,
    s.id
  limit 1;

  if v_student_id is null then
    v_name := split_part(v_recipient, ' ', 1);
    v_surname := nullif(btrim(substr(v_recipient, length(v_name) + 1)), '');
    v_effective_type := coalesce(new.type, 'modelado');

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
    values (
      new.sede_id,
      v_recipient,
      v_name,
      v_surname,
      '',
      coalesce(new.num_classes, 0),
      'new',
      'temporal',
      case when v_effective_type = 'torno' then 'Torno' else 'Modelado' end,
      case when new.expiry_date is not null then (new.expiry_date::timestamp at time zone 'UTC') else null end,
      'Creado automaticamente desde bono regalo'
    )
    returning id into v_student_id;
  end if;

  new.recipient_student_id := v_student_id;
  return new;
end;
$$;

drop trigger if exists trg_ensure_gift_card_recipient_student_link on public.gift_cards;

create trigger trg_ensure_gift_card_recipient_student_link
before insert or update of recipient, recipient_student_id, num_classes, type, expiry_date, sede_id
on public.gift_cards
for each row
execute function public.ensure_gift_card_recipient_student_link();

update public.gift_cards
set recipient = recipient
where recipient_student_id is null;
