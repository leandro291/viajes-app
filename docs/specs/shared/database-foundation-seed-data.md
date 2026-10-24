# Database foundation: datos del seed (anexo)

Anexo de [database-foundation.md](database-foundation.md). Es la **fuente de datos** de las tareas del seed: el artefacto de diseño no vive en el repo, así que todo lo necesario está acá. Precios del artefacto en soles (`S/ 1 290` → `129000` céntimos). Texto en español tal cual el artefacto.

## 0. Convenciones

- **Ancla fija:** `SEED_ANCHOR = 2026-10-24` (sábado, "hoy" del panel admin del artefacto), zona `America/Lima` (UTC-5, sin DST). Todas las fechas del seed son absolutas y salen de esta tabla; nada usa `new Date()`. Helper `limaDate("2026-11-05", "07:30")` → `Date` (`2026-11-05T12:30:00.000Z`).
- **Ids:** `seedId("<tabla>:<clave natural>")` (uuid v5 determinista). Claves: `user:<clerk_id>`, `organizer:wayra`, `destination:<slug>`, `category:<slug>`, `package:<slug>`, `guide:<slug>`, `departure:<package-slug>:<YYYY-MM-DDTHH:mm>`, `offer:<package-slug>`, `booking:<code>`, `traveler:<code>:<n>`, `payment:<code>`, etc. Tablas con pk compuesta (`destination_climate_months`, `package_categories`, `notification_preferences`) no llevan `id`.
- **Imágenes:** toda columna `*_url` guarda la ruta pública `/seed/<key>.jpg` (Next la sirve desde `public/seed/`, que **ya existe en el repo con las 18 fotos del artefacto; ninguna tarea las crea, mueve ni edita**). La ruta sale de un único mapa `SEED_IMAGES` (`lib/db/seed/images.ts`) clave → `{ path, credit }`; para pasar a Vercel Blob se cambia solo ese mapa. El seed no sube archivos. Claves, qué muestran y crédito (pie del artefacto):

| key | foto | credit |
| --- | ---- | ------ |
| mp | Machu Picchu, panorámica | Diego Delso, CC BY-SA 4.0 |
| mp2 | Terrazas de Machu Picchu y Huayna Picchu | Diego Delso, CC BY-SA 4.0 |
| vin | Vinicunca / Montaña de Colores | Yifan Wang, CC BY 2.0 |
| hua | Huacachina | Diego Delso, CC BY-SA 4.0 |
| tam | Tambopata | Bhasker Thodla, CC BY 3.0 |
| l69 | Laguna 69 | Renata Maria Cristina, CC BY-SA 4.0 |
| uro | Islas Uros / Titicaca | Diego Delso, CC BY-SA 4.0 |
| cus | Plaza de Armas / Cusco | Diego Delso, CC BY-SA 4.0 |
| col | Cañón del Colca | Thomas Fuhrmann, CC BY-SA 4.0 |
| lim | Lima | César Torales, CC BY-SA 4.0 |
| bal | Islas Ballestas | Pierre André Leclercq, CC BY-SA 4.0 |
| are | Arequipa | Diego Delso, CC BY-SA 4.0 |
| man | Máncora | Charles Gadbois, CC BY 3.0 |
| par | Paracas | Diego Delso, CC BY-SA 4.0 |
| sac | Sacsayhuamán | Diego Delso, CC BY-SA 4.0 |
| pis | Pisac, Valle Sagrado | Diego Delso, CC BY-SA 4.0 |
| tren | Tren sobre el Urubamba | Sashimi-b, CC BY-SA 4.0 |
| agc | Calle de Aguas Calientes | Diego Delso, CC BY-SA 4.0 |

  El mapeo foto↔paquete/destino/lugar/día es el del artefacto (columnas `img` de las tablas de abajo). `par` está en el artefacto pero ningún dato la usa: queda en el mapa sin referenciar. Las fotos son CC con atribución: la UI futura debe mostrar `credit`.
