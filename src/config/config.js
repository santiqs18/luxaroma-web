/**
 * CONFIGURACIÓN CENTRAL DEL CATÁLOGO
 * Toda la configuración global vive en este único archivo.
 */

/** Nombre del catálogo (logo/nombre de marca). */
export const CATALOG_NAME = 'LuxAroma Parfum';

/** Descripción corta para el hero y el footer. */
export const CATALOG_TAGLINE = 'Catálogo de perfumes';

/** URL del archivo de productos (relativa al índice). */
export const PRODUCTS_URL = 'data/products.json';

/**
 * NÚMERO DE WHATSAPP (con código de país, sin +, espacios ni guiones).
 * Se usa en TODO el proyecto. Cambialo acá una sola vez.
 * Ejemplo Argentina: "5491123456789"
 */
export const WHATSAPP_NUMBER = '542646222644';

/** Moneda usada para formatear precios (código ISO 4217). */
export const CURRENCY = 'ARS';

/** Locale para el formato de precios y textos. */
export const LOCALE = 'es-AR';

/** Cantidad de productos por lote en la carga progresiva. */
export const PAGE_SIZE = 12;

/** Imagen de respaldo cuando falta o falla la foto de un producto. */
export const FALLBACK_IMG = 'images/placeholders/placeholder.svg';

/** Mensaje de contacto genérico para el botón de WhatsApp del header. */
export const WHATSAPP_MESSAGE = 'Hola, quisiera información sobre los perfumes de su catálogo.';