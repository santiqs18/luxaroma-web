import { CATALOG_NAME, FALLBACK_IMG } from '../config/config.js';
import { loadProducts, getById, getAllProducts } from '../data/store.js';
import { add as cartAdd } from '../data/cart.js';
import { formatPrice, genderLabel } from '../utils/format.js';
import { waLink, productDetailMessage } from '../utils/whatsapp.js';
import { el, clear } from '../utils/dom.js';
import { setTitle, setMetaName, setOgPage, setJsonLd, removeJsonLd } from '../utils/seo.js';

let pageKey = 0;

/**
 * Página de detalle de un perfume (#/perfume/:id).
 * Incluye metadatos SEO y JSON-LD de Producto, e integración WhatsApp.
 */
export async function renderDetailPage(container, params = {}) {
  const key = ++pageKey;
  const id = decodeURIComponent(params.id || '');

  clear(container);
  container.appendChild(
    el('div', { class: 'page-loading', role: 'status', 'aria-live': 'polite' }, ['Cargando producto…'])
  );

  try {
    await loadProducts();
  } catch (err) {
    if (key !== pageKey) return;
    renderNotFound(container);
    return;
  }
  if (key !== pageKey) return;

  const product = getById(id);
  if (!product) {
    renderNotFound(container);
    return;
  }

  setTitle(`${product.name} · ${product.brand} | ${CATALOG_NAME}`);
  setMetaName('description', product.description || `Perfume ${product.name} de ${product.brand}.`);
  setOgPage({
    title: `${product.name} — ${product.brand}`,
    description: product.description || `Perfume ${product.name} de ${product.brand}.`,
    image: product.image,
  });
  setJsonLd(productSchema(product), 'product-jsonld');

  // Navegación anterior/siguiente dentro del catálogo.
  const all = getAllProducts();
  const index = all.findIndex((p) => p.id === product.id);
  const prev = index > 0 ? all[index - 1] : null;
  const next = index < all.length - 1 ? all[index + 1] : null;

  const img = el('img', {
    src: product.image,
    alt: `Perfume ${product.name} de ${product.brand}`,
    width: '600',
    height: '750',
    decoding: 'async',
  });
  img.addEventListener('error', () => {
    if (img.dataset.fallback) return;
    img.dataset.fallback = '1';
    img.src = FALLBACK_IMG;
  });

  const priceText = formatPrice(product.price) ?? 'Consultar precio';
  const statusText = product.available ? 'Disponible' : 'Agotado';
  const statusClass = product.available ? 'badge-available' : 'badge-soldout';

  let qty = 1;
  const qtyValue = el('span', { id: 'detail-qty', class: 'cart-item-qty', 'aria-live': 'polite', text: String(qty) });

  const buildWaHref = () => waLink(productDetailMessage(product, qty));

  const waLinkNode = el('a', {
    class: 'btn btn-whatsapp btn-lg',
    href: buildWaHref(),
    target: '_blank',
    rel: 'noopener noreferrer',
    text: 'Consultar por WhatsApp',
    'aria-label': `Consultar disponibilidad y precio de ${product.name} por WhatsApp`,
  });

  const updateQty = (next) => {
    qty = Math.max(1, Math.min(99, next));
    qtyValue.textContent = String(qty);
    waLinkNode.href = buildWaHref();
  };

  const minBtn = el('button', {
    type: 'button',
    class: 'qty-btn',
    'aria-label': 'Disminuir cantidad',
    text: '−',
  });
  minBtn.addEventListener('click', () => updateQty(qty - 1));

  const plusBtn = el('button', {
    type: 'button',
    class: 'qty-btn',
    'aria-label': 'Aumentar cantidad',
    text: '+',
  });
  plusBtn.addEventListener('click', () => updateQty(qty + 1));

  const qtyControl = el('div', { class: 'detail-qty' }, [
    el('label', { class: 'detail-qty-label', for: 'detail-qty', text: 'Cantidad:' }),
    el('div', { class: 'qty-controls' }, [minBtn, qtyValue, plusBtn]),
  ]);

  const addBtn = el('button', {
    type: 'button',
    class: 'btn btn-outline btn-lg',
    'aria-label': `Agregar ${product.name} de ${product.brand} al pedido`,
    text: 'Agregar al pedido',
  });
  addBtn.addEventListener('click', () => {
    cartAdd(product.id, qty);
    const texto = qty > 1 ? `Agregados ✓ (${qty})` : 'Agregado ✓';
    addBtn.classList.add('btn-added');
    addBtn.textContent = texto;
    addBtn.disabled = true;
    setTimeout(() => {
      addBtn.classList.remove('btn-added');
      addBtn.textContent = 'Agregar al pedido';
      addBtn.disabled = false;
    }, 1200);
  });

  clear(container);
  container.appendChild(
    el('div', { class: 'detail' }, [
      el('div', { class: 'container' }, [
        el('nav', { class: 'breadcrumb', 'aria-label': 'Ruta de navegación' }, [
          el('a', { class: 'crumb', href: '#/catalogo', text: 'Catálogo' }),
          el('span', { class: 'crumb-sep', 'aria-hidden': 'true', text: '›' }),
          el('span', { class: 'crumb-current', text: product.name }),
        ]),
        el('div', { class: 'detail-layout' }, [
        el('div', { class: 'detail-img-wrap' }, [img]),
        el('article', { class: 'detail-info' }, [
          el('p', { class: 'detail-brand', text: product.brand }),
          el('h1', { class: 'detail-name', text: product.name }),
          el('div', { class: 'detail-badges' }, [
            el('span', { class: `badge badge-lg ${statusClass}`, text: statusText }),
            el('span', { class: 'badge badge-lg badge-neutral', text: genderLabel(product.gender) }),
          ]),
          el('dl', { class: 'detail-list' }, [
            detailRow('Concentración', product.category),
            detailRow('Familia olfativa', product.family),
            detailRow('Tamaño', product.size),
            detailRow('Precio', priceText),
          ]),
          el('div', { class: 'detail-notes' }, [
            el('h2', { class: 'detail-sub', text: 'Notas principales' }),
            product.notes.length
              ? el('ul', { class: 'notes-list' }, product.notes.map((n) => el('li', { class: 'note-chip', text: n })))
              : el('p', { class: 'detail-muted', text: 'No disponibles por el momento.' }),
          ]),
          product.description
            ? el('div', { class: 'detail-desc' }, [
                el('h2', { class: 'detail-sub', text: 'Descripción' }),
                el('p', { class: 'detail-text', text: product.description }),
              ])
            : null,
          el('div', { class: 'detail-actions' }, [
            qtyControl,
            addBtn,
            waLinkNode,
          ]),
          el('div', { class: 'detail-pager' }, [
            prev
              ? el('a', {
                  class: 'btn btn-ghost',
                  href: `#/perfume/${encodeURIComponent(prev.id)}`,
                  text: `← ${prev.name}`,
                })
              : null,
            next
              ? el('a', {
                  class: 'btn btn-ghost',
                  href: `#/perfume/${encodeURIComponent(next.id)}`,
                  text: `${next.name} →`,
                })
              : null,
          ]),
        ]),
      ]),
    ]),
  ])
  );
}

