import { PRODUCTS_URL } from '../config/config.js';
import { fetchJson } from '../utils/network.js';
import { normalize, genderLabel } from '../utils/format.js';

/**
 * Capa de datos: carga data/products.json una sola vez, normaliza los
 * productos, construye índices (búsqueda + facetas) en memoria y expone
 * operaciones de filtrado/ordenamiento pensadas para miles de items.
 */

let products = null;       // Product[] normalizados
let byId = new Map();      // id -> Product
let searchIndex = {};      // id -> texto normalizado para búsqueda
let facets = null;         // { brands, families, categories }
let loadPromise = null;

const GENDERS = ['hombre', 'mujer', 'unisex'];

/** Normaliza un género a su forma canónica. */
function normalizeGender(g) {
  const key = normalize(g || '');
  if (key.includes('mujer') || key === 'female' || key === 'femenino') return 'mujer';
  if (key.includes('unisex')) return 'unisex';
  if (key.includes('hombre') || key === 'male' || key === 'masculino') return 'hombre';
  // Por defecto, unisex si no se puede inferir.
  return 'unisex';
}

/** Convierte un objeto crudo del JSON en un Product canónico. */
function normalizeProduct(raw, index) {
  const priceRaw = raw.price;
  const price = typeof priceRaw === 'number' && Number.isFinite(priceRaw) ? priceRaw : null;

  const p = {
    id: String(raw.id ?? `perfume-${String(index + 1).padStart(3, '0')}`),
    name: String(raw.name ?? 'Perfume'),
    brand: String(raw.brand ?? 'Sin marca'),
    gender: normalizeGender(raw.gender),
    // "category" es la concentración (EDP, EDT...). Se acepta también
    // "concentration" como alias por compatibilidad.
    category: String(raw.category ?? raw.concentration ?? ''),
    family: String(raw.family ?? ''),
    size: String(raw.size ?? ''),
    price,
    // Se quita la barra inicial para que las rutas relativas funcionen
    // también si el sitio se publica en un subpath (GitHub Pages).
    image: String(raw.image ?? '').replace(/^\/+/, ''),
    available: raw.available !== false,
    popular: raw.popular === true,
    description: String(raw.description ?? ''),
    notes: Array.isArray(raw.notes) ? raw.notes.map(String) : [],
  };
  return p;
}

function buildIndices(list) {
  byId = new Map();
  searchIndex = {};
  const brandSet = new Set();
  const familySet = new Set();
  const categorySet = new Set();

  for (const p of list) {
    if (byId.has(p.id)) {
      console.warn(`[store] ID duplicado en products.json: "${p.id}". Se ignora el repetido.`);
      continue;
    }
    byId.set(p.id, p);
    searchIndex[p.id] = [
      normalize(p.name),
      normalize(p.brand),
      normalize(p.family),
      normalize(p.category),
      genderLabel(p.gender),
      ...p.notes.map(normalize),
    ]
      .filter(Boolean)
      .join(' ');

    if (p.brand) brandSet.add(p.brand);
    if (p.family) familySet.add(p.family);
    if (p.category) categorySet.add(p.category);
  }

  facets = {
    brands: [...brandSet].sort((a, b) => normalize(a).localeCompare(normalize(b))),
    families: [...familySet].sort((a, b) => normalize(a).localeCompare(normalize(b))),
    categories: [...categorySet].sort((a, b) => normalize(a).localeCompare(normalize(b))),
  };
}

/** Carga los productos (una sola vez) y devuelve la lista completa. */
export async function loadProducts() {
  if (products) return products;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const raw = await fetchJson(PRODUCTS_URL);
    const list = Array.isArray(raw)
      ? raw
      : Array.isArray(raw.products)
        ? raw.products
        : [];
    products = list.map(normalizeProduct);
    buildIndices(products);
    return products;
  })();

  return loadPromise;
}

/** Devuelve todos los productos (asume que ya se llamó a loadProducts). */
export function getAllProducts() {
  return products || [];
}

/** Busca un producto por id. */
export function getById(id) {
  return byId.get(String(id));
}

/** Devuelve el índice de búsqueda (id -> texto normalizado). */
export function getSearchIndex() {
  return searchIndex;
}

/** Devuelve las facetas (marcas, familias, concentraciones únicas). */
export function getFacets() {
  return facets || { brands: [], families: [], categories: [] };
}

export { GENDERS };

/**
 * Aplica filtros + búsqueda + ordenamiento sobre la lista completa.
 * state: { q, gender, brand, family, category, availability, sort }
 * Devuelve un array nuevo (no muta el original).
 */
export function filterAndSort(state = {}) {
  if (!products) return [];

  const q = normalize(state.q || '').trim();
  const qTokens = q ? q.split(/\s+/).filter(Boolean) : [];
  const gender = state.gender || null;
  const brand = state.brand || 'all';
  const family = state.family || 'all';
  const category = state.category || 'all';
  const availability = state.availability || 'all';
  const sort = state.sort || 'featured';

  const result = [];

  for (const p of products) {
    if (gender && p.gender !== gender) continue;
    if (brand !== 'all' && p.brand !== brand) continue;
    if (family !== 'all' && p.family !== family) continue;
    if (category !== 'all' && p.category !== category) continue;
    if (availability === 'available' && !p.available) continue;
    if (availability === 'agotado' && p.available) continue;
    if (qTokens.length && !qTokens.every((t) => searchIndex[p.id].includes(t))) continue;
    result.push(p);
  }

  sortProducts(result, sort);
  return result;
}

function nameKey(name) {
  return normalize(name).replace(/\s+/g, ' ');
}

function compareNames(a, b) {
  return nameKey(a.name).localeCompare(nameKey(b.name), 'es');
}

function comparePrice(a, b) {
  const hasA = a.price !== null;
  const hasB = b.price !== null;
  if (hasA && hasB) return a.price - b.price;
  if (hasA) return -1; // A con precio primero
  if (hasB) return 1;  // B con precio primero
  return 0;            // ambos sin precio
}

function sortProducts(arr, sort) {
  switch (sort) {
    case 'name-az':
      arr.sort(compareNames);
      break;
    case 'name-za':
      arr.sort((a, b) => compareNames(b, a));
      break;
    case 'price-asc':
      arr.sort(comparePrice);
      break;
    case 'price-desc':
      arr.sort((a, b) => comparePrice(b, a));
      break;
    default: // "featured": populares primero, luego disponibles, luego por id.
      arr.sort(
        (a, b) =>
          Number(b.popular) - Number(a.popular) ||
          Number(b.available) - Number(a.available) ||
          a.id.localeCompare(b.id)
      );
  }
}