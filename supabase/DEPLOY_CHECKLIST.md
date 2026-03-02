# Edge Functions — Checklist de Deploy

## Regla de Oro
Si la funcion tiene `getUser()` o `getSession()` internamente -> deploy con `verify_jwt: false`  
Si la funcion NO valida auth internamente -> deploy con `verify_jwt: true`

## Estado actual de funciones (mantener actualizado)

| Funcion            | verify_jwt | Auth interna | Estado |
|--------------------|------------|--------------|--------|
| manage-staff       | false      | Si (getUser) | OK     |
| create-user        | false      | Si (getUser) | OK     |
| delete-user        | false      | Si (getUser) | OK     |
| create-new-student | true       | VERIFICAR    | WARN   |
| admin-create-user  | true       | VERIFICAR    | WARN   |
| admin-users        | true       | VERIFICAR    | WARN   |
| admin-tenants      | true       | VERIFICAR    | WARN   |

## Antes de cada deploy
1. Verificar que el codigo tiene validacion auth interna.
2. Elegir `verify_jwt` segun la regla de oro.
3. Probar al menos: login -> accion -> verificar que no da 401.
4. Revisar logs de Supabase Edge Function post-deploy.

## Comando de deploy seguro (ejemplo)
`supabase functions deploy manage-staff --no-verify-jwt`

## Auditoria 2026-02-28
- `admin-create-user`, `admin-users` y `admin-tenants` no tienen referencias en el frontend actual.
- Las tres funciones anteriores validan JWT manualmente (decode + lookup admin), por lo que `verify_jwt: true` es coherente.
- `create-new-student` tampoco tiene referencias en el frontend actual, pero SI usa `supabaseClient.auth.getUser()` internamente.
- Si `create-new-student` vuelve a usarse desde UI, migrar a `verify_jwt: false` para evitar rechazos 401 tempranos en gateway.
