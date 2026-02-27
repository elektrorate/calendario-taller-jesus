# Resumen del proyecto

Este proyecto es un dashboard de gestion para un taller de ceramica, hecho con React + TypeScript y ejecutado con Vite. La interfaz usa Tailwind via CDN y un set de colores/tipografias definido en `index.html`. No hay backend: los datos viven en el estado de React y se inicializan desde `constants.ts`.

## Ejecucion local

- Dependencias: Node.js.
- Comando principal: `npm run dev` (levanta Vite en `http://localhost:3000`).
- En PowerShell con politica de ejecucion restrictiva, usar `npm.cmd run dev` o `cmd /c npm run dev`.

## Arquitectura y flujo de datos

- Entrada: `index.html` carga Tailwind y fuentes; `index.tsx` monta `App`.
- Estado global: `App.tsx` mantiene el estado de alumnos, sesiones, piezas, bonos y stock.
- Datos semilla: `constants.ts` define listas iniciales (alumnos, sesiones, piezas, giftcards, inventario).
- Tipos: `types.ts` define modelos y enums para cada modulo.
- Sin persistencia: los cambios se mantienen en memoria; al recargar se vuelve a los datos iniciales.
- Sin autenticacion real: `Login.tsx` simula login con un delay.

## Vistas principales

- Dashboard (`DashboardView.tsx`): resumen del dia (ocupacion, alumnos, sesiones), alertas por bonos bajos o expirados y control rapido de asistencia.
- Calendario (`CalendarView.tsx`): vista diaria con timeline y vista mensual, alta/edicion de sesiones y modal de asistencia.
- Alumnos (`StudentList.tsx`): CRM de alumnos con tabs (todos/activos/pendientes), alta/edicion, bonos y sesiones asignadas. Calcula estado segun bonos, expiracion y pago.
- Piezas (`PiecesToCollect.tsx`): tracking de piezas por estado (1era quema -> esmaltado -> a recogida -> entregado) con progreso y notas.
- Bonos regalo (`GiftCardView.tsx`): alta/edicion de giftcards con cantidad de clases y cita opcional.
- Historial (`HistoryView.tsx`): por alumno, muestra sesiones y piezas asociadas.
- Inventario (`InventoryView.tsx`): dashboard de stock con alertas (ok/low/critical) y listado por categoria; usa movimientos para estadisticas.
- Ajustes (`SettingsView.tsx`): UI simulada para backup/manual y conexion GitHub.

## Stack y configuracion

- Vite + React 19 + TypeScript (ver `package.json`).
- Tailwind via CDN (config en `index.html`).
- Vite expone `GEMINI_API_KEY` en `vite.config.ts` (no se usa en el UI actual).

## Tipografia y colores

- Tipografia: Manrope (Google Fonts) como `font-family` base.
- Paleta principal (Tailwind extend):
  - brand: `#CA7859` (hover `#B56C50`, pressed `#A16047`, light `#D28E71`).
  - neutral: base `#F3EDE6`, alt `#F0E8E0`, surface `#FFFFFF`, sec `#F7F1EB`, border `#DDD5CD`,
    textMain `#3D3437`, textSec `#6F6A6D`, textHelper `#A8A9AE`, customGray `#727375`.
