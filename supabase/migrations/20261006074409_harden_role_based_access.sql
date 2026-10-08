-- Authentication is handled by Supabase Auth. Authorization is enforced here,
-- independently of the routes or controls rendered by the React application.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.profiles
      where id = (select auth.uid())
        and role = 'super_admin'::public.user_role
    );
$$;

create or replace function private.user_sede_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select s.id
  from public.sedes as s
  where s.owner_id = (select auth.uid())
    and s.is_active is true
  union
  select sm.sede_id
  from public.sede_members as sm
  join public.sedes as s on s.id = sm.sede_id
  where sm.user_id = (select auth.uid())
    and s.is_active is true;
$$;

create or replace function private.can_access_sede(target_sede_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and (
      (select private.is_super_admin())
      or target_sede_id in (select private.user_sede_ids())
    );
$$;

revoke all on function private.is_super_admin() from public, anon;
revoke all on function private.user_sede_ids() from public, anon;
revoke all on function private.can_access_sede(uuid) from public, anon;
grant execute on function private.is_super_admin() to authenticated;
grant execute on function private.user_sede_ids() to authenticated;
grant execute on function private.can_access_sede(uuid) to authenticated;

-- Keep the legacy helpers used by column defaults, but make their behavior and
-- execution privileges safe for authenticated application users only.
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_super_admin();
$$;

create or replace function public.get_owned_sede_id()
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

revoke all on function public.is_super_admin() from public, anon;
revoke all on function public.get_owned_sede_id() from public, anon;
grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.get_owned_sede_id() to authenticated;

-- Remove legacy policies before replacing them with explicit per-operation
-- policies targeted only at authenticated users.
do $$
declare
  policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'profiles', 'sedes', 'sede_members', 'students', 'sessions',
        'session_students', 'teachers', 'pieces', 'inventory_items',
        'inventory_movements', 'payments', 'packages', 'gift_cards',
        'student_assigned_classes'
      )
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  end loop;
end
$$;

-- The anonymous API key can authenticate requests to Supabase, but it must not
-- provide access to application data before a user has signed in.
revoke all on all tables in schema public from anon;

-- Remove broad historical grants and restore only what the authenticated app
-- needs. RLS remains the row-level gate for every operation below.
revoke all on all tables in schema public from authenticated;
grant select, insert, update, delete on table
  public.sedes,
  public.sede_members,
  public.students,
  public.sessions,
  public.session_students,
  public.teachers,
  public.pieces,
  public.inventory_items,
  public.inventory_movements,
  public.payments,
  public.packages,
  public.gift_cards,
  public.student_assigned_classes
to authenticated;

grant select on table public.profiles to authenticated;
grant update (full_name, phone, avatar_url) on table public.profiles to authenticated;

alter table public.profiles enable row level security;
alter table public.sedes enable row level security;
alter table public.sede_members enable row level security;
alter table public.students enable row level security;
alter table public.sessions enable row level security;
alter table public.session_students enable row level security;
alter table public.teachers enable row level security;
alter table public.pieces enable row level security;
alter table public.inventory_items enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.payments enable row level security;
alter table public.packages enable row level security;
alter table public.gift_cards enable row level security;
alter table public.student_assigned_classes enable row level security;

create policy "profiles_select_authorized"
on public.profiles for select to authenticated
using (id = (select auth.uid()) or (select private.is_super_admin()));

create policy "profiles_update_own"
on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy "sedes_select_authorized"
on public.sedes for select to authenticated
using ((select private.can_access_sede(id)));

create policy "sedes_insert_super_admin"
on public.sedes for insert to authenticated
with check ((select private.is_super_admin()));

create policy "sedes_update_owner_or_super_admin"
on public.sedes for update to authenticated
using (owner_id = (select auth.uid()) or (select private.is_super_admin()))
with check (owner_id = (select auth.uid()) or (select private.is_super_admin()));

create policy "sedes_delete_super_admin"
on public.sedes for delete to authenticated
using ((select private.is_super_admin()));

create policy "sede_members_select_authorized"
on public.sede_members for select to authenticated
using (
  user_id = (select auth.uid())
  or (select private.is_super_admin())
  or exists (
    select 1 from public.sedes as s
    where s.id = sede_members.sede_id
      and s.owner_id = (select auth.uid())
  )
);

create policy "sede_members_insert_owner_or_super_admin"
on public.sede_members for insert to authenticated
with check (
  (select private.is_super_admin())
  or exists (
    select 1 from public.sedes as s
    where s.id = sede_members.sede_id
      and s.owner_id = (select auth.uid())
  )
);

create policy "sede_members_update_owner_or_super_admin"
on public.sede_members for update to authenticated
using (
  (select private.is_super_admin())
  or exists (
    select 1 from public.sedes as s
    where s.id = sede_members.sede_id
      and s.owner_id = (select auth.uid())
  )
)
with check (
  (select private.is_super_admin())
  or exists (
    select 1 from public.sedes as s
    where s.id = sede_members.sede_id
      and s.owner_id = (select auth.uid())
  )
);

create policy "sede_members_delete_owner_or_super_admin"
on public.sede_members for delete to authenticated
using (
  (select private.is_super_admin())
  or exists (
    select 1 from public.sedes as s
    where s.id = sede_members.sede_id
      and s.owner_id = (select auth.uid())
  )
);

-- Tables scoped directly by sede_id. Talleristas and staff can work only with
-- the active workshop they own or belong to; super_admin can work globally.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'students', 'sessions', 'session_students', 'teachers', 'pieces',
    'inventory_items', 'inventory_movements', 'payments', 'gift_cards',
    'student_assigned_classes'
  ]
  loop
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select private.can_access_sede(sede_id)))',
      table_name || '_select_authorized', table_name
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select private.can_access_sede(sede_id)))',
      table_name || '_insert_authorized', table_name
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select private.can_access_sede(sede_id))) with check ((select private.can_access_sede(sede_id)))',
      table_name || '_update_authorized', table_name
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select private.can_access_sede(sede_id)))',
      table_name || '_delete_authorized', table_name
    );
  end loop;
end
$$;

create policy "packages_select_authorized"
on public.packages for select to authenticated
using (
  (select private.is_super_admin())
  or exists (
    select 1 from public.students as s
    where s.id = packages.student_id
      and (select private.can_access_sede(s.sede_id))
  )
);

create policy "packages_insert_authorized"
on public.packages for insert to authenticated
with check (
  (select private.is_super_admin())
  or exists (
    select 1 from public.students as s
    where s.id = packages.student_id
      and (select private.can_access_sede(s.sede_id))
  )
);

create policy "packages_update_authorized"
on public.packages for update to authenticated
using (
  (select private.is_super_admin())
  or exists (
    select 1 from public.students as s
    where s.id = packages.student_id
      and (select private.can_access_sede(s.sede_id))
  )
)
with check (
  (select private.is_super_admin())
  or exists (
    select 1 from public.students as s
    where s.id = packages.student_id
      and (select private.can_access_sede(s.sede_id))
  )
);

create policy "packages_delete_authorized"
on public.packages for delete to authenticated
using (
  (select private.is_super_admin())
  or exists (
    select 1 from public.students as s
    where s.id = packages.student_id
      and (select private.can_access_sede(s.sede_id))
  )
);
