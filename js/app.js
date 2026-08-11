(function () {
  const { getState, setState, crearEstadoInicial, nombreMes, siguienteMesKey } = window.Storage;
  const { totalGastado, disponible, resumenPorCategoria } = window.StateCalc;
  const { exportarCSV } = window.ExportCSV;

  let state = getState();
  let editandoGastoId = null;
  let categoriaSeleccionada = null;
  let historialMesKey = null;

  const $ = (id) => document.getElementById(id);

  function formatMoney(n) {
    return '$' + new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(Math.round(n || 0));
  }

  function formatDate(iso) {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  function hoyISO() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function escapeHTML(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function escapeAttr(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function show(id) {
    document.querySelectorAll('.screen').forEach((el) => el.classList.add('hidden'));
    $(id).classList.remove('hidden');
    window.scrollTo(0, 0);
  }

  function mesActivo() {
    return state.meses[state.mesActivo];
  }

  // ---------- Init ----------
  function init() {
    bindEvents();
    if (!state) {
      state = crearEstadoInicial(0);
      setState(state);
    }
    renderMain();
    show('view-main');
  }

  function bindEvents() {
    $('card-saldo-inicial').addEventListener('click', onEditarSaldoInicial);

    $('btn-agregar-gasto').addEventListener('click', () => abrirFormGasto(null));
    $('btn-cerrar-gasto').addEventListener('click', () => { renderMain(); show('view-main'); });
    $('form-gasto').addEventListener('submit', onGuardarGasto);
    $('btn-eliminar-gasto').addEventListener('click', onEliminarGastoActual);

    $('btn-historial').addEventListener('click', abrirHistorial);
    $('btn-cerrar-historial').addEventListener('click', () => show('view-main'));
    $('select-mes-historial').addEventListener('change', (e) => {
      historialMesKey = e.target.value;
      renderHistorial();
    });

    $('btn-categorias').addEventListener('click', abrirCategorias);
    $('btn-cerrar-categorias').addEventListener('click', () => { renderMain(); show('view-main'); });
    $('form-nueva-categoria').addEventListener('submit', onAgregarCategoria);

    $('btn-exportar').addEventListener('click', () => exportarCSV(state));

    $('btn-cerrar-mes').addEventListener('click', abrirCerrarMes);
    $('btn-confirmar-nuevo-mes').addEventListener('click', onConfirmarNuevoMes);
    $('btn-cancelar-nuevo-mes').addEventListener('click', () => show('view-main'));
  }

  function onEditarSaldoInicial() {
    const mes = mesActivo();
    const nuevo = prompt('Editar saldo inicial del mes:', mes.salarioInicial);
    if (nuevo === null) return;
    const val = parseFloat(nuevo);
    if (isNaN(val) || val < 0) return;
    mes.salarioInicial = val;
    setState(state);
    renderMain();
  }

  // ---------- Main ----------
  function renderMain() {
    const mes = mesActivo();
    $('mes-label').textContent = nombreMes(state.mesActivo);
    $('valor-saldo-inicial').textContent = formatMoney(mes.salarioInicial);

    const gastado = totalGastado(mes);
    const disp = disponible(mes);
    $('valor-gastos').textContent = formatMoney(gastado);
    $('valor-disponible').textContent = formatMoney(disp);
    $('disponible-card').classList.toggle('negative', disp < 0);

    const resumen = resumenPorCategoria(mes);
    const cont = $('resumen-lista');
    cont.innerHTML = '';
    if (resumen.length === 0) {
      $('resumen-vacio').classList.remove('hidden');
    } else {
      $('resumen-vacio').classList.add('hidden');
      const max = resumen[0].monto || 1;
      for (const item of resumen) {
        const pct = Math.max(4, Math.round((item.monto / max) * 100));
        const row = document.createElement('div');
        row.className = 'resumen-item';
        row.innerHTML = `
          <div class="resumen-item-top">
            <span>${escapeHTML(item.categoria)}</span>
            <span>${formatMoney(item.monto)}</span>
          </div>
          <div class="resumen-bar-bg"><div class="resumen-bar" style="width:${pct}%"></div></div>
        `;
        cont.appendChild(row);
      }
    }
  }

  // ---------- Add/Edit expense ----------
  function abrirFormGasto(gastoId) {
    editandoGastoId = gastoId;
    const mes = mesActivo();
    $('titulo-gasto').textContent = editandoGastoId ? 'Editar gasto' : 'Agregar gasto';
    $('btn-eliminar-gasto').classList.toggle('hidden', !editandoGastoId);

    renderChipsCategoria();

    if (editandoGastoId) {
      const g = mes.gastos.find((x) => x.id === editandoGastoId);
      $('input-monto').value = g.monto;
      $('input-concepto').value = g.concepto;
      $('input-fecha').value = g.fecha;
      selectChip(g.categoria);
    } else {
      $('form-gasto').reset();
      $('input-fecha').value = hoyISO();
      selectChip(state.categorias[0]);
    }
    show('view-gasto');
  }

  function renderChipsCategoria() {
    const cont = $('chips-categoria');
    cont.innerHTML = '';
    for (const cat of state.categorias) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.textContent = cat;
      chip.dataset.categoria = cat;
      chip.addEventListener('click', () => selectChip(cat));
      cont.appendChild(chip);
    }
  }

  function selectChip(cat) {
    categoriaSeleccionada = cat;
    document.querySelectorAll('#chips-categoria .chip').forEach((c) => {
      c.classList.toggle('selected', c.dataset.categoria === cat);
    });
  }

  function onGuardarGasto(e) {
    e.preventDefault();
    const mes = mesActivo();
    if (mes.cerrado) { show('view-main'); return; }

    const monto = parseFloat($('input-monto').value);
    const concepto = $('input-concepto').value.trim();
    const fecha = $('input-fecha').value;
    const categoria = categoriaSeleccionada || state.categorias[0];
    if (isNaN(monto) || monto <= 0 || !concepto || !fecha) return;

    if (editandoGastoId) {
      const g = mes.gastos.find((x) => x.id === editandoGastoId);
      g.monto = monto;
      g.concepto = concepto;
      g.fecha = fecha;
      g.categoria = categoria;
    } else {
      mes.gastos.push({
        id: crypto.randomUUID(),
        monto,
        concepto,
        fecha,
        categoria,
        creadoEn: Date.now()
      });
    }
    setState(state);
    renderMain();
    show('view-main');
  }

  function onEliminarGastoActual() {
    if (!editandoGastoId) return;
    if (!confirm('¿Eliminar este gasto?')) return;
    const mes = mesActivo();
    mes.gastos = mes.gastos.filter((g) => g.id !== editandoGastoId);
    setState(state);
    renderMain();
    show('view-main');
  }

  // ---------- History ----------
  function abrirHistorial() {
    const select = $('select-mes-historial');
    select.innerHTML = '';
    const keys = Object.keys(state.meses).sort().reverse();
    for (const key of keys) {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = nombreMes(key) + (state.meses[key].cerrado ? ' (cerrado)' : ' (actual)');
      select.appendChild(opt);
    }
    historialMesKey = state.mesActivo;
    select.value = historialMesKey;
    renderHistorial();
    show('view-historial');
  }

  function renderHistorial() {
    const mes = state.meses[historialMesKey];
    const cerrado = mes.cerrado;

    const resumenDiv = $('resumen-mes-cerrado');
    if (cerrado) {
      const gastado = totalGastado(mes);
      const disp = disponible(mes);
      resumenDiv.classList.remove('hidden');
      resumenDiv.innerHTML = `
        <div class="resumen-mes-row"><span>Saldo inicial</span><span>${formatMoney(mes.salarioInicial)}</span></div>
        <div class="resumen-mes-row"><span>Gastos</span><span>${formatMoney(gastado)}</span></div>
        <div class="resumen-mes-row"><strong>Disponible final</strong><strong>${formatMoney(disp)}</strong></div>
      `;
    } else {
      resumenDiv.classList.add('hidden');
      resumenDiv.innerHTML = '';
    }

    const lista = $('lista-historial');
    lista.innerHTML = '';
    const gastosOrdenados = [...mes.gastos].sort(
      (a, b) => b.fecha.localeCompare(a.fecha) || b.creadoEn - a.creadoEn
    );

    if (gastosOrdenados.length === 0) {
      $('historial-vacio').classList.remove('hidden');
    } else {
      $('historial-vacio').classList.add('hidden');
      for (const g of gastosOrdenados) {
        const item = document.createElement('div');
        item.className = 'historial-item';
        item.innerHTML = `
          <div class="historial-item-main">
            <span class="historial-concepto">${escapeHTML(g.concepto)}</span>
            <span class="historial-monto">${formatMoney(g.monto)}</span>
          </div>
          <div class="historial-item-sub">
            <span>${escapeHTML(g.categoria)}</span>
            <span>${formatDate(g.fecha)}</span>
          </div>
        `;
        if (!cerrado) {
          item.classList.add('clickable');
          item.addEventListener('click', () => abrirFormGasto(g.id));
        }
        lista.appendChild(item);
      }
    }
  }

  // ---------- Categories ----------
  function abrirCategorias() {
    renderCategorias();
    show('view-categorias');
  }

  function renderCategorias() {
    const cont = $('lista-categorias');
    cont.innerHTML = '';
    for (const cat of state.categorias) {
      const row = document.createElement('div');
      row.className = 'categoria-row';
      row.innerHTML = `
        <input type="text" class="categoria-input" value="${escapeAttr(cat)}" data-original="${escapeAttr(cat)}">
        <button type="button" class="btn-icon-danger" data-cat="${escapeAttr(cat)}">🗑️</button>
      `;
      cont.appendChild(row);
    }
    cont.querySelectorAll('.categoria-input').forEach((input) => {
      input.addEventListener('change', onRenombrarCategoria);
    });
    cont.querySelectorAll('.btn-icon-danger').forEach((btn) => {
      btn.addEventListener('click', () => onEliminarCategoria(btn.dataset.cat));
    });
  }

  function onRenombrarCategoria(e) {
    const original = e.target.dataset.original;
    const nuevo = e.target.value.trim();
    if (!nuevo || nuevo === original) {
      e.target.value = original;
      return;
    }
    if (state.categorias.includes(nuevo)) {
      alert('Ya existe una categoría con ese nombre.');
      e.target.value = original;
      return;
    }
    const idx = state.categorias.indexOf(original);
    state.categorias[idx] = nuevo;
    for (const key in state.meses) {
      for (const g of state.meses[key].gastos) {
        if (g.categoria === original) g.categoria = nuevo;
      }
    }
    setState(state);
    renderCategorias();
  }

  function onEliminarCategoria(cat) {
    if (state.categorias.length <= 1) {
      alert('Debe quedar al menos una categoría.');
      return;
    }
    if (!confirm(`¿Eliminar la categoría "${cat}"? Los gastos que la usen pasarán a "Otros".`)) return;

    if (cat !== 'Otros' && !state.categorias.includes('Otros')) {
      state.categorias.push('Otros');
    }
    state.categorias = state.categorias.filter((c) => c !== cat);
    for (const key in state.meses) {
      for (const g of state.meses[key].gastos) {
        if (g.categoria === cat) g.categoria = 'Otros';
      }
    }
    setState(state);
    renderCategorias();
    renderMain();
  }

  function onAgregarCategoria(e) {
    e.preventDefault();
    const input = $('input-nueva-categoria');
    const nombre = input.value.trim();
    if (!nombre) return;
    if (state.categorias.includes(nombre)) {
      alert('Esa categoría ya existe.');
      return;
    }
    state.categorias.push(nombre);
    setState(state);
    input.value = '';
    renderCategorias();
  }

  // ---------- Close month ----------
  function abrirCerrarMes() {
    const mes = mesActivo();
    $('titulo-nuevo-mes').textContent = `Cerrar ${nombreMes(state.mesActivo)}`;
    $('subtitulo-nuevo-mes').textContent =
      `Este mes queda archivado. Disponible final: ${formatMoney(disponible(mes))}. ¿Cuál es el saldo inicial del nuevo mes?`;
    $('input-salario-nuevo-mes').value = '';
    show('view-cerrar-mes');
  }

  function onConfirmarNuevoMes() {
    const val = parseFloat($('input-salario-nuevo-mes').value);
    if (isNaN(val) || val < 0) return;

    const mesActualObj = mesActivo();
    mesActualObj.cerrado = true;
    mesActualObj.cerradoEn = Date.now();

    let nuevaKey = siguienteMesKey(state.mesActivo);
    while (state.meses[nuevaKey]) {
      nuevaKey = siguienteMesKey(nuevaKey);
    }

    state.meses[nuevaKey] = {
      salarioInicial: val,
      cerrado: false,
      cerradoEn: null,
      gastos: []
    };
    state.mesActivo = nuevaKey;
    setState(state);
    renderMain();
    show('view-main');
  }

  init();
})();
