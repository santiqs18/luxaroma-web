/**
 * Utilidades de SEO dinámico: título, Open Graph y datos estructurados.
 * Se actualizan al navegar para que cada producto tenga metadatos propios.
 */

export function setTitle(title) {
  document.title = title;
}

export function setMetaName(name, content) {
  let meta = document.querySelector(`meta[name="${name}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', name);
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
}

export function setMetaProperty(property, content) {
  let meta = document.querySelector(`meta[property="${property}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('property', property);
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
}

let jsonldId = 'page-jsonld';

/** Reemplaza el JSON-LD dinámico de la página (p. ej. un producto). */
export function setJsonLd(data, id = 'page-jsonld', clearPreviousId = jsonldId) {
  if (clearPreviousId && clearPreviousId !== id) {
    const prev = document.getElementById(clearPreviousId);
    if (prev) prev.remove();
  }
  jsonldId = id;
  let script = document.getElementById(id);
  if (!script) {
    script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = id;
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
}

/** Elimina el JSON-LD dinámico (cuando se sale de un detalle). */
export function removeJsonLd(id = jsonldId) {
  document.getElementById(id)?.remove();
}

/** Configura las metaetiquetas Open Graph de una página. */
export function setOgPage({ title, description, url, image }) {
  if (title) {
    setMetaProperty('og:title', title);
    setMetaName('twitter:title', title);
  }
  if (description) {
    setMetaProperty('og:description', description);
    setMetaName('twitter:description', description);
  }
  if (url) setMetaProperty('og:url', url);
  if (image) {
    setMetaProperty('og:image', image);
    setMetaName('twitter:image', image);
  }
}