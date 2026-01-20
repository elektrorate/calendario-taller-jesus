# Funcionalidad detallada por categoria

Este documento ordena la funcionalidad por categoria y describe con detalle
que hace cada parte y como se relaciona con el resto del sistema.

## Categoria: Acceso y navegacion

### Login
- Objetivo: permitir entrar a la aplicacion de forma simulada.
- Que hace:
  - Muestra un formulario con usuario/email y contrasena.
  - Al enviar, muestra estado de carga durante un breve tiempo.
  - Tras el delay, habilita el acceso al dashboard.
- Que no hace:
  - No valida credenciales ni persiste sesion.
- Relacion con otras secciones:
  - Controla si se renderiza la aplicacion completa o la pantalla de login.

### Navegacion general
- Objetivo: cambiar de vista sin rutas URL.
- Que hace:
  - Sidebar en desktop y menu lateral en mobile.
  - Cambia la vista activa segun `AppView`.
  - Cerrar sesion vuelve al login.
- Relacion con otras secciones:
  - Solo cambia la vista; no altera datos.

## Categoria: Estado global y reglas transversales

### Estado global
- Objetivo: centralizar datos de alumnos, sesiones, piezas, bonos e inventario.
- Que hace:
  - Carga datos iniciales desde `constants.ts`.
  - Mantiene el estado en memoria (sin backend).
- Relacion con otras secciones:
  - Todas las vistas leen y escriben en este estado.

### Sincronizacion alumnos -> sesiones
- Objetivo: reflejar automaticamente sesiones asignadas desde alumnos.
- Que hace:
  - Al crear/editar/eliminar alumnos, recalcula sesiones basadas en
    `assignedClasses`.
  - Conserva sesiones creadas manualmente.
  - Genera ids con prefijo `auto-` para sesiones auto.
- Relacion con otras secciones:
  - Impacta Calendario, Dashboard e Historial.

### Asistencia
- Objetivo: registrar presencia/ausencia por alumno.
- Que hace:
  - Guarda el estado en `sessions.attendance` usando el nombre del alumno.
  - Permite alternar presente/ausente y volver a pendiente.
- Relacion con otras secciones:
  - Se ve en Calendario, Dashboard e Historial.

### Movimientos de inventario
- Objetivo: ajustar stock cuando hay entradas, salidas o ajustes.
- Que hace:
  - Aumenta, disminuye o fija la cantidad segun el tipo de movimiento.
- Relacion con otras secciones:
  - Afecta el estado del inventario y sus alertas.

## Categoria: Operacion diaria

### Dashboard (Inicio)
- Objetivo: dar un resumen operativo del dia.
- Que hace:
  - Calcula ocupacion de torno y mesas segun sesiones de hoy.
  - Muestra total de alumnos y sesiones del dia.
  - Lista la agenda diaria con capacidad estimada por tipo de sesion.
  - Genera alertas por bonos bajos o expirados para alumnos de hoy.
  - Permite marcar asistencia rapida por alumno.
- Relacion con otras secciones:
  - Lee datos de Calendario y Alumnos.
  - Escribe asistencia que se refleja en Calendario e Historial.

### Calendario
- Objetivo: planificar sesiones y registrar asistencia.
- Que hace:
  - Vista dia con timeline; posiciona sesiones por hora.
  - Vista mes para elegir fecha y volver a la vista dia.
  - Crear, editar y eliminar sesiones.
  - Asignar alumnos a sesiones y tipo (mesa/torno).
  - Control de asistencia en modal dedicado.
  - Valida que la hora de inicio sea anterior a la de fin.
- Relacion con otras secciones:
  - Alimenta Dashboard (agenda) e Historial (asistencia).
  - Usa lista de alumnos del CRM.

## Categoria: Gestion de alumnos

### Alumnos (CRM)
- Objetivo: administrar alumnos y su estado de bonos.
- Que hace:
  - Listado con filtros: todos, al dia, pendientes.
  - Alta y edicion de ficha con datos personales.
  - Gestion de clases restantes y fecha de expiracion.
  - Estado calculado: pendiente si clases 0, bono expirado o pago pendiente.
  - Registro de sesiones asignadas con estado de asistencia.
  - Eliminacion definitiva de alumno.
- Relacion con otras secciones:
  - Genera sesiones auto para Calendario.
  - Aporta datos para alertas del Dashboard.
  - Define propietarios en Piezas.

### Historial
- Objetivo: ver el historial completo por alumno.
- Que hace:
  - Seleccion de alumno desde una lista lateral.
  - Muestra todas las sesiones del alumno con estado de asistencia.
  - Muestra todas las piezas del alumno y su estado.
- Relacion con otras secciones:
  - Depende de datos creados en Alumnos, Calendario y Piezas.

## Categoria: Produccion

### Piezas
- Objetivo: seguimiento de piezas en el taller.
- Que hace:
  - Alta y edicion de piezas asociadas a un alumno.
  - Flujo de estados: 1a quema -> esmaltado -> a recogida -> entregado.
  - Accion directa para avanzar de estado.
  - Filtro por estado y progreso visual.
  - Notas y tipo de esmalte.
- Relacion con otras secciones:
  - Se visualiza en el Historial del alumno.

## Categoria: Comercial

### Bonos regalo
- Objetivo: gestionar tarjetas regalo de clases.
- Que hace:
  - Crear, editar y eliminar tarjetas regalo.
  - Definir comprador, destinatario, numero de clases y tipo.
  - Asignar cita opcional y comentarios adicionales.
- Relacion con otras secciones:
  - Modulo independiente; no afecta otras vistas.

## Categoria: Recursos del taller

### Inventario
- Objetivo: controlar materiales y stock.
- Que hace:
  - Dashboard con conteos de items activos, stock bajo y critico.
  - Filtros por categoria y salud de stock (ok/low/critical).
  - Busqueda por nombre o codigo.
  - Alertas prioritarias con acceso rapido a detalle.
  - Estadisticas por rango temporal de movimientos.
- Relacion con otras secciones:
  - Modulo independiente; no afecta otras vistas.

## Categoria: Administracion

### Ajustes
- Objetivo: acciones administrativas simuladas.
- Que hace:
  - Simula conexion con GitHub (estado local con delay).
  - Muestra botones de descarga manual (sin logica real).
- Relacion con otras secciones:
  - No impacta otros modulos.

## Limitaciones actuales
- Sin persistencia ni backend.
- Sin autenticacion real.
- Sin rutas URL ni deep links.
- La relacion alumno-sesion depende del nombre y puede desincronizarse.
