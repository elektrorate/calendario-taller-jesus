# Resumen de Issues y Soluciones Pendientes

Este documento detalla los 3 problemas principales identificados en la plataforma, su causa raíz y los pasos exactos para solucionarlos de manera definitiva.

---

## 🛑 1. Bug del Botón "Salir" (Logout Interrumpido) - **¡CRÍTICO!**

**El Problema:**
Al hacer clic en "Salir" (tanto en la vista de Tallerista como de Admin o tras crear un colaborador), la pantalla se congela o te redirige de vuelta al "Resumen" (Dashboard). El usuario se ve obligado a presionar `F5` para recién poder ver la pantalla de Login y salir realmente de la sesión.

**Causa Raíz:**
El proceso de logout intentaba usar `navigate('/login')` de React Router mientras el componente aún estaba dentro del `ProtectedRoute`. Cuando el estado de autenticación de Supabase se limpia, el `ProtectedRoute` reacciona inmediatamente, interceptando la navegación y redirigiendo de vuelta o desmontando el componente antes de que la navegación hacia `/login` finalice.

**Solución Requerida (y ya aplicada):**
Se elimina el uso de `navigate()` para el logout. En su lugar, se fuerza una recarga completa del navegador usando `window.location.href = '/login'`. Esto destruye el estado de la aplicación React y garantiza un cierre de sesión limpio y absoluto.

**Archivos modificados:**

- `components/layout/TalleristaLayout.tsx`
- `admin/context/AppContext.tsx`

---

## 👥 2. Inconsistencia Visual de Roles (Permisos "super_admin")

**El Problema:**
La cuenta `jules@kokoroceramic.com` y la cuenta `tallertest1@gmail.com` tienen ambas el rol de `super_admin`, pero experimentan interfaces inconsistentes al ver o gestionar talleristas/staff en la sección de equipo. `jules` aparece asociada a una sede y puede ver opciones que `tallertest1` tal vez no, a pesar de tener el mismo rol superior.

**Causa Raíz:**
En la base de datos de Supabase, los permisos de visualización en el backend asumen que los `super_admin` ven todo, pero el frontend no está uniformizando las opciones de "Eliminar" de forma consistente para este rol. Además, hay super_admins que están vinculados a sedes (como `jules`), lo cual es un comportamiento mixto de Tallerista y Admin.

**Solución Requerida:**
En la vista **TeamManagement** del Admin, se unificará la lógica para que la interfaz garantice que absolutamente TODOS los usuarios con rol `super_admin` tengan el mismo poder visual y funcional sobre las cuentas inferiores (Editar y Eliminar), sin importar si están vinculados a una sede o no.

---

## 🗑️ 3. El Admin no puede Eliminar Talleristas ni Staff

**El Problema:**
Un Tallerista puede eliminar un miembro de su Staff en el Frontend mediante la ruta `/team`, pero el **Súper Administrador no puede eliminar a nadie** desde su panel principal en `/admin/team`. Literalmente falta esa opción o falla, por lo que no pueden gestionar la limpieza completa de la plataforma.

**Causa Raíz:**

1. La **Edge Function** `manage-staff` en Supabase restringe explícitamente la acción de hacer `"delete"` validando que quien ejecuta la acción sea `isTallerista`. Lanza un error si un `super_admin` lo intenta.
2. El componente **Frontend** (`TeamManagement.tsx`) no tiene el código (botón "ELIMINAR" ni la lógica del Modal destructivo) que sí existe en la vista normal de los talleristas.

**Solución Requerida (Siguiente paso):**

1. **En Backend (`manage-staff`):** Modificar la función Edge para permitir explícitamente y de manera prioritaria que `isSuperAdmin` pueda ejecutar la acción `"delete"` pasándose la validación de la Sede.
2. **En Frontend (`TeamManagement.tsx`):** Añadir el botón rojo de "ELIMINAR" y su lógica respectiva con confirmación modal para los super_admins.

---

**Estado Actual:**

- Issue 1 (Logout): **Solucionado en código local.**
- Issue 2 & 3: **En proceso de implementación.**

---

## 🚀 Despliegue Final (Vercel)

Una vez aplicados y probados los parches mencionados arriba, el paso final y obligatorio es reflejar estos cambios en producción para que queden disponibles para todos los usuarios.

El despliegue se debe hacer **usando la CLI de Vercel** desde la raíz del proyecto (`calendario-taller-jesus`), tal como se verificó y configuró exitosamente con las variables de entorno de Supabase.

**Comandos a ejecutar en la terminal:**

```bash
# 1. Construir la aplicación localmente (Asegura que no haya errores de empaquetado)
npm run build

# 2. Desplegar directamente a producción
npx vercel --prod
```

*Asegúrate de ejecutar estos comandos estando ubicado en el directorio `/media/chatt/Nuevo vol1/Arcillosos-2/calendario-taller-jesus`.*