- **Moneda:** `PEN` en catálogo y reservas; pagos en `USD` con `SEED_PEN_PER_USD = 3.75` (constante; no se lee de `PEN_PER_USD`).
- **Idiomas:** `languages = ['es']`, salvo Machu Picchu Mágico `['es','en']`.
- Todo dato personal es ficticio y evidente (`seed_*`, documentos `9000000N` / `SEEDPP0N`, RUC y teléfonos inventados).

## 1. Usuarios (11)

`clerk_id` ficticio: no existen en Clerk, esos usuarios no pueden iniciar sesión. Cuando se integre Clerk, la spec de auth decide cómo vincularlos o reemplazarlos.

| clerk_id | Rol | Nombre | Email | Teléfono | País |
| -------- | --- | ------ | ----- | -------- | ---- |
| `seed_super_admin` | super_admin | Super Admin | superadmin@wayra.pe | +51 900 000 001 | Perú |
| `seed_admin` | admin | Rosa Huamán | admin@wayra.pe | +51 999 111 222 | Perú |
| `seed_organizer` | organizer | Operador Wayra | operador@wayra.pe | +51 900 000 002 | Perú |
| `seed_customer_01` | customer | María Quispe | maria.q@correo.com | +51 987 654 321 | Perú |
| `seed_customer_02` | customer | Lucía Fernández | lucia.f@correo.com | +54 9 11 5555 0101 | Argentina |
| `seed_customer_03` | customer | Diego Salazar | dsalazar@correo.com | +51 945 112 233 | Perú |
| `seed_customer_04` | customer | Valeria Rojas | vrojas@correo.com | +56 9 8765 4321 | Chile |
| `seed_customer_05` | customer | Ana Torres | ana.torres@correo.com | +51 912 345 678 | Perú |
| `seed_customer_06` | customer | Andrés Castillo | acastillo@correo.com | +57 300 123 4567 | Colombia |
| `seed_customer_07` | customer | Carlos Mendoza | cmendoza@correo.com | +51 956 789 012 | Perú |
| `seed_customer_08` | customer | Jorge Ramírez | jramirez@correo.com | +52 55 1234 5678 | México |

**Operador (1):** `business_name` "Wayra Perú S.A.C.", `ruc` `20000000001` (ficticio), `whatsapp` `+51 900 000 003`, `status = active`, `user_id` = `seed_organizer`. Todos los paquetes pertenecen a este operador.

**notification_preferences (9):** usuarios `seed_super_admin`, `seed_admin`, `seed_organizer` × `new_booking = true`, `cancellations = true`, `weekly_summary = false` (valores del panel del artefacto).

**Guías (4)** del operador, `phone` ficticio `+51 900 000 01N`: Wilber C., Rocío M., Iván P., Kiara S. (slugs de clave: `wilber-c`, `rocio-m`, `ivan-p`, `kiara-s`).

**Suscriptores (4):** `lector1@example.com`, `lector2@example.com`, `lector3@example.com` (`subscribed_at` 2026-10-01, 2026-10-08, 2026-10-15 a las 12:00 Lima) y `baja@example.com` (suscrito 2026-09-20, `unsubscribed_at` 2026-10-10).

## 2. Categorías (5)

`aventura` Aventura, `cultura` Cultura, `naturaleza` Naturaleza, `gastronomia` Gastronomía, `playas` Playas. ("Un día" no es categoría.)

## 3. Destinos (8)

Cada uno con `hero_image_url = SEED_IMAGES[<img>].path`. Solo Cusco tiene el detalle completo en el artefacto; el resto lleva únicamente `slug`, `name`, `region` y `hero_image_url` (las demás columnas son nullable y quedan `null`).

| slug | name | region | img |
| ---- | ---- | ------ | --- |
| `cusco` | Cusco | Cusco | mp2 |
| `arequipa` | Arequipa | Arequipa | are |
| `puno` | Puno | Puno | uro |
| `amazonia` | Amazonía | Madre de Dios | tam |
| `ica-paracas` | Ica y Paracas | Ica | hua |
| `huaraz` | Huaraz | Áncash | l69 |
| `lima` | Lima | Lima | lim |
| `mancora` | Máncora | Piura | man |

