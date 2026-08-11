import { renderHeader } from './components/header.js';
import { renderFooter } from './components/footer.js';
import { initRouter } from './utils/router.js';
import { renderHomePage } from './pages/home.js';
import { renderCatalogPage } from './pages/catalog.js';
import { renderDetailPage } from './pages/detail.js';
import { renderCartPage } from './pages/cart.js';
import { removeJsonLd } from './utils/seo.js';
import { clear } from './utils/dom.js';

/** Punto de entrada: arma la estructura fija y arranca el router. */

const app = document.getElementById('app');
clear(app);

const header = renderHeader();
const mainContainer = document.createElement('main');
mainContainer.id = 'main';
mainContainer.tabIndex = -1;

app.appendChild(header.node);
app.appendChild(mainContainer);
app.appendChild(renderFooter());

let routeKey = 0;

async function onRoute(route) {
  const key = ++routeKey;

  // El JSON-LD de producto solo es válido en la vista de detalle.
  if (route.name !== 'perfume') removeJsonLd();

  // Si dos navegaciones ocurren casi a la vez, solo renderiza la última.
  switch (route.name) {
    case 'catalogo':
      await renderCatalogPage(mainContainer, route.params, route.query);
      break;
    case 'perfume':
      await renderDetailPage(mainContainer, route.params);
      break;
    case 'carrito':
      await renderCartPage(mainContainer);
      break;
    default:
      await renderHomePage(mainContainer);
  }

  if (key !== routeKey) return;
  header.updateActive(window.location.hash);
  window.scrollTo({ top: 0, behavior: 'auto' });
}

initRouter(onRoute);