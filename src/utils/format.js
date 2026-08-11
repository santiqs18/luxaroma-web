import { CURRENCY, LOCALE } from '../config/config.js';

const priceFormatter = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: CURRENCY,
  maximumFractionDigits: 0,
});

/** Formatea un precio. Devuelve null si no está definido. */
export function formatPrice(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return priceFormatter.format(value);
}

/** Etiqueta legible para el género. */
const GENDER_LABELS = {
  hombre: 'Hombre',
  mujer: 'Mujer',
  unisex: 'Unisex',
};

export function genderLabel(g) {
  return GENDER_LABELS[g] || g || '';
}

/** Normaliza texto para búsqueda (minúsculas + sin acentos). */
export function normalize(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}