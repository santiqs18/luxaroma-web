import { CATALOG_NAME, CATALOG_TAGLINE } from '../config/config.js';
import { loadProducts, getAllProducts } from '../data/store.js';
import { renderProductCard } from '../components/product-card.js';
import { waLink, genericMessage } from '../utils/whatsapp.js';
import { el, clear } from '../utils/dom.js';
import { setTitle } from '../utils/seo.js';

let pageKey = 0;

/**
 * Página de inicio: hero, categorías de género y perfumes destacados.
 */
export async function renderHomePage(container) {
  const key = ++pageKey;
  setTitle(`${CATALOG_NAME} — ${CATALOG_TAGLINE} | Hombre, Mujer y Unisex`);

  clear(container);
  container.appendChild(
    el('div', { class: 'page-loading', role: 'status', 'aria-live': 'polite' }, ['Cargando…'])
  );

  try {
    await loadProducts();
  } catch (err) {
    if (key !== pageKey) return;
    console.error(err);
    clear(container);
    container.appendChild(
      el('section', { class: 'error-state', role: 'alert' }, [
        el('h1', { class: 'page-title', text: 'No se pudo cargar el catálogo' }),
        el('p', { class: 'empty-text', text: 'Verificá que data/products.json se sirva desde un servidor web.' }),
        el('button', {
          type: 'button',
          class: 'btn btn-outline',
          onclick: () => window.location.reload(),
          text: 'Reintentar',
        }),
      ])
    );
    return;
  }
  if (key !== pageKey) return;

  const all = getAllProducts();
  // Populares: los más populares primero, luego disponibles, máx. 8.
  const featured = all
    .slice()
    .sort(
      (a, b) =>
        Number(b.popular) - Number(a.popular) ||
        Number(b.available) - Number(a.available) ||
        a.id.localeCompare(b.id)
    )
    .slice(0, 8);

  const hero = el('section', { class: 'hero' }, [
    el('div', { class: 'container hero-inner' }, [
      el('p', { class: 'hero-eyebrow', text: CATALOG_TAGLINE }),
      el('h1', { class: 'hero-title' }, [
        'Perfumes que dejan huella',
      ]),
      el('p', {
        class: 'hero-text',
        text: 'Explorá nuestro catálogo de fragancias para hombre, mujer y unisex. Consultá cada producto directamente por WhatsApp.',
      }),
      el('div', { class: 'hero-ctas' }, [
        el('a', { class: 'btn btn-gold btn-lg', href: '#/catalogo', text: 'Ver catálogo completo' }),
        el('a', {
          class: 'btn btn-whatsapp btn-lg',
          href: waLink(genericMessage()),
          target: '_blank',
          rel: 'noopener noreferrer',
          text: 'Escribinos por WhatsApp',
        }),
      ]),
    ]),
  ]);

  const categories = [
    { label: 'Hombre', href: '#/catalogo/hombre', icon: '♂', count: countByGender(all, 'hombre') },
    { label: 'Mujer', href: '#/catalogo/mujer', icon: '♀', count: countByGender(all, 'mujer') },
    { label: 'Unisex', href: '#/catalogo/unisex', icon: '⚥', count: countByGender(all, 'unisex') },
  ];

  const categoryGrid = el('div', { class: 'container' }, [
    el('div', { class: 'category-grid' },
      categories.map((c) =>
        el('a', { href: c.href, class: 'category-card' }, [
          el('span', { class: 'category-icon', 'aria-hidden': 'true', text: c.icon }),
          el('span', { class: 'category-label', text: c.label }),
          el('span', { class: 'category-count', text: `${c.count} fragancias` }),
        ])
      )
    ),
  ]);

  const featuredSection = el('section', { class: 'container section' }, [
    el('header', { class: 'section-head' }, [
      el('h2', { class: 'section-title', text: 'Los más populares' }),
      el('a', { class: 'section-link', href: '#/catalogo', text: 'Ver todos →' }),
    ]),
    el('div', { class: 'product-grid' }, featured.map(renderProductCard)),
  ]);

  const strip = el('section', { class: 'wa-strip' }, [
    el('div', { class: 'container wa-strip-inner' }, [
      el('div', {}, [
        el('h2', { class: 'wa-strip-title', text: '¿Tenés dudas?' }),
        el('p', { class: 'wa-strip-text', text: 'Consultá disponibilidad, precios y tamaños por WhatsApp, sin compromiso.' }),
      ]),
      el('a', {
        class: 'btn btn-whatsapp btn-lg',
        href: waLink(genericMessage()),
        target: '_blank',
        rel: 'noopener noreferrer',
        text: 'Contactar por WhatsApp',
      }),
    ]),
  ]);

  clear(container);
  container.appendChild(hero);
  container.appendChild(categoryGrid);
  container.appendChild(featuredSection);
  container.appendChild(strip);
}

function countByGender(products, gender) {
  return products.filter((p) => p.gender === gender).length;
}