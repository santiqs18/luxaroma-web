import { WHATSAPP_NUMBER, WHATSAPP_MESSAGE } from '../config/config.js';

/**
 * Genera el enlace wa.me con el mensaje correctamente codificado.
 * El número se lee de config.js (UN solo lugar).
 */
export function waLink(message) {
  const text = encodeURIComponent(message);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
}

/** Mensaje de consulta desde la tarjeta del catálogo. */
export function productCardMessage(product) {
  return `Hola, quisiera consultar por el perfume ${product.name} de ${product.brand}.`;
}

/** Mensaje de consulta desde la vista de detalle. */
export function productDetailMessage(product, qty = 1) {
  const cantidad = qty > 1 ? ` x${qty} unidades` : '';
  return `Hola, quisiera consultar disponibilidad y precio de ${product.name} de ${product.brand}${cantidad}.`;
}

/** Mensaje genérico del header/footer. */
export function genericMessage() {
  return WHATSAPP_MESSAGE;
}

/**
 * Mensaje de pedido armado desde el carrito.
 * entries: [{ name, size, qty, price }] con price ya formateado (o null).
 * totalText: total formateado (o null si hay ítems sin precio).
 */
export function orderMessage(entries, totalText) {
  const lines = entries
    .map((e, i) => {
      const size = e.size ? ` (${e.size})` : '';
      const qty = e.qty && e.qty > 1 ? ` x${e.qty}` : '';
      const price = e.price || 'Consultar precio';
      return `${i + 1}. ${e.name}${size}${qty} — ${price}`;
    })
    .join('\n');
  const total = totalText ? `\n\nTotal: ${totalText}` : '';
  return `Hola, te dejo mi pedido:\n\n${lines}${total}\n\n¿Me confirmás disponibilidad y envío? Gracias.`;
}

/** Abre WhatsApp en una pestaña nueva. */
export function openWhatsApp(message) {
  window.open(waLink(message), '_blank', 'noopener,noreferrer');
}