### Cusco (completo)

- `tagline`: "Antigua capital del Imperio inca"
- `description`: "Antigua capital del Imperio inca y puerta de entrada a Machu Picchu. Piedra, mercados y montañas a cada paso."
- `altitude_m`: 3399 · `best_season_text`: "Mayo a septiembre" · `from_lima_text`: "~1 h 30 en avión"
- **Clima (12):** 1 `rainy`, 2 `rainy`, 3 `rainy`, 4 `mixed`, 5 a 9 `dry`, 10 `mixed`, 11 `rainy`, 12 `rainy`.
- **Lugares (5, `sort_order` 1..5; `image_url` = ruta de `SEED_IMAGES[key]`):**
  1. Machu Picchu (mp) — "La ciudadela inca más famosa del mundo, entre nubes y montañas."
  2. Valle Sagrado (pis) — "Terrazas de Pisac, mercados y ruinas que siguen vivas."
  3. Sacsayhuamán (sac) — "Muros colosales de piedra sobre la ciudad, a minutos del centro."
  4. Vinicunca (vin) — "La montaña de colores, una caminata de altura para madrugadores."
  5. Aguas Calientes (agc) — "El pueblo a los pies de Machu Picchu, donde llega el tren."
- **FAQ (3, `sort_order` 1..3):**
  1. ¿Cuántos días necesito en Cusco? — "Lo ideal son 4 o 5 días: uno para aclimatarte, uno para la ciudad, uno para el Valle Sagrado y uno para Machu Picchu."
  2. ¿La entrada a Machu Picchu está incluida? — "Sí, en los paquetes que la indican. Reservamos tu horario de ingreso al confirmar la compra."
  3. ¿Puedo cambiar la fecha después de reservar? — "Sí, desde Mis reservas, hasta 48 horas antes de la salida y sujeto a disponibilidad."

## 4. Paquetes y tours (20)

12 del catálogo del artefacto (Inicio/Paquetes) + 10 tours de "Tours de un día". **Dos se repiten** (Montaña de Colores, Islas Ballestas) y se siembran una sola vez como `day_tour`: 12 + 10 − 2 = 20 filas, 10 `package` + 10 `day_tour`.

Columnas fijas para todos: `organizer_id` = Wayra, `currency = PEN`, `status = published` (los 20 paquetes; decisión del usuario también para Laguna 69 y Huaraz, aunque el panel admin del artefacto la muestre sin publicar), `description = blurb` (excepto Machu Picchu Mágico, §5), `cover_image_url = SEED_IMAGES[img].path`. `max_group_size`: 12 para `package`, 30 para `day_tour`. Duración: `duration_days = 1`, `nights = 0` y `duration_hours` / `start_time` para tours; para paquetes `nights = duration_days − 1` y horas/hora de inicio `null`. `meeting_point` = "Plaza de Armas de Cusco" con `meeting_lat = -13.5167`, `meeting_lng = -71.9785` en los 6 de Cusco; `null` en el resto (el artefacto solo muestra ese punto).

