/**
 * Helpers DOM seguros: construyen nodos con textContent (ningún contenido
 * dinámico pasa por innerHTML), lo que evita XSS proveniente del JSON.
 */

/**
 * Crea un elemento del DOM con atributos y/o hijos.
 * - Los strings se insertan SIEMPRE como textContent.
 * - Para fragmentos estáticos (sin datos del usuario) se puede pasar un
 *   array de nodos o usar `innerHTML` a mano en componentes fijos.
 */
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);

  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined) continue;
    if (key === 'class') {
      node.className = Array.isArray(value) ? value.filter(Boolean).join(' ') : value;
    } else if (key === 'text') {
      node.textContent = value;
    } else if (key === 'html') {
      // SOLO para HTML estático propio (sin datos dinámicos).
      node.innerHTML = value;
    } else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2), value);
    } else if (key === 'dataset') {
      Object.assign(node.dataset, value);
    } else {
      node.setAttribute(key, value);
    }
  }

  appendChildren(node, children);
  return node;
}

function appendChildren(node, children) {
  if (!children) return;
  const list = Array.isArray(children) ? children : [children];
  for (const child of list) {
    if (child === null || child === undefined) continue;
    if (typeof child === 'string' || typeof child === 'number') {
      node.appendChild(document.createTextNode(String(child)));
    } else if (child instanceof Node) {
      node.appendChild(child);
    }
  }
}

/** Vacía un elemento. */
export function clear(node) {
  node.replaceChildren();
}

/** Enfoca un input y coloca el cursor al final (para el buscador). */
export function focusInput(input, value) {
  input.value = value || '';
  input.focus();
  const len = input.value.length;
  try {
    input.setSelectionRange(len, len);
  } catch {
    /* los campos tipo search lo soportan */
  }
}

/** Muestra u oculta el atributo `hidden` de forma compatible con display. */
export function setHidden(node, hidden) {
  node.hidden = hidden;
}