/**
 * Carrito de pedidos (lista de productos).
 * Se guarda en localStorage para que el pedido persista entre sesiones y se
 * envíe por WhatsApp desde la página de carrito. Cada cambio notifica a los
 * suscriptores (usado por el contador del header).
 */

const STORAGE_KEY = 'luxaroma_carrito_v1';

let items = load();
const listeners = new Set();

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(raw)) {
      return raw.filter((it) => it && typeof it.id === 'string' && Number.isFinite(it.qty) && it.qty > 0);
    }
  } catch (e) {
    /* datos corruptos → carrito vacío */
  }
  return [];
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    /* storage lleno o no disponible: el carrito sigue en memoria */
  }
  emit();
}

function emit() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      /* un listener no debe romper el resto */
    }
  });
}

/** Suscribe una función a los cambios del carrito. Devuelve unsub. */
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Devuelve una copia de los ítems [{ id, qty }]. */
export function getItems() {
  return items.map((it) => ({ ...it }));
}

/** Devuelve el ítem de un id, o null. */
export function getItem(id) {
  return items.find((it) => it.id === id) || null;
}

/** Agrega un producto (o suma cantidad si ya estaba). Dispara cambios. */
export function add(id, qty = 1) {
  const existing = items.find((it) => it.id === id);
  if (existing) {
    existing.qty += qty;
  } else {
    items.push({ id, qty });
  }
  save();
}

/** Fija la cantidad de un id; con qty <= 0 lo elimina. */
export function setQty(id, qty) {
  const existing = items.find((it) => it.id === id);
  if (!existing) return;
  if (qty <= 0) {
    items = items.filter((it) => it.id !== id);
  } else {
    existing.qty = qty;
  }
  save();
}

/** Elimina un producto del pedido. */
export function remove(id) {
  items = items.filter((it) => it.id !== id);
  save();
}

/** Vacía el pedido. */
export function clear() {
  items = [];
  save();
}

/** Cantidad total de unidades (suma de qty). */
export function count() {
  return items.reduce((acc, it) => acc + it.qty, 0);
}

/** ¿El carrito está vacío? */
export function isEmpty() {
  return items.length === 0;
}