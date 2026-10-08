-- Keep tenant-resolution helpers out of the exposed public schema.
create or replace function private.current_sede_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select accessible_sedes.sede_id
  from private.user_sede_ids() as accessible_sedes(sede_id)
  order by accessible_sedes.sede_id
  limit 1;
$$;

revoke all on function private.current_sede_id() from public, anon;
grant execute on function private.current_sede_id() to authenticated;

alter table public.gift_cards alter column sede_id set default private.current_sede_id();
alter table public.inventory_items alter column sede_id set default private.current_sede_id();
alter table public.inventory_movements alter column sede_id set default private.current_sede_id();
alter table public.payments alter column sede_id set default private.current_sede_id();
alter table public.pieces alter column sede_id set default private.current_sede_id();
alter table public.session_students alter column sede_id set default private.current_sede_id();
alter table public.sessions alter column sede_id set default private.current_sede_id();
alter table public.student_assigned_classes alter column sede_id set default private.current_sede_id();
alter table public.students alter column sede_id set default private.current_sede_id();
alter table public.teachers alter column sede_id set default private.current_sede_id();

create or replace function public.assign_sede_id_on_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.sede_id is null then
    new.sede_id := private.current_sede_id();
  end if;
  return new;
end;
$$;

-- Never trust raw_user_meta_data for authorization. Public sign-up requests can
-- modify it, so every automatically-created profile receives the least
-- privileged owner role. Admin-only server functions may promote it afterward.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'tallerista'::public.user_role
  );
  return new;
end;
$$;

alter function public.ensure_gift_card_recipient_student_link() set search_path = '';

-- Trigger functions execute through their trigger and do not need to be RPCs.
revoke all on function public.assign_sede_id_on_insert() from public, anon, authenticated, service_role;
revoke all on function public.ensure_gift_card_recipient_student_link() from public, anon, authenticated, service_role;
revoke all on function public.handle_new_user() from public, anon, authenticated, service_role;

-- Legacy RPC helpers are unused by the application and must not be exposed.
revoke all on function public.current_tenant_ids() from public, anon, authenticated, service_role;
revoke all on function public.get_owner_sede_id() from public, anon, authenticated, service_role;
revoke all on function public.list_super_admins() from public, anon, authenticated, service_role;
revoke all on function public.get_owned_sede_id() from public, anon, authenticated, service_role;
revoke all on function public.is_super_admin() from public, anon, authenticated, service_role;
