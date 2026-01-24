# Funcionalidad detallada de la app (Taller Ceramica Dashboard)

Este documento describe la funcionalidad real implementada en el front-end.
No hay backend ni persistencia: todo vive en memoria durante la sesion.

## 1) Arquitectura general

### 1.1 Aplicacion y layout
- La app es un SPA en React (Vite) con vistas internas controladas por estado.
- No existen rutas URL ni deep links.
- El layout principal incluye:
  - Sidebar en desktop (navegacion fija).
  - Drawer en mobile (menu lateral).
  - Header superior con titulo dinamico y boton de menu.

### 1.2 Estado global (App.tsx)
El estado global vive en `App.tsx` y contiene:
- `students`: alumnos.
- `sessions`: sesiones/agenda.
- `pieces`: piezas del taller.
- `giftCards`: bonos regalo.
- `inventoryItems`: items de inventario.
- `inventoryMovements`: movimientos de inventario.
- `teachers`: profesores.
- `currentView`: vista actual (AppView).
- `isLoggedIn`: controla pantalla de login.
- `selectedStudentId`: para abrir ficha desde alertas.

Todos los datos iniciales provienen de `constants.ts`.

### 1.3 Modelo de datos (types.ts)
- Alumno (`Student`): datos personales, clases restantes, estado, tipo de clase y clases asignadas.
- Sesion (`ClassSession`): fecha, hora, tipo, alumnos, profesor, asistencia, motivos especiales.
- Profesor (`Teacher`): datos y especialidad.
- Pieza (`CeramicPiece`): estado del proceso y metadatos.
- Bono regalo (`GiftCard`): comprador, destinatario, clases y cita.
- Inventario (`InventoryItem`, `InventoryMovement`): stock, categorias y movimientos.

### 1.4 Reglas transversales
- Las sesiones pueden ser manuales o automaticas (prefijo `auto-`).
- La asistencia se almacena como map de nombre -> status en `sessions.attendance`.
- El matching alumno/sesion se hace por nombre en mayusculas (no por id).


## 2) Acceso y navegacion

### 2.1 Login (components/Login.tsx)
- Formulario con email/usuario y contrasena.
- Simulacion de login con spinner y delay (~800ms).
- No valida credenciales ni persiste sesion.

### 2.2 Navegacion (Sidebar + Drawer)
- Sidebar en desktop (components/Sidebar.tsx).
- Drawer lateral en mobile (App.tsx, menuConfig).
- Al cambiar vista, se actualiza `currentView`.
- Cerrar sesion vuelve a Login.


## 3) Dashboard (components/DashboardView.tsx)

### 3.1 Objetivo
Mostrar el estado operativo del dia, agenda y alertas.

### 3.2 Calculos principales
- Fecha actual (`todayStr`): filtra sesiones del dia.
- Capacidad estimada:
  - Torno: 5 plazas.
  - Mesa: 8 plazas.
- Ocupacion global y por tipo.
- Total alumnos del dia (conjunto unico).

### 3.3 Alertas
- Genera alertas para alumnos del dia si:
  - `classesRemaining <= 1`.
  - `expiryDate` vencida.
- Boton "Ver Ficha" abre el alumno en la vista de alumnos.

### 3.4 Control de asistencia rapido
- Lista "Control de alumnos" con buscador.
- Permite marcar presente/ausente por alumno en las sesiones de hoy.


## 4) Calendario / Gestion de agenda (components/CalendarView.tsx)

### 4.1 Vistas
- Vista dia: timeline con sesiones posicionadas por hora.
- Vista mes: grilla mensual, al seleccionar dia vuelve a vista dia.

### 4.2 Creacion y edicion de sesiones
- Modal de sesion (alta/edicion).
- Campos principales:
  - fecha, hora inicio/fin, tipo de clase.
  - alumnos asignados.
  - profesor (segun tipo).
  - workshopName / privateReason si aplica.
- Validaciones:
  - fecha obligatoria.
  - inicio < fin.
  - duplicado por fecha+hora+tipo.
  - requisitos segun tipo (profesor, motivo, workshop).

### 4.3 Tipos de sesion
- Mesa, Torno, Coworking, Workshop, Privada, Feriado.
- Badge de color por tipo.

### 4.4 Control de asistencia
- Modal exclusivo de asistencia.
- Permite:
  - marcar presente/ausente/pending.
  - guardar `completedAt` al finalizar.
  - asignar profesor sustituto.

### 4.5 Distribucion de sesiones
- Las sesiones se posicionan segun hora (topOffset).
- Si hay sesiones concurrentes, se divide ancho.
- El horario visible se ajusta dinamicamente al rango de sesiones del dia.