| slug | title | destino | kind | días | h | inicio | precio | img | categorías | blurb |
| ---- | ----- | ------- | ---- | ---- | - | ------ | ------ | --- | ---------- | ----- |
| `machu-picchu-magico` | Machu Picchu Mágico | cusco | package | 4 | - | - | 129000 | mp2 | cultura, aventura | Tren panorámico a Aguas Calientes, entrada a la ciudadela y guía en español. |
| `cusco-valle-sagrado` | Cusco y Valle Sagrado | cusco | package | 5 | - | - | 158000 | cus | cultura | Ollantaytambo, Pisac, Moray y la ciudad imperial, con hotel céntrico. |
| `montana-de-colores` | Montaña de Colores | cusco | day_tour | 1 | 14 | 04:00 | 12000 | vin | aventura | Salida de madrugada, desayuno incluido y caminata guiada a Vinicunca. |
| `titicaca-islas-uros` | Titicaca e Islas Uros | puno | package | 3 | - | - | 89000 | uro | cultura, naturaleza | Navega entre islas flotantes y duerme con una familia en Amantaní. |
| `canon-del-colca` | Cañón del Colca | arequipa | package | 3 | - | - | 74000 | col | aventura, naturaleza | Mirador de la Cruz del Cóndor y aguas termales al final del día. |
| `amazonia-tambopata` | Amazonía en Tambopata | amazonia | package | 4 | - | - | 165000 | tam | naturaleza | Lodge en plena selva, caminatas nocturnas y collpa de guacamayos. |
| `paracas-huacachina` | Paracas y Huacachina | ica-paracas | package | 2 | - | - | 52000 | hua | naturaleza, playas | Islas Ballestas en lancha y sandboard al atardecer en las dunas. |
| `lima-sabores-y-cultura` | Lima: Sabores y Cultura | lima | package | 3 | - | - | 69000 | lim | gastronomia, cultura | Centro histórico, Barranco y una clase de cocina de ceviche. |
| `mancora-sol-y-playa` | Máncora, sol y playa | mancora | package | 4 | - | - | 98000 | man | playas | Hotel frente al mar, paseo en bote y tiempo libre para surfear. |
| `laguna-69-huaraz` | Laguna 69 y Huaraz | huaraz | package | 4 | - | - | 86000 | l69 | aventura, naturaleza | Caminata a la laguna turquesa dentro del Parque Nacional Huascarán. |
| `sabores-del-peru` | Sabores del Perú | lima | package | 5 | - | - | 112000 | are | gastronomia | Mercados, picanterías y cocina novoandina en dos ciudades. (Artefacto: "Lima y Arequipa"; se asigna a Lima.) |
| `islas-ballestas` | Islas Ballestas | ica-paracas | day_tour | 1 | 2 | 08:00 | 9500 | bal | naturaleza | Lobos marinos, pingüinos de Humboldt y el Candelabro desde el bote. |
| `machu-picchu-en-un-dia` | Machu Picchu en un día | cusco | day_tour | 1 | 16 | 04:30 | 98000 | mp2 | cultura, aventura* | Tren ida y vuelta, bus de subida, entrada y guía. |
| `valle-sagrado-completo` | Valle Sagrado completo | cusco | day_tour | 1 | 10 | 07:30 | 15000 | pis | cultura* | Pisac, Ollantaytambo y almuerzo buffet en Urubamba. |
| `city-tour-sacsayhuaman` | City tour y Sacsayhuamán | cusco | day_tour | 1 | 5 | 13:30 | 7000 | sac | cultura* | Qorikancha, Catedral y los cuatro sitios arqueológicos cercanos. |
| `buggy-sandboard-huacachina` | Buggy y sandboard en Huacachina | ica-paracas | day_tour | 1 | 2 | 16:00 | 8500 | hua | aventura* | Dunas al atardecer, tabla incluida y fotos en el oasis. |
| `islas-uros-medio-dia` | Islas Uros medio día | puno | day_tour | 1 | 3 | 09:00 | 6000 | uro | cultura, naturaleza* | Bote por el Titicaca y visita a una isla flotante de totora. |
| `lima-colonial-miraflores` | Lima colonial y Miraflores | lima | day_tour | 1 | 4 | 09:30 | 8000 | lim | cultura* | Centro histórico, catacumbas y el malecón frente al Pacífico. |
| `colca-full-day` | Cañón del Colca full day | arequipa | day_tour | 1 | 15 | 03:00 | 14000 | col | aventura, naturaleza* | Cruz del Cóndor por la mañana y baños termales en Chivay. |
| `arequipa-ciudad-blanca` | Arequipa, la Ciudad Blanca | arequipa | day_tour | 1 | 4 | 14:00 | 6000 | are | cultura* | Plaza de Armas, Monasterio de Santa Catalina y miradores. |

