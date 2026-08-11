(function () {
  function escapeCSV(value) {
    const s = String(value);
    if (/[",\r\n]/.test(s)) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  function exportarCSV(state) {
    const rows = [['Mes', 'Fecha', 'Categoria', 'Concepto', 'Monto']];
    const mesesOrdenados = Object.keys(state.meses).sort();
    for (const mesKey of mesesOrdenados) {
      const mes = state.meses[mesKey];
      const gastosOrdenados = [...mes.gastos].sort((a, b) => a.fecha.localeCompare(b.fecha));
      for (const g of gastosOrdenados) {
        rows.push([mesKey, g.fecha, g.categoria, g.concepto, String(g.monto)]);
      }
    }
    const BOM = '﻿';
    const csv = rows.map((r) => r.map(escapeCSV).join(',')).join('\r\n');
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const hoy = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `gastos_control-gastos_${hoy}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  window.ExportCSV = { exportarCSV };
})();