function detailRow(label, value) {
  if (!value) return null;
  return el('div', { class: 'detail-row' }, [
    el('dt', { text: label }),
    el('dd', { text: value }),
  ]);
}

function productSchema(p) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    brand: { '@type': 'Brand', name: p.brand },
    description: p.description || `Perfume ${p.name} de ${p.brand}.`,
    image: p.image,
    category: [genderLabel(p.gender), p.category, p.family].filter(Boolean).join(' · '),
    offers: p.price
      ? {
          '@type': 'Offer',
          price: p.price,
          priceCurrency: 'ARS',
          availability: p.available
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
          url: `https://luxaroma.example.com/#/perfume/${encodeURIComponent(p.id)}`,
        }
      : undefined,
  };
  if (!schema.offers) delete schema.offers;
  return schema;
}

function renderNotFound(container) {
  setTitle(`Perfume no encontrado | ${CATALOG_NAME}`);
  removeJsonLd();
  clear(container);
  container.appendChild(
    el('section', { class: 'error-state', role: 'alert' }, [
      el('h1', { class: 'page-title', text: 'Perfume no encontrado' }),
      el('p', { class: 'empty-text', text: 'El producto que buscás no existe o fue removido del catálogo.' }),
      el('a', { class: 'btn btn-outline', href: '#/catalogo', text: 'Volver al catálogo' }),
    ])
  );
}