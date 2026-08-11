import { FALLBACK_IMG } from '../config/config.js';
import { formatPrice } from '../utils/format.js';
import { waLink, productCardMessage } from '../utils/whatsapp.js';
import { add as cartAdd } from '../data/cart.js';
import { el } from '../utils/dom.js';

/**
 * Tarjeta de producto: imagen lazy, marca, nombre, familia, precio y estado.
 * Toda la tarjeta (salvo el botón) lleva al detalle.
 */
export function renderProductCard(p) {
  const priceText = formatPrice(p.price) ?? 'Consultar precio';

  const img = el('img', {
    src: p.image,
    alt: `Perfume ${p.name} de ${p.brand} — ${p.family}`,
    loading: 'lazy',
    decoding: 'async',
    width: '600',
    height: '750',
  });
  img.addEventListener('error', () => {
    if (img.dataset.fallback) return;
    img.dataset.fallback = '1';
    img.src = FALLBACK_IMG;
  });

  const priceEl = el('span', {
    class: ['price', p.price === null && 'price-muted'].filter(Boolean).join(' ').trim(),
  });
  priceEl.textContent =
    p.price === null ? 'Consultar precio' : priceText;

  const statusClass = p.available ? 'badge-available' : 'badge-soldout';
  const statusText = p.available ? 'Disponible' : 'Agotado';

  const waLinkEl = el('a', {
    class: 'btn btn-whatsapp card-wa',
    href: waLink(productCardMessage(p)),
    target: '_blank',
    rel: 'noopener noreferrer',
    'aria-label': `Consultar por ${p.name} de ${p.brand} en WhatsApp`,
    text: 'Consultar por WhatsApp',
  });

  const addBtn = el('button', {
    type: 'button',
    class: 'btn btn-outline card-add',
    'aria-label': `Agregar ${p.name} de ${p.brand} al pedido`,
    text: 'Agregar al pedido',
  });
  addBtn.addEventListener('click', () => {
    cartAdd(p.id, 1);
    addBtn.textContent = 'Agregado ✓';
    addBtn.classList.add('btn-added');
    addBtn.disabled = true;
    setTimeout(() => {
      addBtn.textContent = 'Agregar al pedido';
      addBtn.classList.remove('btn-added');
      addBtn.disabled = false;
    }, 1200);
  });

  const detailHref = `#/perfume/${encodeURIComponent(p.id)}`;

  const card = el('article', { class: 'product-card' }, [
    el('a', { href: detailHref, class: 'card-image', tabindex: '-1', 'aria-hidden': 'true' }, [img]),
    el('div', { class: 'card-body' }, [
      el('span', { class: 'card-brand', text: p.brand }),
      el('a', { href: detailHref, class: 'card-name', text: p.name }),
      el('p', { class: 'card-meta' }, [
        el('span', { text: p.family }),
        p.size ? el('span', { class: 'card-size', text: p.size }) : null,
      ]),
      el('div', { class: 'card-row' }, [
        priceEl,
        el('span', { class: `badge ${statusClass}`, text: statusText, 'aria-label': `Estado: ${statusText}` }),
      ]),
      waLinkEl,
      addBtn,
    ]),
  ]);

  return card;
}