---
name: revisar
description: Usar cuando se acaba de implementar o arreglar algo en la app web y hay que verificarlo en el navegador con Playwright antes de darlo por terminado.
---

# Revisar

Build verde no prueba que la pantalla ande. Cargar las herramientas con `ToolSearch` (`select:mcp__plugin_playwright_playwright__browser_navigate,...`).

1. Levantar `npm run dev` si no corre.
2. `browser_navigate` a la ruta cambiada → `browser_snapshot`.
3. Probar el cambio: camino feliz + un caso borde (`browser_click`, `browser_type`, `browser_fill_form`).
4. Mirar `browser_console_messages` y `browser_network_requests` (errores, 4xx/5xx).
5. `browser_take_screenshot`, también en móvil (`browser_resize` 390×844) si es visual. `browser_close`.

Reporte: **Revisado** / **Resultado** OK|FALLA / **Evidencia** / **Pendiente**.
Si no se pudo probar, es "no revisado", nunca OK.
