# LuxAroma Parfum — Catálogo Online de Perfumes

Catálogo estático **sin backend**, pensado para manejar desde unos pocos hasta **1.000+ perfumes**,
con búsqueda, filtros combinables, ordenamiento, carga progresiva y consulta directa por **WhatsApp**.

No hay carrito, cuentas ni pagos online: cada producto tiene un botón
"Consultar por WhatsApp" que abre `wa.me` con el mensaje del perfume ya preparado.

---

## Tecnología elegida (y por qué)

**HTML + CSS + JavaScript (ES modules nativos), sin build, sin dependencias.**

| Criterio | Decisión | Motivo |
|---|---|---|
| Framework | Ninguno (vanilla ES modules) | El catálogo es 95 % render estático. Un framework no aporta nada aquí y agrega ~100 KB+ al bundle. La spec permite priorizar HTML/CSS/JS si es lo más eficiente. |
| TypeScript | No en esta primera versión | Exigiría un paso de compilación (npm/Node). Con ES modules + JSDoc el mantenimiento es claro y el proyecto se despliega sin build. |
| Base de datos | Ninguna | Los productos viven en `data/products.json` (están previstos 1.000+ ítems sin problema). |
| Dependencias | Cero (`npm install` = nada) | Menos superficie de ataque, nada que actualizar, bundle mínimo. |
| Servidor web | Cualquier host estático | Netlify, Vercel, Cloudflare Pages, GitHub Pages o `python -m http.server` para desarrollo. |

> **Nota:** el routing usa **hash** (`#/catalogo`, `#/perfume/perfume-001`). Funciona en todos los hosts
> estáticos sin reescrituras de servidor y permite enlazar un perfume directamente.

---

## Estructura del proyecto

```
├── index.html                  → punto de entrada (SEO + styles)
├── favicon.svg
├── robots.txt
├── sitemap.xml
├── data/
│   └── products.json           → TODOS los perfumes (agregá acá)
├── images/
│   ├── perfumes/               → imágenes por producto (perfume-001.webp, …)
│   └── placeholders/placeholder.svg  → imagen de respaldo
├── src/
│   ├── main.js                 → bootstrap + router
│   ├── config/config.js        → ⚙️ NÚMERO DE WHATSAPP + configuración global
│   ├── data/store.js           → carga, normalización, búsqueda, filtros, orden
│   ├── components/             → header, footer, product-card, filtros
│   ├── pages/                  → home, catálogo, detalle
│   ├── utils/                  → dom (XSS-safe), whatsapp, format, seo, router, network
│   └── styles/                 → base, componentes, layout, páginas, responsive
└── tools/
    └── generate-placeholders.py → genera SVGs placeholder para productos sin foto
```

---

## Puesta en marcha

Como no hay build, **abrir `index.html` desde el disco no funciona** (los ES modules
y el `fetch` de JSON requieren HTTP). Usá cualquier servidor estático:

```bash
# Opción sin herramientas
python -m http.server 8080        # → http://localhost:8080
```

o subí la carpeta directamente a Netlify/Vercel/Cloudflare Pages/GitHub Pages.

---

## Configuración (todo en UN solo archivo)

Edité `src/config/config.js`:

| Constante | Qué es |
|---|---|
| `WHATSAPP_NUMBER` | El número con código de país, sin `+`, espacios ni guiones. Ej. Argentina: `5491123456789`. **Cambialo una vez y todos los botones se actualizan** (no hay el número repetido en ningún producto). |
| `CATALOG_NAME` / `CATALOG_TAGLINE` | Nombre del catálogo y eslogan. |
| `CURRENCY` / `LOCALE` | Moneda y formato de precios (`ARS`, `es-AR`). |
| `PAGE_SIZE` | Perfumes que se muestran por lote en la carga progresiva. |
| `PRODUCTS_URL` / `FALLBACK_IMG` | Ruta del JSON y de la imagen de respaldo. |

> Mientras `WHATSAPP_NUMBER` siga siendo el de ejemplo, el sitio muestra un aviso
> pequeño en el header para recordártelo. Se esconde solo al cambiarlo.

---

## Cómo agregar un perfume

1. **Imagen**: copiá la foto optimizada a `images/perfumes/<id>.webp`
   (WebP/AVIF recomendado, dimensiones ~600×750, tamaño razonable).
2. **Datos**: agregá el objeto en `data/products.json` (ver ejemplo abajo).
3. **Guardar** y **redesplegar**. **No tocás ningún componente del frontend.**

```json
{
  "id": "perfume-019",
  "name": "Nombre del perfume",
  "brand": "Marca",
  "gender": "hombre",
  "category": "Eau de Parfum",
  "family": "Amaderada",
  "size": "100 ml",
  "price": 50000,
  "image": "images/perfumes/perfume-019.webp",
  "available": true,
  "description": "Descripción breve…",
  "notes": ["Nota 1", "Nota 2"]
}
```

