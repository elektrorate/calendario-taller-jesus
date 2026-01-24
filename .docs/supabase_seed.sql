-- Seed data based on constants.ts

-- Students
insert into students (name, surname, phone, email, classes_remaining, status, payment_method, price, notes, class_type, expiry_date)
values
  ('Sergi', 'Vidal', '34 607 71 39 26', 'sergi.vidal@email.com', 0, 'regular', null, 120, 'Alumno avanzado, prefiere torno.', 'Torno', '2026-02-01'),
  ('Chantal', 'Dupont', '33 6 73 72 14 32', 'c.dupont@email.com', 0, 'needs_renewal', 'Bizum', 100, null, 'Torno', '2026-01-30'),
  ('Elvira', 'Blanco', '34 644 13 50 14', 'elvira.b@email.com', 2, 'regular', 'Bizum', 100, null, 'Modelado', '2026-02-10'),
  ('Juan', 'GarcÇða', '34 630 91 95 59', 'juan.g@email.com', 0, 'needs_renewal', null, 180, null, 'Torno', '2026-02-20'),
  ('Maria', 'LÇüpez', '34 611 22 33 44', 'm.lopez@email.com', 4, 'regular', null, 100, null, 'Modelado', '2026-02-15'),
  ('Carlos', 'Ruiz', '34 655 44 33 22', 'carlos.r@email.com', 3, 'regular', null, 120, null, 'Torno', '2026-02-18'),
  ('Ana', 'MartÇðnez', '34 600 00 11 22', 'ana.mtz@email.com', 1, 'regular', null, 100, null, 'Modelado', '2026-02-05'),
  ('Roberto', 'SÇ­nchez', '34 622 33 44 55', 'rober.s@email.com', 0, 'needs_renewal', null, 120, null, 'Torno', '2026-01-25'),
  ('LucÇða', 'FernÇ­ndez', '34 633 44 55 66', 'lucia.f@email.com', 8, 'regular', null, 200, null, 'Torno', '2026-03-01'),
  ('Sofia', 'GÇümez', '34 644 55 66 77', 'sofia.g@email.com', 2, 'regular', null, 100, null, 'Modelado', '2026-02-12'),
  ('Miguel', 'Ç?ngel', '34 655 66 77 88', 'miguel.a@email.com', 4, 'regular', null, 120, null, 'Torno', '2026-02-28'),
  ('Elena', 'RodrÇðguez', '34 666 77 88 99', 'elena.rod@email.com', 0, 'needs_renewal', null, 100, null, 'Modelado', '2026-01-28'),
  ('David', 'PÇ¸rez', '34 677 88 99 00', 'david.p@email.com', 5, 'regular', null, 120, null, 'Torno', '2026-03-10');

-- Teachers
insert into teachers (name, surname, specialty, email)
values
  ('Laura', 'Martinez', 'Torno', 'laura@taller.com'),
  ('Ruben', 'Garcia', 'Modelado', 'ruben@taller.com');

-- Sessions
insert into sessions (date, start_time, end_time, class_type)
values
  ('2026-01-02', '10:00', '12:00', 'torno'),
  ('2026-01-02', '12:00', '14:00', 'mesa'),
  ('2026-01-05', '17:00', '19:00', 'torno'),
  ('2026-01-07', '10:00', '12:00', 'mesa'),
  ('2026-01-07', '18:00', '20:00', 'torno'),
  ('2026-01-09', '11:00', '13:00', 'torno'),
  ('2026-01-12', '16:00', '18:00', 'mesa'),
  ('2026-01-14', '10:30', '12:30', 'torno'),
  ('2026-01-16', '17:30', '19:30', 'mesa'),
  ('2026-01-19', '12:00', '14:00', 'torno'),
  ('2026-01-21', '18:00', '20:00', 'torno'),
  ('2026-01-23', '11:00', '13:00', 'mesa');

-- Session students + attendance
insert into session_students (session_id, student_id, student_name, attendance)
select s.id, st.id, 'SERGI VIDAL', 'present'
from sessions s join students st
  on upper(st.name || ' ' || coalesce(st.surname, '')) = 'SERGI VIDAL'
where s.date = '2026-01-02' and s.start_time = '10:00';

insert into session_students (session_id, student_id, student_name, attendance)
select s.id, st.id, 'ELVIRA BLANCO', 'present'
from sessions s join students st
  on upper(st.name || ' ' || coalesce(st.surname, '')) = 'ELVIRA BLANCO'
where s.date = '2026-01-02' and s.start_time = '12:00';

insert into session_students (session_id, student_id, student_name, attendance)
select s.id, st.id, 'MARIA LÇ"PEZ', 'present'
from sessions s join students st
  on upper(st.name || ' ' || coalesce(st.surname, '')) = 'MARIA LÇ"PEZ'
where s.date = '2026-01-02' and s.start_time = '12:00';

