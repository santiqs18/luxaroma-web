/**
 * Router mínimo basado en hash (#/...). Funciona en cualquier host estático
 * (GitHub Pages, Netlify, Vercel, Cloudflare Pages) sin reescrituras del
 * servidor, a la vez que permite deep-links como #/perfume/perfume-001.
 */

const DETAIL_RE = /^\/perfume\/([^/]+)$/;

export function parseHash() {
  let hash = window.location.hash || '#/';
  if (!hash.startsWith('#')) hash = '#' + hash;
  let route = hash.slice(1) || '/';

  let query = {};
  const qIndex = route.indexOf('?');
  if (qIndex !== -1) {
    const qs = route.slice(qIndex + 1);
    route = route.slice(0, qIndex);
    query = Object.fromEntries(new URLSearchParams(qs));
  }

  if (route === '' || route === '/') {
    return { name: 'home', params: {}, query };
  }

  const detail = route.match(DETAIL_RE);
  if (detail) {
    return { name: 'perfume', params: { id: detail[1] }, query };
  }

  if (route === '/catalogo') {
    return { name: 'catalogo', params: {}, query };
  }

  if (route === '/carrito') {
    return { name: 'carrito', params: {}, query };
  }

  const genero = route.match(/^\/catalogo\/(hombre|mujer|unisex)$/);
  if (genero) {
    return { name: 'catalogo', params: { gender: genero[1] }, query };
  }

  // Ruta desconocida → home.
  return { name: 'home', params: {}, query };
}

/** Navega a una ruta hash. */
export function navigate(path) {
  window.location.hash = path;
}

/**
 * Registra el router: llama a onRoute() ante cada cambio de hash
 * y de vuelta inicial. Devuelve una función para quitar el listener.
 */
export function initRouter(onRoute) {
  const handler = () => onRoute(parseHash());
  window.addEventListener('hashchange', handler);
  handler(); // render inicial
  return () => window.removeEventListener('hashchange', handler);
}