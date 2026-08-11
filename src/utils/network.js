/**
 * Utilidades de red: debounce y carga de JSON con manejo de errores.
 */

/**
 * Debounce: retrasa la ejecución hasta que la entrada se detenga.
 * Evita recalcular la búsqueda/filtros en cada tecla.
 */
export function debounce(fn, delay = 200) {
  let timer = null;
  const debounced = (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
  debounced.cancel = () => clearTimeout(timer);
  return debounced;
}

/**
 * Descarga un JSON con caché básica en memoria y timeout.
 * Devuelve el objeto parseado o lanza un error legible.
 */
const cache = new Map();

export async function fetchJson(url) {
  if (cache.has(url)) return cache.get(url);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`No se pudo cargar ${url} (${res.status})`);
    }
    const data = await res.json();
    cache.set(url, data);
    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Tiempo de espera agotado al cargar ${url}`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}