insert into session_students (session_id, student_id, student_name, attendance)
select s.id, st.id, 'JUAN GARCÇ?A', 'absent'
from sessions s join students st
  on upper(st.name || ' ' || coalesce(st.surname, '')) = 'JUAN GARCÇ?A'
where s.date = '2026-01-05' and s.start_time = '17:00';

insert into session_students (session_id, student_id, student_name, attendance)
select s.id, st.id, 'CARLOS RUIZ', 'present'
from sessions s join students st
  on upper(st.name || ' ' || coalesce(st.surname, '')) = 'CARLOS RUIZ'
where s.date = '2026-01-05' and s.start_time = '17:00';

insert into session_students (session_id, student_id, student_name, attendance)
select s.id, st.id, 'ANA MARTÇ?NEZ', 'present'
from sessions s join students st
  on upper(st.name || ' ' || coalesce(st.surname, '')) = 'ANA MARTÇ?NEZ'
where s.date = '2026-01-07' and s.start_time = '10:00';

insert into session_students (session_id, student_id, student_name, attendance)
select s.id, st.id, 'SOFIA GÇ"MEZ', 'pending'
from sessions s join students st
  on upper(st.name || ' ' || coalesce(st.surname, '')) = 'SOFIA GÇ"MEZ'
where s.date = '2026-01-07' and s.start_time = '10:00';

insert into session_students (session_id, student_id, student_name, attendance)
select s.id, st.id, 'MIGUEL Ç?NGEL', 'present'
from sessions s join students st
  on upper(st.name || ' ' || coalesce(st.surname, '')) = 'MIGUEL Ç?NGEL'
where s.date = '2026-01-07' and s.start_time = '18:00';

insert into session_students (session_id, student_id, student_name, attendance)
select s.id, st.id, 'DAVID PÇ%REZ', 'present'
from sessions s join students st
  on upper(st.name || ' ' || coalesce(st.surname, '')) = 'DAVID PÇ%REZ'
where s.date = '2026-01-07' and s.start_time = '18:00';

insert into session_students (session_id, student_id, student_name, attendance)
select s.id, st.id, 'LUCÇ?A FERNÇ?NDEZ', 'present'
from sessions s join students st
  on upper(st.name || ' ' || coalesce(st.surname, '')) = 'LUCÇ?A FERNÇ?NDEZ'
where s.date = '2026-01-09' and s.start_time = '11:00';

insert into session_students (session_id, student_id, student_name, attendance)
select s.id, st.id, 'ELENA RODRÇ?GUEZ', 'present'
from sessions s join students st
  on upper(st.name || ' ' || coalesce(st.surname, '')) = 'ELENA RODRÇ?GUEZ'
where s.date = '2026-01-12' and s.start_time = '16:00';

insert into session_students (session_id, student_id, student_name, attendance)
select s.id, st.id, 'ELVIRA BLANCO', 'absent'
from sessions s join students st
  on upper(st.name || ' ' || coalesce(st.surname, '')) = 'ELVIRA BLANCO'
where s.date = '2026-01-12' and s.start_time = '16:00';

insert into session_students (session_id, student_id, student_name, attendance)
select s.id, st.id, 'SERGI VIDAL', 'present'
from sessions s join students st
  on upper(st.name || ' ' || coalesce(st.surname, '')) = 'SERGI VIDAL'
where s.date = '2026-01-14' and s.start_time = '10:30';

insert into session_students (session_id, student_id, student_name, attendance)
select s.id, st.id, 'CARLOS RUIZ', 'present'
from sessions s join students st
  on upper(st.name || ' ' || coalesce(st.surname, '')) = 'CARLOS RUIZ'
where s.date = '2026-01-14' and s.start_time = '10:30';

insert into session_students (session_id, student_id, student_name, attendance)
select s.id, st.id, 'ANA MARTÇ?NEZ', 'present'
from sessions s join students st
  on upper(st.name || ' ' || coalesce(st.surname, '')) = 'ANA MARTÇ?NEZ'
where s.date = '2026-01-16' and s.start_time = '17:30';

insert into session_students (session_id, student_id, student_name, attendance)
select s.id, st.id, 'MARIA LÇ"PEZ', 'present'
from sessions s join students st
  on upper(st.name || ' ' || coalesce(st.surname, '')) = 'MARIA LÇ"PEZ'
where s.date = '2026-01-16' and s.start_time = '17:30';

insert into session_students (session_id, student_id, student_name, attendance)
select s.id, st.id, 'SOFIA GÇ"MEZ', 'present'
from sessions s join students st
  on upper(st.name || ' ' || coalesce(st.surname, '')) = 'SOFIA GÇ"MEZ'
where s.date = '2026-01-16' and s.start_time = '17:30';

insert into session_students (session_id, student_id, student_name, attendance)
select s.id, st.id, 'JUAN GARCÇ?A', 'present'
from sessions s join students st
  on upper(st.name || ' ' || coalesce(st.surname, '')) = 'JUAN GARCÇ?A'
where s.date = '2026-01-19' and s.start_time = '12:00';

