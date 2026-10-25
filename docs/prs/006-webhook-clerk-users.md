# 006 — webhook-clerk-users

- Spec: n.a. (BUILD)
- Rama: `006-webhook-clerk-users`

## Qué se hizo
Webhook de Clerk en `/api/webhooks/clerk`: verifica la firma, hace upsert de `users` en `user.created` y `user.updated` (con el rol de `publicMetadata.role`) y borra la fila en `user.deleted`.

## Cambios
- `app/api/webhooks/clerk/route.ts` — verifica la firma con `verifyWebhook`; 400 si es inválida, 500 si falla el proceso.
- `modules/users/services/clerk-sync-service.ts` — `handleClerkEvent()`: upsert por `clerk_id` y delete duro.
- `modules/users/utils/map-clerk-user.ts` — payload de Clerk → fila de `users`.
- `modules/users/index.ts` — API pública del módulo.
- `modules/users/utils/map-clerk-user.test.ts`, `modules/users/services/clerk-sync-service.test.ts` — 11 tests.
- `changelog/006-webhook-clerk-users.md`, `docs/prs/006-webhook-clerk-users.md`

## Decisiones
- Sin `svix` nuevo: `verifyWebhook` de `@clerk/nextjs/webhooks` lee `CLERK_WEBHOOK_SIGNING_SECRET`.
- Idempotencia por upsert en `clerk_id`; sin tabla de eventos. Un `user.updated` antes de `user.created` también funciona.
- `user.deleted` es delete duro. Si el usuario tiene reservas o es operador, Postgres lo bloquea (`RESTRICT`, código `23001`; también `23503`): se registra en el log, se responde 200 y no se borra.
- Sin correo principal el evento se ignora con log (`users.email` es obligatorio). Un correo repetido de otro `clerk_id` falla con 500 y queda en el log.
- Un Clerk sin teléfono no pisa el teléfono ya guardado. `country` no viene de Clerk y no se toca.
- Rol: `roleFromClaims()` sobre `public_metadata`; ausente o inválido = `customer`.
- `notification_preferences` no se crea acá: la crea `/cuenta` (018) al guardar.

## Criterios de aceptación
- [x] `user.created` inserta con rol `customer` por defecto (test)
- [x] Repetir el mismo evento no duplica ni lanza (test)
- [x] `user.updated` sin `user.created` previo hace upsert y actualiza el rol (test)
- [x] `user.deleted` borra la fila; repetirlo o borrar uno inexistente no lanza (test)
- [x] `user.deleted` con operador asociado no borra y no lanza (test)
- [x] Sin correo principal se ignora sin insertar (test)
- [x] Firma inválida responde 400 y no escribe (HTTP contra `next dev`)
- [x] Evento firmado: created, created repetido, updated con `organizer` y deleted (HTTP contra `next dev`)
- [ ] Envío real desde Clerk (falta túnel público)

## Cómo probar
1. `npm run dev -- -p 3006` y un túnel público hacia ese puerto.
2. Clerk Dashboard → Webhooks: endpoint `<url pública>/api/webhooks/clerk` con `user.created`, `user.updated`, `user.deleted`; copiar el Signing Secret a `CLERK_WEBHOOK_SIGNING_SECRET`.
3. Crear, editar (poner `publicMetadata.role`) y borrar un usuario de prueba en Clerk; ver la fila en `users`.
4. Tests con base: `node --env-file=.env.local ./node_modules/vitest/vitest.mjs run modules/users`.

## Notas
- Con el claim `metadata` del token configurado (005), el rol de `users.role` y el del token salen de la misma fuente.
- Los tests con base escriben en la base de `DATABASE_URL` y limpian sus filas.

## Revisión
- Reviewer: n.a. (BUILD)
- lint ✓ · tsc ✓ · tests ✓ (203) · Playwright: n.a. (sin pantalla; ruta probada por HTTP firmado)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
