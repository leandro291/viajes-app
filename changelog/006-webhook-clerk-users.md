# 006 — webhook-clerk-users

- Fecha: 2026-10-25
- Spec: n.a. (BUILD, sin contratos nuevos de datos)
- PR: `docs/prs/006-webhook-clerk-users.md`

## Resumen
Webhook de Clerk en `/api/webhooks/clerk` con firma verificada. `user.created` y `user.updated` hacen upsert en `users` (con el rol de `publicMetadata.role`; sin rol = `customer`) y `user.deleted` borra la fila. Idempotente: el upsert va por `clerk_id`.

## Cambios
- `app/api/webhooks/clerk/route.ts` — verifica la firma con `verifyWebhook` (400 si es inválida, 500 si falla el proceso para que Clerk reintente).
- `modules/users/services/clerk-sync-service.ts` — `handleClerkEvent()`: upsert por `clerk_id` y delete duro.
- `modules/users/utils/map-clerk-user.ts` — payload de Clerk → fila de `users` (correo y teléfono principales, rol).
- `modules/users/index.ts` — API pública del módulo.
- `modules/users/utils/map-clerk-user.test.ts` — 4 tests (sin base de datos).
- `modules/users/services/clerk-sync-service.test.ts` — 7 tests contra la base (se saltan sin `DATABASE_URL`).

## Pendiente
- Clerk Dashboard → Webhooks: apuntar a `<url pública>/api/webhooks/clerk` y suscribir `user.created`, `user.updated`, `user.deleted`. Repetirlo en producción.
- Sin probar con un envío real de Clerk (hace falta un túnel público); probado con payloads firmados con el secret.
- `notification_preferences` no se crea acá: lo hace `/cuenta` (018) al guardar.
