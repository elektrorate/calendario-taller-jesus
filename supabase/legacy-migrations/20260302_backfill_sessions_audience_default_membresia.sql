alter table public.sessions
  alter column session_audience set default 'membresia';

with inferred_audience as (
  select
    s.id as session_id,
    case
      when count(ss.id) = 0 then 'membresia'
      when bool_or(
        coalesce(ss.is_temporary, false)
        or coalesce(st.student_category in ('temporal', 'grupo_temporal', 'grupal'), false)
      ) then 'temporal'
      else 'membresia'
    end as audience
  from public.sessions s
  left join public.session_students ss
    on ss.session_id = s.id
  left join public.students st
    on st.id = ss.student_id
    or (
      st.sede_id = s.sede_id
      and lower(regexp_replace(coalesce(st.full_name, st.name, ''), '\s+', ' ', 'g'))
          = lower(regexp_replace(coalesce(ss.student_name, ''), '\s+', ' ', 'g'))
    )
  where s.session_audience is null
  group by s.id
)
update public.sessions s
set session_audience = inferred_audience.audience
from inferred_audience
where s.id = inferred_audience.session_id
  and s.session_audience is null;
