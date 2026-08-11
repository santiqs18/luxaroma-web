import { CATALOG_NAME, WHATSAPP_NUMBER } from '../config/config.js';
import { waLink, genericMessage } from '../utils/whatsapp.js';
import { el, setHidden } from '../utils/dom.js';
import { count as cartCount, subscribe as cartSubscribe } from '../data/cart.js';

const LINKS = [
  { href: '#/', label: 'Inicio' },
  { href: '#/catalogo', label: 'Catálogo' },
  { href: '#/catalogo/hombre', label: 'Hombre' },
  { href: '#/catalogo/mujer', label: 'Mujer' },
  { href: '#/catalogo/unisex', label: 'Unisex' },
];

/**
 * Header: logo, navegación, buscador, WhatsApp y menú responsive.
 * En <900px la navegación se colapsa en un menú (drawer) accesible.
 */
export function renderHeader() {
  let drawerOpen = false;

  const searchForm = () => buildSearchForm();
  const waBtn = () =>
    el('a', {
      class: 'btn btn-whatsapp header-wa',
      href: waLink(genericMessage()),
      target: '_blank',
      rel: 'noopener noreferrer',
      text: 'Consultar',
    });

  const cartBtn = () => {
    const badge = el('span', { class: 'cart-badge', 'aria-label': 'Cantidad de productos en el pedido', hidden: true });
    const link = el('a', {
      href: '#/carrito',
      class: 'btn btn-outline header-cart',
      'aria-label': 'Ver tu pedido',
    }, [
      cartIcon(),
      el('span', { class: 'header-cart-label', text: 'Pedido' }),
      badge,
    ]);

    const sync = () => {
      const n = cartCount();
      badge.textContent = String(n);
      setHidden(badge, n < 1);
    };
    cartSubscribe(sync);
    sync();
    return link;
  };

  const navDesktop = el('nav', { class: 'main-nav', 'aria-label': 'Navegación principal' }, [
    el('ul', { class: 'nav-list' }, LINKS.map((l) => el('li', {}, navLink(l)))),
  ]);

  const burger = el('button', {
    class: 'nav-toggle',
    type: 'button',
    'aria-expanded': 'false',
    'aria-controls': 'mobile-menu',
    'aria-label': 'Abrir menú de navegación',
    onclick: toggleDrawer,
  }, [burgerIcon()]);

  const drawer = el('div', { class: 'mobile-menu', id: 'mobile-menu', hidden: true }, [
    el('nav', { class: 'mobile-nav', 'aria-label': 'Navegación principal' }, [
      el('ul', { class: 'nav-list' }, LINKS.map((l) => el('li', {}, navLink(l)))),
    ]),
    el('div', { class: 'mobile-cta', 'aria-label': 'Acciones' }, [cartBtn(), waBtn()]),
  ]);

  const logo = el('a', { href: '#/', class: 'logo', 'aria-label': `${CATALOG_NAME} — inicio` }, [
    bottleMark(),
    el('span', { class: 'logo-text', text: CATALOG_NAME }),
  ]);

  const actions = el('div', { class: 'header-actions' }, [
    searchForm(),
    cartBtn(),
    waBtn(),
    burger,
  ]);

  const inner = el('div', { class: 'container header-inner' }, [logo, navDesktop, actions]);
  const header = el('header', { class: 'site-header' }, [inner, drawer]);

  // Aviso: recordá cargar tu número de WhatsApp real en config.js.
  const isDemoNumber =
    WHATSAPP_NUMBER === '5491123456789' || WHATSAPP_NUMBER.includes('0000000000');
  if (isDemoNumber) {
    header.appendChild(
      el('p', {
        class: 'config-notice',
        text: 'Configurá tu número de WhatsApp en src/config/config.js para que los botones funcionen.',
      })
    );
  }

  function toggleDrawer() {
    drawerOpen = !drawerOpen;
    document.body.classList.toggle('menu-open', drawerOpen);
    burger.setAttribute('aria-expanded', String(drawerOpen));
    setHidden(drawer, !drawerOpen);
    burger.setAttribute(
      'aria-label',
      drawerOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'
    );
    if (drawerOpen) {
      const input = drawer.querySelector('input[type="search"]');
      input?.focus();
    }
  }

  // Cierra el drawer con Esc.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawerOpen) toggleDrawer();
  });

  // Cierra el drawer al navegar.
  window.addEventListener('hashchange', () => {
    if (drawerOpen) toggleDrawer();
  });

  updateActive(window.location.hash);

  return { node: header, updateActive, getSearchInput: () => header.querySelector('input[type="search"]') };
}

function navLink(l) {
  return el('a', { href: l.href, class: 'nav-link', text: l.label });
}

function buildSearchForm() {
  const input = el('input', {
    type: 'search',
    name: 'q',
    placeholder: 'Buscar perfume, marca, familia…',
    autocomplete: 'off',
    'aria-label': 'Buscar perfume',
  });
  const form = el('form', { class: 'header-search', role: 'search', onsubmit: submitSearch }, [
    input,
    el('button', { class: 'header-search-btn', type: 'submit', 'aria-label': 'Buscar' }, [searchIcon()]),
  ]);

  function submitSearch(e) {
    e.preventDefault();
    const q = input.value.trim();
    window.location.hash = q
      ? `#/catalogo?q=${encodeURIComponent(q)}`
      : '#/catalogo';
  }

  return form;
}

/** Marca el enlace activo según la ruta hash actual (ignora query). */
function updateActive(hash) {
  let current = (hash || '#/').split('?')[0];
  if (current === '' || current === '#') current = '#/';
  document.querySelectorAll('.nav-link').forEach((a) => {
    const href = a.getAttribute('href');
    const active =
      href === current ||
      (href !== '#/' && href !== '#/catalogo' && current.startsWith(href));
    if (active) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

function bottleMark() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '22');
  svg.setAttribute('height', '22');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML =
    '<rect x="7" y="3" width="10" height="3" rx="1.2" fill="currentColor"/>' +
    '<path d="M6 9h12l1.2 10.2A1.8 1.8 0 0 1 17.4 21H6.6a1.8 1.8 0 0 1-1.8-1.8L6 9Z" fill="currentColor"/>';
  return svg;
}

function searchIcon() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '18');
  svg.setAttribute('height', '18');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML =
    '<circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/>' +
    '<path d="m16.5 16.5 4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
  return svg;
}

function burgerIcon() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '24');
  svg.setAttribute('height', '24');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML =
    '<path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
  return svg;
}

function cartIcon() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '18');
  svg.setAttribute('height', '18');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML =
    '<path d="M3 4h2l2 11h11l2-7H7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<circle cx="9.5" cy="20" r="1.4" fill="currentColor"/>' +
    '<circle cx="17.5" cy="20" r="1.4" fill="currentColor"/>';
  return svg;
}