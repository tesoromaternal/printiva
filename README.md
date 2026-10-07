# Printiva

Tienda de productos personalizados: Personalización · DTF · Sublimación · Regalos.

**Stack:** Astro 7 · React 19 · Tailwind CSS 4 · TypeScript · Turso (libSQL) + Drizzle · nanostores · pnpm

## Arrancar

```bash
pnpm install
pnpm db:setup   # crea tablas + carga catálogo de ejemplo
pnpm dev        # Astro 7 corre como daemon: `pnpm astro dev stop` para pararlo
```

pnpm 11 no ejecuta scripts de instalación salvo los aprobados en
`pnpm-workspace.yaml` (`allowBuilds`). Hoy solo `esbuild`. Si una dependencia
nueva lo necesita: `pnpm approve-builds <paquete>`, nunca `--all` a ciegas.

Sin variables de entorno usa un SQLite local (`local.db`) — mismo motor que Turso.
Para usar Turso en la nube, crear `.env` con:

```bash
TURSO_DATABASE_URL=libsql://printiva-<org>.turso.io   # turso db show printiva --url
TURSO_AUTH_TOKEN=...                                  # turso db tokens create printiva
```

y volver a correr `pnpm db:setup`.

## Pagos con SumUp

Flujo portado de `menu-la-rueca`, con Turso en lugar de Upstash Redis:

```
CheckoutView ──POST /api/checkout/session──▶ valida + recalcula total (catálogo) ─▶ orders 'pending' ─▶ SumUp checkout
     │                                                                                                        │
     ├── widget de tarjeta SumUp ──────────────────────────── cobra ──────────────────────────────────────────┘
     ├── GET /api/checkout/status?ref= ─┐
SumUp ── POST /api/sumup/webhook ───────┴─▶ settleCheckout(ref): lock → pregunta a SumUp → triple check de total → 'paid' → email
```

Variables (en `.env` local y en Vercel):

```bash
SUMUP_API_KEY=            # SumUp → Developers → API keys
SUMUP_MERCHANT_CODE=      # código de comercio (MXXXXXXX)
RESEND_API_KEY=           # aviso de pedido pagado (con las imágenes adjuntas)
ORDER_NOTIFY_EMAIL_FROM=  # remitente verificado en Resend
ORDER_NOTIFY_EMAIL_TO=    # dónde llegan los pedidos
SITE_URL=                 # https://printiva.es — origen de confianza para callbacks de pago
```

`SITE_URL` (o `VERCEL_PROJECT_PRODUCTION_URL`, que Vercel pone solo) es
obligatorio en producción: los callbacks de pago nunca salen del header Host.

## Panel de admin (`/admin`)

```bash
pnpm admin:hash   # pide la contraseña (oculta) → imprime ADMIN_PASSWORD_HASH=scrypt:...
```

Cargar `ADMIN_USERNAME` y `ADMIN_PASSWORD_HASH` en `.env` y en Vercel. Sin ellas `/admin` responde 503.

- Contraseña guardada como hash **scrypt** con sal (nunca en texto plano).
- Sesiones en Turso (`admin_sessions`): token aleatorio en cookie `httpOnly` con `path=/admin`; en la DB solo su SHA-256. Duran 7 días y el logout las **borra** (una cookie copiada deja de servir).
- 5 intentos fallidos por IP cada 15 min → bloqueo. La IP se guarda hasheada.
- Logout por POST (protegido por el `checkOrigin` de Astro). `/admin` con `no-store` y `noindex`.

### Qué se edita desde el panel

| Sección | Qué permite |
|---|---|
| **Productos** | Crear / editar / ocultar / eliminar. Nombre, slug, resumen, descripción, precio, categoría, etiqueta, colores, tallas, ocasiones, destacado y **fotos** (subir varias, ordenar, texto alternativo). Vista previa con la tarjeta real de la tienda. |
| **Categorías** | Nombre, descripción, color del círculo, dibujo y foto. El slug es fijo. |
| **Blog** | Editor visual (Tiptap): títulos, negrita, listas, citas, enlaces, imágenes. Portada, extracto, slug, borrador/publicado. Público en `/blog`. |

- **La tienda se renderiza al pedirla** con caché en la CDN de Vercel (`s-maxage=60` + `stale-while-revalidate`, en `src/middleware.ts`): lo que guardes se ve en **~1 minuto**, sin builds.
- **Fotos en Vercel Blob** (store público). Se optimizan en el navegador antes de subir (máx. 1600 px, WebP). Al quitar una foto o borrar un producto/post, se borra también del store.
- **El HTML del blog se sanea en el servidor** (`features/blog/sanitize.ts`): sin `<script>`, handlers `on*`, `javascript:` ni iframes, aunque roben una sesión.
- `pnpm db:seed` **se niega** si ya hay productos (borraría lo editado). Para forzarlo: `pnpm db:seed --force`.

```bash
pnpm test   # 79 tests: precios, validación, settle, SumUp, origen, crypto del admin, saneado XSS
```

## Estructura (screaming architecture)

```
src/
├── db/                  schema, cliente, seed (Drizzle + libSQL)
├── features/
│   ├── catalog/         tipos, repository (único acceso a la DB), ProductMockup, cards
│   ├── customizer/      personalizador: color, talla, imagen, texto, vista previa
│   ├── cart/            store persistente, drawer, checkout con SumUp
│   ├── checkout/        resolveOrder (precio autoritativo), pedidos en Turso, SumUp, emails
│   ├── wishlist/        favoritos
│   └── quotes/          presupuesto para empresas (mockup)
├── components/          layout, home, piezas compartidas
└── pages/               rutas
```

## Estado: MOCKUP

| Pieza | Estado |
|---|---|
| Catálogo, categorías, ocasiones | ✅ Desde la base de datos |
| Personalizador con vista previa | ✅ Funcional (imagen reducida en cliente) |
| Carrito y favoritos | ✅ Persisten en localStorage |
| Checkout / pagos | ✅ SumUp listo — falta cargar credenciales y probar con un pago real |
| Presupuesto empresas, contacto, newsletter | 🟡 Mockup: no envían (tabla `quote_requests` ya creada) |
| Panel de admin | ✅ Productos, fotos, categorías y blog · gestión de pedidos pendiente |
| Fotos reales de productos | ✅ Desde el admin (sin fotos se ve el mockup SVG) |