insert into session_students (session_id, student_id, student_name, attendance)
select s.id, st.id, 'MIGUEL Ç?NGEL', 'present'
from sessions s join students st
  on upper(st.name || ' ' || coalesce(st.surname, '')) = 'MIGUEL Ç?NGEL'
where s.date = '2026-01-21' and s.start_time = '18:00';

insert into session_students (session_id, student_id, student_name, attendance)
select s.id, st.id, 'ELENA RODRÇ?GUEZ', 'present'
from sessions s join students st
  on upper(st.name || ' ' || coalesce(st.surname, '')) = 'ELENA RODRÇ?GUEZ'
where s.date = '2026-01-23' and s.start_time = '11:00';

-- Pieces
insert into pieces (owner_student_id, owner_name, description, status, glaze_type)
values
  ((select id from students where upper(name || ' ' || coalesce(surname, '')) = 'SERGI VIDAL'), 'Sergi Vidal', 'Bowl de Desayuno Grande', 'entregado', 'Azul Cobalto Brillo'),
  ((select id from students where upper(name || ' ' || coalesce(surname, '')) = 'ELVIRA BLANCO'), 'Elvira Blanco', 'JarrÇün de Cuello Estrecho', 'a_recogida', 'CeladÇün ClÇ­sico'),
  ((select id from students where upper(name || ' ' || coalesce(surname, '')) = 'MARIA LÇÜPEZ'), 'Maria LÇüpez', 'Set de 3 Tazas Espresso', 'esmaltado', 'Blanco Nieve');

-- Gift cards
insert into gift_cards (buyer, recipient, num_classes, type, scheduled_date, created_at)
values
  ('Abril', 'Juan', 2, 'modelado', null, '2026-01-01T10:00:00Z');

-- Inventory items
insert into inventory_items (category, name, code, unit, current_quantity, min_quantity, status, color_family, finish, location, created_at, updated_at)
values
  ('glaze', 'Blanco Nieve Brillo', 'GL-001', 'l', 4.5, 2.0, 'active', 'blancos', 'brillo', 'Estante A-1', '2025-10-01T10:00:00Z', '2026-01-05T10:00:00Z'),
  ('glaze', 'CeladÇün ClÇ­sico Verde', 'GL-002', 'l', 0.5, 1.0, 'active', 'verdes', 'brillo', 'Estante A-2', '2025-10-01T10:00:00Z', '2026-01-05T10:00:00Z'),
  ('glaze', 'Tenmoku Negro Aceite', 'GL-003', 'l', 3.5, 1.5, 'active', 'negros', 'satinado', 'Estante A-1', '2025-10-01T10:00:00Z', '2026-01-05T10:00:00Z'),
  ('glaze', 'Azul Cobalto Mate', 'GL-004', 'l', 0.2, 2.0, 'active', 'azules', 'mate', 'Estante A-3', '2025-10-01T10:00:00Z', '2026-01-05T10:00:00Z'),
  ('clay', 'Gres con Chamota Fina', 'CL-001', 'pellas', 12, 5, 'active', null, null, 'AlmacÇ¸n Fondo', '2025-11-01T10:00:00Z', '2026-01-08T10:00:00Z'),
  ('clay', 'Porcelana Limoges', 'CL-002', 'pellas', 2, 3, 'active', null, null, 'Nevera Pro', '2025-11-01T10:00:00Z', '2026-01-08T10:00:00Z'),
  ('engobe', 'Engobe Turquesa', 'EN-001', 'ml', 250, 500, 'active', null, null, null, '2025-11-15T10:00:00Z', '2026-01-05T10:00:00Z'),
  ('engobe', 'Engobe Negro CarbÇün', 'EN-002', 'ml', 700, 300, 'active', null, null, null, '2025-11-15T10:00:00Z', '2026-01-05T10:00:00Z'),
  ('raw_material', 'Carbonato de Cobalto', 'RM-001', 'g', 450, 100, 'active', null, null, 'Caja QuÇðmicos', '2025-09-01T10:00:00Z', '2025-12-01T10:00:00Z'),
  ('raw_material', 'Bentonita SÇüdica', 'RM-002', 'kg', 0, 2.5, 'active', null, null, 'AlmacÇ¸n Suelo', '2025-12-18T10:00:00Z', '2026-01-05T10:00:00Z');

-- Inventory movements
insert into inventory_movements (item_id, type, quantity, new_quantity, unit, reason, date, notes)
values
  ((select id from inventory_items where code = 'GL-001'), 'in', 5.0, null, 'l', 'ProducciÇün lote semanal', '2026-01-01', null),
  ((select id from inventory_items where code = 'CL-001'), 'out', 8, null, 'pellas', 'Consumo clases torno', '2026-01-07', null),
  ((select id from inventory_items where code = 'GL-004'), 'out', 1.5, null, 'l', 'Esmaltado mural grande', '2026-01-08', null),
  ((select id from inventory_items where code = 'RM-002'), 'adjust', null, 0, 'kg', 'Rotura de bolsa / Limpieza', '2026-01-09', null);
