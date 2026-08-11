import { CATALOG_NAME } from '../config/config.js';
import { waLink, genericMessage } from '../utils/whatsapp.js';
import { el } from '../utils/dom.js';

/** Footer con navegación, datos de contacto y créditos. */
export function renderFooter() {
  const year = new Date().getFullYear();

  const columns = el('div', { class: 'footer-grid' }, [
    el('div', { class: 'footer-col' }, [
      el('p', { class: 'footer-brand', text: CATALOG_NAME }),
      el('p', {
        class: 'footer-text',
        text: 'Catálogo online de perfumes. Consultá disponibilidad y precios por WhatsApp.',
      }),
    ]),
    el('nav', { class: 'footer-col', 'aria-label': 'Navegación del pie de página' }, [
      el('h2', { class: 'footer-title', text: 'Navegación' }),
      el('ul', { class: 'footer-links' }, [
        footerLink('#/', 'Inicio'),
        footerLink('#/catalogo', 'Catálogo'),
        footerLink('#/catalogo/hombre', 'Perfumes de hombre'),
        footerLink('#/catalogo/mujer', 'Perfumes de mujer'),
        footerLink('#/catalogo/unisex', 'Perfumes unisex'),
      ]),
    ]),
    el('div', { class: 'footer-col' }, [
      el('h2', { class: 'footer-title', text: 'Contacto' }),
      el('ul', { class: 'footer-links' }, [
        el('li', {}, [
          el('a', {
            class: 'footer-link',
            href: waLink(genericMessage()),
            target: '_blank',
            rel: 'noopener noreferrer',
            text: 'Escribinos por WhatsApp',
          }),
        ]),
      ]),
    ]),
  ]);

  return el('footer', { class: 'site-footer' }, [
    el('div', { class: 'container' }, [
      columns,
      el('p', { class: 'footer-copy' }, [
        `© ${year} ${CATALOG_NAME}. Catálogo informativo — las ventas se gestionan por WhatsApp.`,
      ]),
    ]),
  ]);
}

function footerLink(href, label) {
  return el('li', {}, [el('a', { href, class: 'footer-link', text: label })]);
}