## 5) Alumnos / CRM (components/StudentList.tsx)

### 5.1 Listado
- Tabs: todos / al dia / pendientes.
- Buscador por nombre con sugerencias.
- Cards con estado de bono y barra de progreso.

### 5.2 Alta y edicion de alumno
- Modal con datos personales y configuracion de bonos.
- Campos principales:
  - nombre, apellidos, contacto.
  - clases restantes, tipo de clase, precio, estado de pago.
  - fecha de expiracion.
  - observaciones internas.

### 5.3 Gestion de sesiones asignadas
- Se pueden agregar sesiones a un alumno (fecha + hora).
- Genera `assignedClasses` dentro del alumno.
- Permite marcar asistencia desde la ficha.

### 5.4 Estado calculado
- `needs_renewal` si:
  - clases restantes <= 0, o
  - bono vencido, o
  - pago pendiente.

### 5.5 Eliminacion
- Elimina alumno y su historial local.


## 6) Sincronizacion alumnos -> sesiones (App.tsx)

- Cada alta/edicion/baja de alumno recalcula sesiones automaticas.
- Reglas:
  - Mantiene sesiones manuales (id no `auto-`).
  - Genera sesiones `auto-` por cada clase asignada.
  - Copia asistencia a sesiones cuando existe status en assignedClasses.
  - Convierte el nombre del alumno a MAYUSCULAS para matching.


## 7) Profesores (components/TeachersView.tsx)

- CRUD completo de profesores.
- Busqueda por nombre/especialidad.
- Muestra contador de clases concluidas (sessions con `completedAt`).
- Lista las ultimas sesiones concluidas del profesor.
- Al eliminar profesor, se limpia la referencia en sesiones.


## 8) Piezas (components/PiecesToCollect.tsx)

### 8.1 Estados del flujo
1. 1era_quema
2. esmaltado
3. a_recogida
4. entregado

### 8.2 Acciones
- Crear/editar piezas.
- Avanzar estado con boton directo.
- Filtro por estado.
- Progreso visual y color por estado.

### 8.3 Datos clave
- Propietario (alumno).
- Descripcion y esmalte.
- Comentarios extendidos.


## 9) Bonos regalo (components/GiftCardView.tsx)

- CRUD de tarjetas regalo.
- Datos: comprador, destinatario, numero de clases, tipo (modelado/torno).
- Cita opcional (`scheduledDate`).
- Comentarios adicionales.
- Formatea fechas para display.


## 10) Historial (components/HistoryView.tsx)

- Seleccion de alumno en sidebar.
- Muestra:
  - sesiones del alumno con asistencia.
  - piezas del alumno con estado.
- Matching por nombre (full name o solo nombre en mayusculas).


## 11) Inventario (components/InventoryView.tsx)

### 11.1 Subvistas
- Dashboard: KPIs de stock y movimientos.
- List: listado filtrable.
- Detail: ficha del item y movimientos recientes.
- Form: alta/edicion de item.

### 11.2 Dashboard
- Calcula items activos, low, critical.
- Filtro por salud del stock.
- Rangos de tiempo para movimientos (7/30/90 dias).

### 11.3 Listado
- Filtro por categoria.
- Busqueda por nombre/codigo.
- Indicadores visuales de salud (ok/low/critical).

### 11.4 Detalle de item
- Datos del item, stock actual, minimo, proveedor.
- Receta (glaze/engobe) si aplica.
- Botones: editar item, registrar movimiento.

### 11.5 Movimientos
- Tipos:
  - in: suma cantidad.
  - out: resta cantidad.
  - adjust: fija cantidad absoluta.
- Validaciones basicas en formulario.

### 11.6 Formulario de item
- Valida nombre y codigo unico.
- Permite receta con unidad % o gramos.
- Guarda `formula` solo para glaze/engobe.


## 12) Ajustes (components/SettingsView.tsx)

- Simula conexion con GitHub (estado local + delay).
- Botones de "descarga" sin logica real.
- No afecta otros modulos.


## 13) Limitaciones actuales
- Sin backend ni persistencia.
- Sin autenticacion real.
- Matching por nombres (no IDs) puede generar inconsistencias.
- Horarios y fechas en formato local, sin zona horaria.
- Sin control de permisos o roles.


## 14) Referencias de codigo
- Estado global y router interno: `App.tsx`.
- Tipos de datos: `types.ts`.
- Datos iniciales: `constants.ts`.
- Vistas: `components/*.tsx`.
