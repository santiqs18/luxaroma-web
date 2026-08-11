import { CATALOG_NAME, FALLBACK_IMG } from '../config/config.js';
import { loadProducts, getById } from '../data/store.js';
import { getItems, add, setQty, remove, clear, count } from '../data/cart.js';
import { formatPrice } from '../utils/format.js';
import { waLink, orderMessage, genericMessage } from '../utils/whatsapp.js';
import { el, clear as clearNode } from '../utils/dom.js';
import { setTitle } from '../utils/seo.js';

let pageKey = 0;

/**
 * Página de pedido (#/carrito): lista de productos con cantidades,
 * total y botón para enviar el pedido armado por WhatsApp.
 */
export async function renderCartPage(container) {
  const key = ++pageKey;
  setTitle(`Tu pedido | ${CATALOG_NAME}`);

  clearNode(container);
  container.appendChild(
    el('div', { class: 'page-loading', role: 'status', 'aria-live': 'polite' }, ['Cargando tu pedido…'])
  );

  try {
    await loadProducts();
  } catch (err) {
    if (key !== pageKey) return;
    renderError(container);
    return;
  }
  if (key !== pageKey) return;

  paint();

  function paint() {
    // Prune: descarta ids que ya no existen en el catálogo.
    const known = getItems();
    const stale = known.filter((it) => !getById(it.id)).map((it) => it.id);
    stale.forEach((id) => remove(id));

    const rows = getItems()
      .map((it) => ({ item: it, product: getById(it.id) }))
      .filter((r) => r.product);

    clearNode(container);

    if (rows.length === 0) {
      container.appendChild(el('section', { class: 'cart' }, [
        el('div', { class: 'container' }, [
          renderEmpty(),
        ]),
      ]));
      return;
    }

    const priced = rows.filter((r) => typeof r.product.price === 'number');
    const total = priced.reduce((acc, r) => acc + r.product.price * r.item.qty, 0);
    const isComplete = priced.length === rows.length;

    const entries = rows.map((r) => ({
      name: `${r.product.brand} ${r.product.name}`,
      size: r.product.size,
      qty: r.item.qty,
      price: formatPrice(r.product.price * r.item.qty),
    }));

    const waHref = waLink(orderMessage(entries, isComplete ? formatPrice(total) : null));

    container.appendChild(
      el('section', { class: 'cart' }, [
        el('div', { class: 'container' }, [
          el('header', { class: 'page-head' }, [
            el('h1', { class: 'page-title', text: 'Tu pedido' }),
            el('p', { class: 'page-sub', text: 'Revisá las cantidades, ajustá lo que necesites y enviá el pedido por WhatsApp.' }),
          ]),

          el('div', { class: 'cart-layout' }, [
            el('div', { class: 'cart-list', 'aria-label': 'Productos en el pedido' },
              rows.map((r) => renderCartItem(r, paint))
            ),
            el('aside', { class: 'cart-summary' }, [
              el('h2', { class: 'cart-summary-title', text: 'Resumen' }),
              el('p', { class: 'cart-summary-count', text: countText(rows) }),
              el('div', { class: 'cart-total-row' }, [
                el('span', { text: 'Total' }),
                el('span', { class: 'cart-total' , text: isComplete ? formatPrice(total) : 'A consultar' }),
              ]),
              isComplete
                ? null
                : el('p', { class: 'cart-note', text: 'Algunos productos no tienen precio publicado; se cotizan al confirmar por WhatsApp.' }),
              el('a', {
                class: 'btn btn-whatsapp btn-lg cart-wa',
                href: waHref,
                target: '_blank',
                rel: 'noopener noreferrer',
                text: 'Enviar pedido por WhatsApp',
              }),
              el('div', { class: 'cart-actions' }, [
                el('a', {
                  class: 'btn btn-outline',
                  href: '#/catalogo',
                  text: 'Seguir viendo perfumes',
                }),
                clearBtn(),
              ]),
            ]),
          ]),
        ]),
      ])
    );
  }

  function clearBtn() {
    const btn = el('button', { type: 'button', class: 'btn btn-ghost' }, ['Vaciar pedido']);
    btn.addEventListener('click', () => {
      clear();
      paint();
    });
    return btn;
  }
}