`*` = categorías **inferidas** (el artefacto no categoriza esos tours; se copian por afinidad con su paquete hermano). Total `package_categories` = **29** (18 de los 12 del artefacto + 11 inferidas).

## 5. Machu Picchu Mágico: detalle

- `description`: "Cuatro días entre Cusco, el Valle Sagrado y la ciudadela, con tren panorámico y guía en español. Recorres la ciudad imperial, caminas entre las terrazas del Valle Sagrado y subes en tren hasta Aguas Calientes para entrar a Machu Picchu al día siguiente, con tiempo para fotos y sin apuros. Cada traslado y entrada está coordinado por nosotros."
- `max_group_size = 12`, `languages = ['es','en']`.
- **Galería (6, `package_images`, `sort_order` 0..5):**

| key | alt | credit (de `SEED_IMAGES`) |
| --- | --- | ------ |
| mp | Machu Picchu desde la montaña | Diego Delso, CC BY-SA 4.0 |
| mp2 | Terrazas de Machu Picchu y Huayna Picchu | Diego Delso, CC BY-SA 4.0 |
| tren | Tren sobre el río Urubamba | Sashimi-b, CC BY-SA 4.0 |
| pis | Terrazas de Pisac en el Valle Sagrado | Diego Delso, CC BY-SA 4.0 |
| cus | Catedral en la Plaza de Armas de Cusco | Diego Delso, CC BY-SA 4.0 |
| agc | Calle de Aguas Calientes | Diego Delso, CC BY-SA 4.0 |

- **Itinerario (4, `package_itinerary_days`):** lat/lng reales aproximados de cada parada (el artefacto solo tiene x,y de un mapa ilustrativo).

| día | place | title | transport_leg | img | lat | lng | description |
| --- | ----- | ----- | ------------- | --- | --- | --- | ----------- |
| 1 | Cusco | Llegada a Cusco y ciudad imperial | Llegas en avión · noche en Cusco | cus | -13.5167 | -71.9785 | Recepción en el aeropuerto y traslado al hotel. Por la tarde, paseo suave por la Plaza de Armas, el Qorikancha y San Blas para aclimatarte. |
| 2 | Pisac y Ollantaytambo | Valle Sagrado de los Incas | En bus por el valle · 93 km | pis | -13.4208 | -71.8478 | Salida temprano hacia Pisac, almuerzo buffet con productos locales y visita a Ollantaytambo. Duermes en el valle, a menor altura. |
| 3 | Aguas Calientes | Tren a Aguas Calientes | Tren panorámico · 1 h 40 min | tren | -13.1547 | -72.5258 | Tren panorámico desde Ollantaytambo. Tarde libre en el pueblo y briefing con tu guía para el ingreso del día siguiente. |
| 4 | Machu Picchu | Machu Picchu y regreso | Bus de subida · 25 min | mp2 | -13.1631 | -72.5450 | Subida en bus a primera hora y visita guiada de unas dos horas. Tiempo libre en la ciudadela y regreso en tren a Cusco. |

- **Inclusiones (10, `package_inclusions`, `sort_order` 1..n por tipo):**
  - `included`: 3 noches de alojamiento con desayuno · Traslados aeropuerto, estación y hotel · Tren panorámico ida y vuelta · Entrada a Machu Picchu y bus de subida · Guía profesional en español o inglés · Seguro de viaje durante el tour
  - `excluded`: Vuelos hasta Cusco · Almuerzos y cenas no indicados · Propinas · Gastos personales

Los demás paquetes no llevan galería, itinerario ni inclusiones (el artefacto solo las muestra para este).

## 6. Ofertas (8)

`discount_type`: `percent` salvo Ballestas (`two_for_one`, `discount_value = null`). `valid_until` = fin del día 23:59 Lima. `min_people` solo en Paracas y Huacachina (4). Clave `offer:<package-slug>`.

