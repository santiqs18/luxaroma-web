import { PAGE_SIZE, CATALOG_NAME } from '../config/config.js';
import { loadProducts, getFacets, filterAndSort } from '../data/store.js';
import { renderFilterPanel } from '../components/filters.js';
import { renderProductCard } from '../components/product-card.js';
import { genderLabel } from '../utils/format.js';
import { el, clear, setHidden } from '../utils/dom.js';
import { setTitle } from '../utils/seo.js';

let pageKey = 0; // invalida renders anteriores si la ruta cambia muy rápido.

/**
 * Página Catálogo: búsqueda + filtros + orden + carga progresiva.
 * params.gender llega de la navegación Hombre/Mujer/Unisex.
 * query.q llega del buscador del header.
 */
export async function renderCatalogPage(container, params = {}, query = {}) {
  const key = ++pageKey;
  setTitle(`Catálogo de Perfumes | ${CATALOG_NAME}`);

  clear(container);
  container.appendChild(
    el('div', { class: 'page-loading', role: 'status', 'aria-live': 'polite' }, ['Cargando catálogo…'])
  );

  let products;
  try {
    products = await loadProducts();
  } catch (err) {
    if (key !== pageKey) return;
    console.error(err);
    renderError(container, err.message);
    return;
  }
  if (key !== pageKey) return;

  const state = {
    q: typeof query.q === 'string' ? query.q : '',
    gender: params.gender || null,
    brand: 'all',
    family: 'all',
    category: 'all',
    availability: 'all',
    sort: 'featured',
  };

  const resultsEl = el('p', { class: 'results-info', role: 'status', 'aria-live': 'polite' });
  const grid = el('div', { class: 'product-grid' });
  const emptyEl = buildEmptyState(() => panel.reset());
  const loadBtn = el('button', {
    type: 'button',
    class: 'btn btn-outline load-more',
    hidden: true,
    onclick: loadMore,
    text: 'Cargar más perfumes',
  });

  const heading =
    state.gender === 'hombre' || state.gender === 'mujer' || state.gender === 'unisex'
      ? `Perfumes de ${genderLabel(state.gender)}`
      : 'Catálogo';

  const panel = renderFilterPanel(getFacets(), state, (next) => {
    Object.assign(state, next);
    renderPage();
  });

  clear(container);
  container.appendChild(
    el('section', { class: 'catalog' }, [
      el('div', { class: 'container' }, [
        el('header', { class: 'page-head' }, [
          el('h1', { class: 'page-title', text: heading }),
          el('p', {
            class: 'page-sub',
            text: 'Buscá por nombre, marca, familia o género. Filtrá y ordená combinando opciones.',
          }),
        ]),
        panel.node,
        el('div', { class: 'catalog-bar' }, [resultsEl]),
        grid,
        el('div', { class: 'load-more-wrap' }, [loadBtn]),
        emptyEl,
      ]),
    ])
  );

  renderPage();

  // Si llegó una búsqueda del header, deja el foco en el buscador.
  if (state.q) panel.focus();

  /**
   * Filtra todo el catálogo en memoria y renderiza el primer lote.
   * Con ~1000 productos esto es del orden de los milisegundos.
   */
  function renderPage() {
    const results = filterAndSort(state);
    const count = results.length;
    resultsEl.textContent =
      count === 0
        ? 'Sin resultados'
        : `${count} ${count === 1 ? 'perfume' : 'perfumes'} encontrados`;

    if (count === 0) {
      clear(grid);
      setHidden(loadBtn, true);
      setHidden(emptyEl, false);
      return;
    }

    setHidden(emptyEl, true);
    clear(grid);
    const slice = results.slice(0, PAGE_SIZE);
    for (const p of slice) grid.appendChild(renderProductCard(p));
    setHidden(loadBtn, count <= slice.length);
  }

  function loadMore() {
    const total = filterAndSort(state);
    const current = grid.children.length;
    const slice = total.slice(current, current + PAGE_SIZE);
    for (const p of slice) grid.appendChild(renderProductCard(p));
    setHidden(loadBtn, total.length <= grid.children.length);
  }
}

function buildEmptyState(onReset) {
  return el('div', { class: 'empty-state', hidden: true }, [
    el('p', { class: 'empty-icon', 'aria-hidden': 'true' }, ['—']),
    el('h2', { class: 'empty-title', text: 'No se encontraron perfumes' }),
    el('p', {
      class: 'empty-text',
      text: 'Probá con otra búsqueda o quitá algunos filtros para ver más resultados.',
    }),
    el('button', { type: 'button', class: 'btn btn-outline', onclick: onReset, text: 'Limpiar filtros' }),
  ]);
}

function renderError(container, message) {
  clear(container);
  container.appendChild(
    el('section', { class: 'catalog error-state', role: 'alert' }, [
      el('h1', { class: 'page-title', text: 'No se pudo cargar el catálogo' }),
      el('p', { class: 'empty-text', text: message }),
      el('p', {
        class: 'empty-text',
        text: 'Verificá que data/products.json exista y que el sitio se sirva desde un servidor web (no basta abrir el archivo local directamente).',
      }),
      el('button', {
        type: 'button',
        class: 'btn btn-outline',
        onclick: () => window.location.reload(),
        text: 'Intentar de nuevo',
      }),
    ])
  );
}