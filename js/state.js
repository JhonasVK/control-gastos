(function () {
  function totalGastado(mes) {
    return mes.gastos.reduce((sum, g) => sum + g.monto, 0);
  }

  function disponible(mes) {
    return mes.salarioInicial - totalGastado(mes);
  }

  function resumenPorCategoria(mes) {
    const map = {};
    for (const g of mes.gastos) {
      map[g.categoria] = (map[g.categoria] || 0) + g.monto;
    }
    return Object.entries(map)
      .map(([categoria, monto]) => ({ categoria, monto }))
      .sort((a, b) => b.monto - a.monto);
  }

  window.StateCalc = { totalGastado, disponible, resumenPorCategoria };
})();