| paquete | kind | descuento | valid_until | is_active |
| ------- | ---- | --------- | ----------- | --------- |
| amazonia-tambopata | rainy_season | 25 | 2026-11-30 | true |
| machu-picchu-magico | last_minute | 15 | 2026-11-10 | true |
| islas-ballestas | groups | two_for_one | 2026-12-31 | true |
| mancora-sol-y-playa | last_minute | 30 | 2026-11-15 | **false** |
| titicaca-islas-uros | rainy_season | 20 | 2026-12-31 | true |
| canon-del-colca | last_minute | 10 | 2026-11-08 | **false** |
| paracas-huacachina | groups | 20 (min 4) | 2026-12-31 (supuesto) | true |
| laguna-69-huaraz | rainy_season | 15 | 2026-12-31 (supuesto) | true |

Activas/pausadas y fechas de las 6 primeras: panel admin. Las dos últimas solo están en la pantalla pública; fecha y estado asumidos.

Precio con oferta esperado (regla de redondeo inferida del artefacto: precio unitario con descuento a **soles enteros, mitad hacia arriba**): 1238, 1097, 95 (2x1 por dos personas), 686, 712, 666, 416, 731.

## 7. Salidas (`departures`, 52)

`capacity = packages.max_group_size`. `status = scheduled` salvo lo indicado. Unique (`package_id`, `starts_at`): el seed deduplica por esa clave.

1. **Salidas de hoy (4), 2026-10-24** (panel admin; hora del panel, aunque difiere de la hora de inicio del tour):

| paquete | hora | booked_seats | guía | status |
| ------- | ---- | ------------ | ---- | ------ |
| montana-de-colores | 05:30 | 14 | Wilber C. | en_route |
| machu-picchu-en-un-dia | 06:10 | 9 | Rocío M. | en_route |
| islas-ballestas | 08:00 | 22 | Iván P. | scheduled |
| buggy-sandboard-huacachina | 15:30 | 11 | Kiara S. | scheduled |

   ("Huacachina al atardecer" del panel = tour `buggy-sandboard-huacachina`, el único de Huacachina en el catálogo.)
2. **Una salida por cada una de las 8 reservas** (§8): fecha del panel, hora = hora de inicio del paquete (tours) u 08:00 (paquetes; 07:30 para Machu Picchu Mágico, hora del punto de encuentro de Confirmación).
3. **Machu Picchu Mágico:** jueves 2026-11-05, 12, 19 y 26 a las 07:30 (la del 5 ya existe por la reserva WY-4821 → +3).
4. **Resto de paquetes (19, todos menos Machu Picchu Mágico):** jueves 2026-11-05 y 2026-11-19 a su hora de inicio (08:00 si es paquete). Cañón del Colca 19-nov 08:00 ya existe por la reserva WY-4815 → se omite el duplicado: 38 − 1 = 37.

Total: 4 + 8 + 3 + 37 = **52**.

`booked_seats` = suma de `pax_count` de las reservas `confirmed` de esa salida (WY-4821: 2, WY-4819: 2, WY-4818: 3, WY-4815: 2, WY-4814: 1), salvo las 4 de hoy (valores del panel, sin reservas sembradas que los expliquen). Resto: 0. Invariante: `sum(pax confirmed) <= booked_seats <= capacity`.

## 8. Reservas (8), viajeros (9) y pagos (8)

Del panel admin. `unit_price_cents` = precio de lista (snapshot); descuento con la regla de §6. `total_cents = unit_price_cents × pax_count − discount_cents`. `exchange_rate = 3.75`, `currency = PEN`. `contact_email/phone` = los del usuario; `terms_accepted_at = created_at`. `created_at` a las 12:00 Lima en las fechas de la columna "creada" (último movimiento de cada cliente en el panel). Pagos: `provider = stripe`, `currency = USD`, `amount_cents = round(total_cents / 3.75)`.

