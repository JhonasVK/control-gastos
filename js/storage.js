(function () {
  const STORAGE_KEY = 'control-gastos:v1';

  const CATEGORIAS_DEFAULT = [
    'Pago cuenta especial', 'Pan', 'Supermercado', 'Tarjeta de crédito',
    'Mercado Libre', 'Transporte', 'Alimentación', 'Hogar', 'Servicios', 'Otros'
  ];

  const MESES_NOMBRE = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  function mesActualKey(date) {
    const d = date || new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }

  function nombreMes(key) {
    const [y, m] = key.split('-').map(Number);
    return `${MESES_NOMBRE[m - 1]} ${y}`;
  }

  function siguienteMesKey(key) {
    const [y, m] = key.split('-').map(Number);
    if (m === 12) return `${y + 1}-01`;
    return `${y}-${String(m + 1).padStart(2, '0')}`;
  }

  function getState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function setState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function crearEstadoInicial(salarioInicial) {
    const mesKey = mesActualKey();
    return {
      version: 1,
      categorias: [...CATEGORIAS_DEFAULT],
      mesActivo: mesKey,
      meses: {
        [mesKey]: {
          salarioInicial,
          cerrado: false,
          cerradoEn: null,
          gastos: []
        }
      },
      presupuestos: [],
      tarjetas: [],
      metas: []
    };
  }

  window.Storage = {
    getState,
    setState,
    crearEstadoInicial,
    mesActualKey,
    nombreMes,
    siguienteMesKey,
    CATEGORIAS_DEFAULT
  };
})();