Campos opcionales: `size`, `price` (si falta, se muestra "Consultar precio"),
`description`, `notes`, `image` (si falta, se usa el placeholder).
`category` es la concentración (EDT, EDP, Parfum…); también acepta el alias `concentration`.

Para generar automáticamente un placeholder de un producto nuevo:

```bash
python tools/generate-placeholders.py
```

(Solo crea los que faltan; no sobrescribe fotos reales salvo con `--overwrite`.)

---

## Rendimiento: decisiones aplicadas

- **Un solo JSON en memoria**: `data/products.json` se descarga una vez y se cachea.
  Con 1.000 productos (~0,5 MB) la búsqueda y el filtrado en memoria son de ~1 ms.
- **Carga progresiva**: se renderizan `PAGE_SIZE` (12) tarjetas y un botón
  "Cargar más". Nunca se construyen las 1.000 tarjetas a la vez.
- **Lazy loading de imágenes**: `loading="lazy"`, `decoding="async"` y
  `width`/`height` definidos → las imágenes de abajo no se descargan hasta
  scrollear, y no hay saltos de layout (CLS).
- **Debounce en la búsqueda** (220 ms) y sin recálculos: al escribir no se vuelve
  a renderizar nada hasta que la entrada se detiene.
- **Índice de búsqueda pre-calculado**: cada producto tiene su texto
  normalizado (nombre + marca + familia + concentración + género + notas)
  construido una sola vez al cargar.
- **Sin dependencias ni fuentes externas**: el tamaño total del JS es de pocos KB
  y no hay solicitudes de red que no sean imprescindibles.
- **Animaciones mínimas** con `prefers-reduced-motion` respetado.

---

## Búsqueda, filtros y ordenamiento

Todo en la página **Catálogo** y combinable:

- Búsqueda por **nombre, marca, familia, concentración, género y notas**
  (el buscador del header también lleva a esta búsqueda).
- Filtros: **género** (chips), **marca**, **familia olfativa**, **concentración**,
  **disponibilidad** (Disponibles/Agotados).
- Orden: **Destacados · Nombre A-Z · Nombre Z-A · Precio ↑ · Precio ↓**.
- Productos **sin precio** se ordenan al final en los órdenes de precio y se
  muestran como "Consultar precio".
- Mensaje amigable cuando **no hay resultados**.

---

## WhatsApp

- Número centralizado en `src/config/config.js` (`WHATSAPP_NUMBER`).
- El enlace se arma en `src/utils/whatsapp.js` con `encodeURIComponent`,
  así los nombres con caracteres especiales no rompen el mensaje.
- Mensaje desde tarjeta: *"Hola, quisiera consultar por el perfume X de Y."*
- Mensaje desde detalle: *"Hola, quisiera consultar disponibilidad y precio de X de Y."*

---

## Seguridad

- Nada de `innerHTML` con datos dinámicos: todo se construye con `document.createElement`
  + `textContent` (helper `el()` en `src/utils/dom.js`), lo que evita XSS desde el JSON.
- Enlaces `wa.me` con `rel="noopener noreferrer"`.
- Sin secretos ni APIs privadas en el frontend; cero dependencias que actualizar.
- HTTPS lo resuelve el hosting.

---

## SEO y accesibilidad

- **SEO**: `title` y `meta description`, **Open Graph**, **JSON-LD** (`OnlineStore`
  en el índice y `Product` en cada detalle), `robots.txt`, `sitemap.xml`,
  HTML semántico (`header/nav/main/article/footer`), `alt` descriptivos.
  Para producción, actualizá el dominio en `index.html`, `sitemap.xml` y `robots.txt`.
- **Accesibilidad**: skip-link, landmarks, labels asociadas, `aria-current` en el
  menú, estados hover/focus visibles, navegación por teclado, y el estado del
  producto se comunica con **texto además de color**.

---

## Roadmap (previsto, sin implementar)

- Panel de administración, base de datos, API, gestión de stock, precios dinámicos,
  múltiples imágenes por perfume, analytics y dominio propio.
  La arquitectura actual (datos separados del frontend) deja todo esto encarado.

## Cómo desplegar

Todas son soluciones "arrastrá la carpeta":

- **Netlify**: arrastrar la carpeta a https://app.netlify.com/drop
- **Vercel**: `vercel` en la carpeta (detección estática, sin build).
- **Cloudflare Pages**: arrastrar el directorio a Pages → Create project.
- **GitHub Pages**: publicar el repo y servir desde la raíz (rama `main` en Settings → Pages).