| code | cliente | paquete | salida | pax | oferta | unit | discount | total | método | estado | creada | pago (estado) | amount USD ¢ |
| ---- | ------- | ------- | ------ | --- | ------ | ---- | -------- | ----- | ------ | ------ | ------ | ------------- | ------------ |
| WY-4821 | customer_01 | machu-picchu-magico | 2026-11-05 07:30 | 2 | - | 129000 | 0 | 258000 | card | confirmed | 10-21 | succeeded | 68800 |
| WY-4820 | customer_08 | montana-de-colores | 2026-11-02 04:00 | 4 | - | 12000 | 0 | 48000 | yape | pending | 10-12 | pending | 12800 |
| WY-4819 | customer_02 | amazonia-tambopata | 2026-11-12 08:00 | 2 | tambopata | 165000 | 82400 | 247600 | card | confirmed | 10-20 | succeeded | 66027 |
| WY-4818 | customer_07 | islas-ballestas | 2026-10-30 08:00 | 3 | - | 9500 | 0 | 28500 | plin | confirmed | 10-14 | succeeded | 7600 |
| WY-4817 | customer_05 | titicaca-islas-uros | 2026-11-08 08:00 | 2 | titicaca | 89000 | 35600 | 142400 | card | cancelled | 10-17 | refunded | 37973 |
| WY-4816 | customer_03 | paracas-huacachina | 2026-11-15 08:00 | 5 | paracas | 52000 | 52000 | 208000 | cash | pending | 10-19 | pending | 55467 |
| WY-4815 | customer_04 | canon-del-colca | 2026-11-19 08:00 | 2 | - | 74000 | 0 | 148000 | yape | confirmed | 10-18 | succeeded | 39467 |
| WY-4814 | customer_06 | machu-picchu-en-un-dia | 2026-10-27 04:30 | 1 | - | 98000 | 0 | 98000 | card | confirmed | 10-15 | succeeded | 26133 |

- Totales del panel: 2 580, 480, 2 476, 285, 1 424, 2 080, 1 480, 980 soles (coinciden con la columna `total`).
- `cash` = "PagoEfectivo". Yape, Plin y efectivo no se implementan en v1 (ERM); se siembran porque el panel admin los muestra.
- **WY-4817 (cancelada):** `cancelled_at = 2026-10-19 10:00 Lima` (más de 48 h antes de la salida → reembolso completo); pago `refunded` con `refunded_cents = amount_cents`; `paid_at = created_at + 5 min`.
- `paid_at = created_at + 5 min` en pagos `succeeded`/`refunded`; `null` en `pending`.
- `stripe_checkout_session_id = cs_test_seed_<code>` y `stripe_payment_intent_id = pi_seed_<code>` solo en pagos con tarjeta; `null` en yape/plin/cash. `refunded_cents = 0` salvo WY-4817.
- **Viajeros:** 1 principal por reserva (`is_primary = true`, nombre del cliente, `doc_type` `dni` para Perú y `passport` para el resto, `doc_number` `9000000N` / `SEEDPP0N` con N = 1..8 en el orden de la tabla) + 1 adicional en WY-4821: "Pedro Quispe", `dni` `90000009`, `is_primary = false`. Total 9.
- El panel muestra además 126 reservas, S/ 84 320 de ingresos, 2 418 clientes, etc.: son maquetas, **no se siembran**. Los agregados derivados (clientes, gasto, KPIs) saldrán de estas 8 reservas y no coincidirán con el artefacto.

## 9. Conteos esperados tras `db:seed`

| tabla | filas | tabla | filas |
| ----- | ----- | ----- | ----- |
| users | 11 | departures | 52 |
| organizers | 1 | offers | 8 |
| notification_preferences | 9 | bookings | 8 |
| destinations | 8 | booking_travelers | 9 |
| destination_climate_months | 12 | payments | 8 |
| destination_sights | 5 | stripe_events | 0 |
| destination_faqs | 3 | newsletter_subscribers | 4 |
| categories | 5 | package_images | 6 |
| packages | 20 | package_itinerary_days | 4 |
| package_categories | 29 | package_inclusions | 10 |
| guides | 4 | | |
