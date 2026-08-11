import { debounce } from '../utils/network.js';
import { el, focusInput, setHidden } from '../utils/dom.js';

const GENDERS = [
  { value: '', label: 'Todos' },
  { value: 'hombre', label: 'Hombre' },
  { value: 'mujer', label: 'Mujer' },
  { value: 'unisex', label: 'Unisex' },
];

const SORTS = [
  { value: 'featured', label: 'Destacados' },
  { value: 'name-az', label: 'Nombre A-Z' },
  { value: 'name-za', label: 'Nombre Z-A' },
  { value: 'price-asc', label: 'Precio: menor a mayor' },
  { value: 'price-desc', label: 'Precio: mayor a menor' },
];

const AVAILABILITY = [
  { value: 'all', label: 'Cualquier estado' },
  { value: 'available', label: 'Disponibles' },
  { value: 'agotado', label: 'Agotados' },
];

function selectOption(text, value) {
  return el('option', { value, text });
}

/**
 * Panel de filtros + buscador + ordenamiento.
 * state  -> estado actual { q, gender, brand, family, category, availability, sort }
 * onChange(state) -> se llama ante cada cambio (search con debounce).
 */
export function renderFilterPanel(facets, state, onChange) {
  const debounceChange = debounce(() => emit(), 220);

  const searchInput = el('input', {
    type: 'search',
    id: 'search-input',
    name: 'q',
    placeholder: 'Buscar por nombre, marca, familia o género…',
    autocomplete: 'off',
    'aria-label': 'Buscar en el catálogo',
    oninput: debounceChange,
  });

  const genderPills = GENDERS.map((g) =>
    el('button', {
      type: 'button',
      class: 'pill',
      'data-value': g.value,
      'aria-pressed': String(state.gender === g.value),
      onclick: (e) => {
        state.gender = e.currentTarget.dataset.value || '';
        syncGenderPills();
        emit();
      },
      text: g.label,
    })
  );

  const brandSelect = el('select', { id: 'filter-brand', 'aria-label': 'Filtrar por marca', onchange: emit }, [
    selectOption('Todas las marcas', 'all'),
    ...facets.brands.map((b) => selectOption(b, b)),
  ]);

  const familySelect = el('select', { id: 'filter-family', 'aria-label': 'Filtrar por familia olfativa', onchange: emit }, [
    selectOption('Todas las familias', 'all'),
    ...facets.families.map((f) => selectOption(f, f)),
  ]);

  const categorySelect = el('select', { id: 'filter-category', 'aria-label': 'Filtrar por concentración', onchange: emit }, [
    selectOption('Todas las concentraciones', 'all'),
    ...facets.categories.map((c) => selectOption(c, c)),
  ]);

  const availabilitySelect = el('select', { id: 'filter-availability', 'aria-label': 'Filtrar por disponibilidad', onchange: emit }, [
    ...AVAILABILITY.map((a) => selectOption(a.label, a.value)),
  ]);

  const sortSelect = el('select', { id: 'filter-sort', 'aria-label': 'Ordenar productos', onchange: emit }, [
    ...SORTS.map((s) => selectOption(s.label, s.value)),
  ]);

  const resetBtn = el('button', { type: 'button', class: 'btn btn-ghost', hidden: true, onclick: reset }, [
    'Limpiar filtros',
  ]);

  function syncGenderPills() {
    genderPills.forEach((btn) => {
      btn.setAttribute('aria-pressed', String(btn.dataset.value === state.gender));
    });
  }

  function readControls() {
    state.q = searchInput.value;
    state.gender = state.gender || '';
    state.brand = brandSelect.value;
    state.family = familySelect.value;
    state.category = categorySelect.value;
    state.availability = availabilitySelect.value;
    state.sort = sortSelect.value;
  }

  function applyState() {
    searchInput.value = state.q || '';
    syncGenderPills();
    brandSelect.value = state.brand || 'all';
    familySelect.value = state.family || 'all';
    categorySelect.value = state.category || 'all';
    availabilitySelect.value = state.availability || 'all';
    sortSelect.value = state.sort || 'featured';
    updateResetVisibility();
  }

  function updateResetVisibility() {
    const hasFilters =
      (state.q || '').trim() !== '' ||
      !!state.gender ||
      state.brand !== 'all' ||
      state.family !== 'all' ||
      state.category !== 'all' ||
      state.availability !== 'all';
    setHidden(resetBtn, !hasFilters);
  }

  function reset() {
    state.q = '';
    state.gender = null;
    state.brand = 'all';
    state.family = 'all';
    state.category = 'all';
    state.availability = 'all';
    state.sort = 'featured';
    applyState();
    emit();
  }

  function emit() {
    readControls();
    updateResetVisibility();
    onChange({ ...state });
  }

  applyState();

  const field = (id, labelText, control) =>
    el('div', { class: 'field' }, [
      el('label', { class: 'field-label', for: id, text: labelText }),
      control,
    ]);

  const panel = el('section', { class: 'filter-panel', 'aria-label': 'Filtros del catálogo' }, [
    el('div', { class: 'filter-search' }, [
      el('label', { class: 'sr-only', for: 'search-input', text: 'Buscar perfume' }),
      searchInput,
    ]),
    el('div', { class: 'filter-genders', role: 'group', 'aria-label': 'Filtrar por género' }, genderPills),
    el('div', { class: 'filter-grid' }, [
      field('filter-brand', 'Marca', brandSelect),
      field('filter-family', 'Familia olfativa', familySelect),
      field('filter-category', 'Concentración', categorySelect),
      field('filter-availability', 'Disponibilidad', availabilitySelect),
      field('filter-sort', 'Ordenar por', sortSelect),
    ]),
    el('div', { class: 'filter-actions' }, [resetBtn]),
  ]);

  return {
    node: panel,
    applyState,
    update,
    focus,
    getQueryInput: () => searchInput,
    reset,
  };

  /** Actualiza el panel ante un estado externo (ruta, header). */
  function update(newState) {
    if (newState.q !== undefined) state.q = newState.q;
    if (Object.prototype.hasOwnProperty.call(newState, 'gender')) {
      state.gender = newState.gender || null;
    }
    applyState();
  }

  function focus() {
    focusInput(searchInput, state.q || '');
  }
}