function renderCartItem({ item, product }, repaint) {
  const img = el('img', {
    class: 'cart-item-img',
    src: product.image,
    alt: `${product.name} de ${product.brand}`,
    width: '120',
    height: '150',
    loading: 'lazy',
    decoding: 'async',
  });
  img.addEventListener('error', () => {
    if (img.dataset.fallback) return;
    img.dataset.fallback = '1';
    img.src = FALLBACK_IMG;
  });

  const qtyEl = el('span', { class: 'cart-item-qty', text: String(item.qty) });

  const minus = el('button', {
    type: 'button',
    class: 'qty-btn',
    'aria-label': `Quitar uno de ${product.name}`,
    text: '−',
  });
  minus.addEventListener('click', () => {
    setQty(item.id, item.qty - 1);
    repaint();
  });

  const plus = el('button', {
    type: 'button',
    class: 'qty-btn',
    'aria-label': `Sumar uno a ${product.name}`,
    text: '+',
  });
  plus.addEventListener('click', () => {
    add(item.id, 1);
    repaint();
  });

  const removeBtn = el('button', {
    type: 'button',
    class: 'cart-remove',
    'aria-label': `Quitar ${product.name} del pedido`,
    text: 'Quitar',
  });
  removeBtn.addEventListener('click', () => {
    remove(item.id);
    repaint();
  });

  const priceText = formatPrice(product.price * item.qty);

  return el('article', { class: 'cart-item' }, [
    el('a', { class: 'cart-item-imgwrap', href: `#/perfume/${encodeURIComponent(product.id)}`, 'aria-hidden': 'true', tabindex: '-1' }, [img]),
    el('div', { class: 'cart-item-info' }, [
      el('p', { class: 'cart-item-brand', text: product.brand }),
      el('a', { class: 'cart-item-name', href: `#/perfume/${encodeURIComponent(product.id)}`, text: product.name }),
      el('p', { class: 'cart-item-meta', text: [product.size, product.category].filter(Boolean).join(' · ') || '…' }),
    ]),
    el('div', { class: 'cart-item-side' }, [
      el('div', { class: 'qty-controls' }, [minus, qtyEl, plus]),
      el('div', { class: 'cart-item-total', text: priceText || 'Consultar precio' }),
      el('div', {}, [removeBtn]),
    ]),
  ]);
}

function renderEmpty() {
  return el('div', { class: 'cart-empty' }, [
    el('p', { class: 'empty-icon', 'aria-hidden': 'true' }, ['—']),
    el('h1', { class: 'page-title', text: 'Tu pedido está vacío' }),
    el('p', { class: 'empty-text', text: 'Agregá perfumes desde el catálogo y después volvé acá para consultarlo por WhatsApp.' }),
    el('a', { class: 'btn btn-gold btn-lg', href: '#/catalogo', text: 'Ir al catálogo' }),
    el('p', { class: 'cart-consult', text: '¿Tenés dudas sobre el catálogo?' }),
    el('a', {
      class: 'btn btn-whatsapp',
      href: waLink(genericMessage()),
      target: '_blank',
      rel: 'noopener noreferrer',
      text: 'Consultar por WhatsApp',
    }),
  ]);
}

function countText(rows) {
  const units = count();
  const kinds = rows.length;
  return `${units} ${units === 1 ? 'unidad' : 'unidades'} · ${kinds} ${kinds === 1 ? 'fragancia' : 'fragancias'}`;
}

function renderError(container) {
  setTitle(`Tu pedido | ${CATALOG_NAME}`);
  clearNode(container);
  container.appendChild(
    el('section', { class: 'error-state', role: 'alert' }, [
      el('h1', { class: 'page-title', text: 'No se pudo cargar tu pedido' }),
      el('p', { class: 'empty-text', text: 'Verificá que el sitio se sirva desde un servidor web (no basta abrir index.html desde el disco).' }),
      el('button', {
        type: 'button',
        class: 'btn btn-outline',
        onclick: () => window.location.reload(),
        text: 'Reintentar',
      }),
    ])
  );
}