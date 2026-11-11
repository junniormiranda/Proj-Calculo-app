/* =========================================================
   Tipos de funções — gráficos manipuláveis por controles
   deslizantes. Cada .type-card[data-type] recebe sliders
   para seus coeficientes e redesenha o gráfico ao vivo.
   A curva tracejada mostra o estado inicial, para comparação.
   ========================================================= */

(function () {
  'use strict';

  const ACCENT = '#fb923c';
  const GHOST = 'rgba(180, 188, 203, 0.35)';
  const PT = '#38bdf8';

  /* número em pt-BR, com sinal de menos tipográfico */
  function num(v) {
    const r = Math.round(v * 100) / 100;
    return (Object.is(r, -0) ? 0 : r).toLocaleString('pt-BR', { maximumFractionDigits: 2 }).replace('-', '−');
  }

  /* "ax" com casos 1 e −1 */
  function coefX(a) {
    if (a === 1) return 'x';
    if (a === -1) return '−x';
    return num(a) + 'x';
  }

  /* " + b" / " − b" / "" */
  function plusTerm(b) {
    if (b === 0) return '';
    return (b > 0 ? ' + ' : ' − ') + num(Math.abs(b));
  }

  function lnBase(a, x) { return Math.log(x) / Math.log(a); }

  const TYPES = {
    constante: {
      params: { b: { min: -4, max: 4, step: 0.5, value: 2 } },
      view: { xmin: -5, xmax: 5, ymin: -5, ymax: 5 },
      fn: p => () => p.b,
      formula: p => 'f(x) = ' + num(p.b),
      markers: p => [{ x: 0, y: p.b, label: '(0, ' + num(p.b) + ')', color: PT }]
    },
    afim: {
      params: {
        a: { min: -3, max: 3, step: 0.25, value: 2, nonZero: true },
        b: { min: -4, max: 4, step: 0.5, value: 1 }
      },
      view: { xmin: -5, xmax: 5, ymin: -5, ymax: 5 },
      fn: p => x => p.a * x + p.b,
      formula: p => 'f(x) = ' + coefX(p.a) + plusTerm(p.b),
      markers: p => [
        { x: 0, y: p.b, label: '(0, ' + num(p.b) + ')', color: PT },
        { x: -p.b / p.a, y: 0, label: 'raiz ' + num(-p.b / p.a), color: '#f472b6' }
      ]
    },
    linear: {
      params: { a: { min: -3, max: 3, step: 0.25, value: 2, nonZero: true } },
      view: { xmin: -5, xmax: 5, ymin: -5, ymax: 5 },
      fn: p => x => p.a * x,
      formula: p => 'f(x) = ' + coefX(p.a),
      markers: p => [
        { x: 0, y: 0, label: 'origem', color: PT },
        { x: 1, y: p.a, label: '(1, ' + num(p.a) + ')', color: '#f472b6' }
      ]
    },
    exponencial: {
      params: { a: { min: 0.2, max: 4, step: 0.1, value: 2, notOne: true } },
      view: { xmin: -4, xmax: 4, ymin: -1, ymax: 8 },
      fn: p => x => Math.pow(p.a, x),
      formula: p => 'f(x) = ' + num(p.a) + 'ˣ  ·  ' + (p.a > 1 ? 'crescente' : 'decrescente'),
      markers: p => [
        { x: 0, y: 1, label: '(0, 1)', color: PT },
        { x: 1, y: p.a, label: '(1, ' + num(p.a) + ')', color: '#f472b6' }
      ]
    },
    logaritmica: {
      params: { a: { min: 0.2, max: 6, step: 0.1, value: Math.E, notOne: true, label: 'base a' } },
      view: { xmin: -1, xmax: 8, ymin: -4, ymax: 4 },
      fn: p => x => (x > 0 ? lnBase(p.a, x) : NaN),
      formula: p => (Math.abs(p.a - Math.E) < 0.01 ? 'f(x) = ln(x)' : 'f(x) = log₍' + num(p.a) + '₎(x)') +
        '  ·  ' + (p.a > 1 ? 'crescente' : 'decrescente'),
      markers: p => [
        { x: 1, y: 0, label: '(1, 0)', color: PT },
        { x: p.a, y: 1, label: '(' + num(p.a) + ', 1)', color: '#f472b6' }
      ]
    }
  };

  /* evita valores proibidos (a = 0, a = 1) pulando para o vizinho */
  function sanitize(cfg, v, prev) {
    if (cfg.nonZero && Math.abs(v) < 1e-9) return prev > 0 ? -cfg.step : cfg.step;
    if (cfg.notOne && Math.abs(v - 1) < 1e-9) return prev > 1 ? 1 - cfg.step : 1 + cfg.step;
    return v;
  }

  function setup(card) {
    const def = TYPES[card.dataset.type];
    if (!def) return;
    const canvas = card.querySelector('canvas');
    const live = card.querySelector('.type-live');
    const box = card.querySelector('.sliders');
    const resetBtn = card.querySelector('.type-reset');

    const initial = {};
    const p = {};
    const inputs = {};
    const outs = {};

    Object.keys(def.params).forEach(name => {
      const cfg = def.params[name];
      initial[name] = cfg.value;
      p[name] = cfg.value;

      const id = 'tp-' + card.dataset.type + '-' + name;
      const row = document.createElement('div');
      row.className = 'slider-row';
      row.innerHTML =
        '<label for="' + id + '"><span class="mth">' + (cfg.label || name) + '</span></label>' +
        '<input type="range" id="' + id + '" min="' + cfg.min + '" max="' + cfg.max + '" step="' + cfg.step + '">' +
        '<output for="' + id + '"></output>';
      box.appendChild(row);

      const input = row.querySelector('input');
      input.value = cfg.value;
      inputs[name] = input;
      outs[name] = row.querySelector('output');

      input.addEventListener('input', () => {
        const v = sanitize(cfg, parseFloat(input.value), p[name]);
        if (v !== parseFloat(input.value)) input.value = v;
        p[name] = v;
        render();
      });
    });

    function render() {
      Object.keys(p).forEach(n => { outs[n].textContent = num(p[n]); });
      live.textContent = def.formula(p);
      const changed = Object.keys(p).some(n => p[n] !== initial[n]);
      const specs = [];
      if (changed) specs.push({ fn: def.fn(initial), color: GHOST, dash: [6, 5], width: 1.6 });
      specs.push({ fn: def.fn(p), color: ACCENT, width: 2.8 });
      Plot.draw(canvas, specs, Object.assign({ showLegend: false, height: 300, markers: def.markers(p) }, def.view));
      resetBtn.disabled = !changed;
    }

    resetBtn.addEventListener('click', () => {
      Object.keys(initial).forEach(n => { p[n] = initial[n]; inputs[n].value = initial[n]; });
      render();
    });

    render();
  }

  document.querySelectorAll('.type-card[data-type]').forEach(setup);
})();
