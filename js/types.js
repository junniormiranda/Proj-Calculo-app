/* =========================================================
   Cartões de tipos — gráficos manipuláveis por controles
   deslizantes. Cada .type-card[data-type] recebe sliders
   para seus parâmetros e redesenha o gráfico ao vivo.

   Definição de um tipo (TYPES[id]):
     params   { nome: { min, max, step, value, label?, avoid?: [valores], choices?: [rótulos] } }
     view     { xmin, xmax, ymin?, ymax?, xLabel?, yLabel? } ou função (p) => {...}
     formula  (p) => HTML exibido acima do gráfico
     plot     (p) => { curves: [{ fn, color?, dash?, width? }], markers?, lines?, fills? }
     ghost    true: mostra o estado inicial tracejado para comparação
   ========================================================= */

(function () {
  'use strict';

  const ACCENT = '#fb923c';
  const BLUE = '#38bdf8';
  const PINK = '#f472b6';
  const GHOST = 'rgba(180, 188, 203, 0.35)';
  const FAINT = 'rgba(180, 188, 203, 0.22)';
  const VLINE = 'rgba(56, 189, 248, 0.5)';
  const FILL = 'rgba(249, 115, 22, 0.28)';

  /* ---------------- formatação ---------------- */

  /* número em pt-BR, com sinal de menos tipográfico */
  function num(v) {
    if (!isFinite(v)) return v > 0 ? '+∞' : v < 0 ? '−∞' : '—';
    const r = Math.round(v * 100) / 100;
    return (Object.is(r, -0) ? 0 : r).toLocaleString('pt-BR', { maximumFractionDigits: 2 }).replace('-', '−');
  }

  /* número negativo entre parênteses: −2 → (−2) */
  function par(v) { return v < 0 ? '(' + num(v) + ')' : num(v); }

  /* coeficiente na frente de um termo: 1·x → x, −1·x → −x */
  function coef(a, term) {
    if (a === 1) return term;
    if (a === -1) return '−' + term;
    return num(a) + term;
  }

  /* soma de termos [[coef, termo], ...] → "3x³ − 2x + 1" */
  function poly(terms) {
    let out = '';
    terms.forEach(([c, t]) => {
      if (c === 0) return;
      const abs = Math.abs(c);
      const body = t ? coef(abs, t) : num(abs);
      if (!out) out = (c < 0 ? '−' : '') + body;
      else out += (c < 0 ? ' − ' : ' + ') + body;
    });
    return out || '0';
  }

  /* "x − a" com o sinal certo */
  function xMinus(a) {
    if (a === 0) return 'x';
    return a > 0 ? 'x − ' + num(a) : 'x + ' + num(-a);
  }

  const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  const sup = n => String(n).split('').map(d => SUP[d] || d).join('');

  const lim = (to) => 'lim<sub>x→' + to + '</sub> ';

  /* ---------------- ajudantes de gráfico ---------------- */

  /* função, derivada, tangente em x₀ e os pontos correspondentes;
     parts: funções auxiliares desenhadas em cinza (parcelas, fatores) */
  function derivPlot(f, df, x0, parts) {
    const y0 = f(x0), m = df(x0);
    const ok = isFinite(y0) && isFinite(m);
    return {
      curves: [
        /* parcelas/fatores em cinza, para comparação */
        ...(parts || []).map(fn => ({ fn, color: FAINT, width: 1.6 })),
        { fn: f, color: ACCENT, width: 2.8 },
        { fn: df, color: BLUE, dash: [6, 5], width: 2 }
      ],
      lines: ok ? [{ fn: x => y0 + m * (x - x0), color: PINK }] : [],
      markers: ok ? [
        { x: x0, y: y0, color: ACCENT },
        { x: x0, y: m, color: BLUE, label: 'f′(x₀)' }
      ] : []
    };
  }

  function derivText(fTxt, dfTxt, x0, m) {
    return 'f(x) = ' + fTxt + '\nf′(x) = ' + dfTxt + '\n' +
      (isFinite(m) ? 'f′(' + num(x0) + ') = ' + num(m) + ' → inclinação da tangente' : 'x₀ = ' + num(x0) + ' fora do domínio');
  }

  /* ================= DEFINIÇÕES ================= */

  const TYPES = {

    /* ---------------- FUNÇÕES ---------------- */
    constante: {
      ghost: true,
      params: { b: { min: -4, max: 4, step: 0.5, value: 2 } },
      view: { xmin: -5, xmax: 5, ymin: -5, ymax: 5 },
      formula: p => 'f(x) = ' + num(p.b),
      plot: p => ({
        curves: [{ fn: () => p.b }],
        markers: [{ x: 0, y: p.b, label: '(0, ' + num(p.b) + ')', color: BLUE }]
      })
    },
    afim: {
      ghost: true,
      params: {
        a: { min: -3, max: 3, step: 0.25, value: 2, avoid: [0] },
        b: { min: -4, max: 4, step: 0.5, value: 1 }
      },
      view: { xmin: -5, xmax: 5, ymin: -5, ymax: 5 },
      formula: p => 'f(x) = ' + poly([[p.a, 'x'], [p.b, '']]),
      plot: p => ({
        curves: [{ fn: x => p.a * x + p.b }],
        markers: [
          { x: 0, y: p.b, label: '(0, ' + num(p.b) + ')', color: BLUE },
          { x: -p.b / p.a, y: 0, label: 'raiz ' + num(-p.b / p.a), color: PINK }
        ]
      })
    },
    linear: {
      ghost: true,
      params: { a: { min: -3, max: 3, step: 0.25, value: 2, avoid: [0] } },
      view: { xmin: -5, xmax: 5, ymin: -5, ymax: 5 },
      formula: p => 'f(x) = ' + coef(p.a, 'x'),
      plot: p => ({
        curves: [{ fn: x => p.a * x }],
        markers: [
          { x: 0, y: 0, label: 'origem', color: BLUE },
          { x: 1, y: p.a, label: '(1, ' + num(p.a) + ')', color: PINK }
        ]
      })
    },
    exponencial: {
      ghost: true,
      params: { a: { min: 0.2, max: 4, step: 0.1, value: 2, avoid: [1] } },
      view: { xmin: -4, xmax: 4, ymin: -1, ymax: 8 },
      formula: p => 'f(x) = ' + num(p.a) + 'ˣ  ·  ' + (p.a > 1 ? 'crescente' : 'decrescente'),
      plot: p => ({
        curves: [{ fn: x => Math.pow(p.a, x) }],
        markers: [
          { x: 0, y: 1, label: '(0, 1)', color: BLUE },
          { x: 1, y: p.a, label: '(1, ' + num(p.a) + ')', color: PINK }
        ]
      })
    },
    logaritmica: {
      ghost: true,
      params: { a: { min: 0.2, max: 6, step: 0.1, value: Math.E, avoid: [1], label: 'base a' } },
      view: { xmin: -1, xmax: 8, ymin: -4, ymax: 4 },
      formula: p => (Math.abs(p.a - Math.E) < 0.01 ? 'f(x) = ln(x)' : 'f(x) = log<sub>' + num(p.a) + '</sub>(x)') +
        '  ·  ' + (p.a > 1 ? 'crescente' : 'decrescente'),
      plot: p => ({
        curves: [{ fn: x => (x > 0 ? Math.log(x) / Math.log(p.a) : NaN) }],
        markers: [
          { x: 1, y: 0, label: '(1, 0)', color: BLUE },
          { x: p.a, y: 1, label: '(' + num(p.a) + ', 1)', color: PINK }
        ]
      })
    },

    /* ---------------- LIMITES ---------------- */
    'lim-direta': {
      params: { a: { min: -3, max: 3, step: 0.5, value: 3 } },
      view: { xmin: -4, xmax: 4, ymin: -2, ymax: 18 },
      formula: p => lim(num(p.a)) + '(x² + 1) = ' + num(p.a * p.a) + ' + 1 = ' + num(p.a * p.a + 1),
      plot: p => ({
        curves: [{ fn: x => x * x + 1 }],
        markers: [{ x: p.a, y: p.a * p.a + 1, color: BLUE, label: 'f(' + num(p.a) + ') = ' + num(p.a * p.a + 1) }],
        lines: [{ vertical: p.a, color: VLINE }]
      })
    },
    'lim-00': {
      params: { a: { min: -3, max: 3, step: 0.5, value: 2, avoid: [0] } },
      view: { xmin: -5, xmax: 5, ymin: -7, ymax: 7 },
      formula: p => lim(num(p.a)) + '(x² − ' + num(p.a * p.a) + ')/(' + xMinus(p.a) + ') = ' + lim(num(p.a)) +
        '(' + xMinus(-p.a) + ') = ' + num(2 * p.a),
      plot: p => ({
        curves: [{ fn: x => (Math.abs(x - p.a) < 1e-9 ? NaN : (x * x - p.a * p.a) / (x - p.a)) }],
        markers: [{ x: p.a, y: 2 * p.a, type: 'open', color: BLUE, label: 'lim = ' + num(2 * p.a) }],
        lines: [{ vertical: p.a, color: VLINE }]
      })
    },
    'lim-laterais': {
      params: { k: { min: -3, max: 3, step: 0.5, value: 1, label: 'salto k' } },
      view: { xmin: -2, xmax: 4, ymin: -2, ymax: 7 },
      formula: p => p.k === 0
        ? lim('1⁻') + '= 2  e  ' + lim('1⁺') + '= 2\nlaterais iguais → lim = 2'
        : lim('1⁻') + '= 2  e  ' + lim('1⁺') + '= ' + num(2 + p.k) + '\nlaterais diferentes → o limite não existe',
      plot: p => ({
        curves: [
          { fn: x => (x < 1 ? x + 1 : NaN) },
          { fn: x => (x >= 1 ? x + 1 + p.k : NaN), color: ACCENT }
        ],
        markers: p.k === 0
          ? [{ x: 1, y: 2, color: BLUE, label: 'lim = 2' }]
          : [
            { x: 1, y: 2, type: 'open', color: BLUE, label: '1⁻ → 2' },
            { x: 1, y: 2 + p.k, color: PINK, label: '1⁺ → ' + num(2 + p.k) }
          ],
        lines: [{ vertical: 1, color: VLINE }]
      })
    },
    'lim-infinito': {
      params: {
        a: { min: -3, max: 3, step: 0.5, value: 3, label: 'a (num.)' },
        b: { min: 0.5, max: 4, step: 0.5, value: 2, label: 'b (den.)' }
      },
      view: p => {
        const L = p.a / p.b;
        return { xmin: -20, xmax: 20, ymin: Math.min(L, 1, 0) - 1.5, ymax: Math.max(L, 1, 0) + 1.5 };
      },
      formula: p => lim('∞') + '(' + poly([[p.a, 'x²'], [1, '']]) + ')/(' + poly([[p.b, 'x²'], [1, '']]) + ') = ' +
        num(p.a) + '/' + num(p.b) + ' = ' + num(p.a / p.b),
      plot: p => ({
        curves: [{ fn: x => (p.a * x * x + 1) / (p.b * x * x + 1) }],
        lines: [{ fn: () => p.a / p.b, color: BLUE }],
        markers: [{ x: 14, y: p.a / p.b, color: BLUE, type: 'open', label: 'y = ' + num(p.a / p.b) }]
      })
    },
    'lim-vertical': {
      params: { a: { min: -3, max: 3, step: 0.5, value: 0 } },
      view: { xmin: -5, xmax: 5, ymin: -1, ymax: 10 },
      formula: p => lim(num(p.a)) + '1/(' + xMinus(p.a) + ')² = +∞\nassíntota vertical em x = ' + num(p.a),
      plot: p => ({
        curves: [{ fn: x => 1 / ((x - p.a) * (x - p.a)) }],
        lines: [{ vertical: p.a, color: VLINE }]
      })
    },

    /* ---- propriedades: combina f e g e mostra o limite resultante ---- */
    'lim-prop': {
      params: {
        op: { min: 0, max: 5, step: 1, value: 0, label: 'operação',
          choices: ['soma', 'diferença', 'produto', 'quociente', 'múltiplo', 'potência'] },
        a: { min: -3, max: 3, step: 0.5, value: 2 }
      },
      view: { xmin: -4, xmax: 4, ymin: -6, ymax: 12 },
      formula: p => {
        const L = p.a + 1, Mv = p.a / 2 + 2, O = PROP_OPS[p.op];
        return 'lim f = ' + num(L) + '   (f(x) = x + 1)\nlim g = ' + num(Mv) + '   (g(x) = x/2 + 2)\n' +
          lim(num(p.a)) + O.txt + ' = ' + O.rule(num(L), num(Mv)) + ' = ' + num(O.fn(L, Mv));
      },
      plot: p => {
        const O = PROP_OPS[p.op], f = x => x + 1, g = x => x / 2 + 2;
        const R = O.fn(p.a + 1, p.a / 2 + 2);
        return {
          curves: [
            { fn: f, color: BLUE, width: 1.6, dash: [6, 5] },
            { fn: g, color: PINK, width: 1.6, dash: [6, 5] },
            { fn: x => O.fn(f(x), g(x)), color: ACCENT, width: 2.8 }
          ],
          markers: [{ x: p.a, y: R, type: 'open', color: ACCENT, label: 'lim = ' + num(R) }],
          lines: [{ vertical: p.a, color: VLINE }]
        };
      }
    },

    /* ---- laterais e infinitos: aproxima-se de a pelos dois lados ---- */
    'lim-aproxima': {
      params: {
        f: { min: 0, max: 3, step: 1, value: 0, label: 'função', choices: ['|x|/x', '1/x', '1/x²', 'salto'] },
        h: { min: 0.05, max: 2, step: 0.05, value: 1, label: 'distância h' }
      },
      view: p => APPROACH[p.f].view,
      formula: p => {
        const A = APPROACH[p.f], a = A.a;
        return 'x = ' + num(a - p.h) + ' (esquerda) → f = ' + num(A.fn(a - p.h)) +
          '\nx = ' + num(a + p.h) + ' (direita) → f = ' + num(A.fn(a + p.h)) + '\n' + A.concl;
      },
      plot: p => {
        const A = APPROACH[p.f], a = A.a;
        return {
          curves: (A.pieces || [A.fn]).map(fn => ({ fn })),
          markers: [
            { x: a - p.h, y: A.fn(a - p.h), color: BLUE, label: 'esq.' },
            { x: a + p.h, y: A.fn(a + p.h), color: PINK, label: 'dir.' }
          ].concat(A.marks || []),
          lines: [{ vertical: a, color: VLINE }]
        };
      }
    },

    /* ---- continuidade: as três condições em cada tipo ---- */
    'lim-continuidade': {
      params: {
        t: { min: 0, max: 3, step: 1, value: 0, label: 'caso', choices: ['contínua', 'removível', 'salto', 'infinita'] }
      },
      view: { xmin: -2, xmax: 4, ymin: -5, ymax: 7 },
      formula: p => {
        const C = CONT[p.t];
        const mark = ok => (ok ? '✓ ' : '✗ ');
        return mark(C.c[0]) + '1) f(1) existe: ' + C.t[0] + '\n' +
          mark(C.c[1]) + '2) lim<sub>x→1</sub> f(x) existe: ' + C.t[1] + '\n' +
          mark(C.c[2]) + '3) lim = f(1): ' + C.t[2] + '\n→ ' + C.verdict;
      },
      plot: p => {
        const C = CONT[p.t];
        return { curves: C.curves.map(fn => ({ fn })), markers: C.marks, lines: [{ vertical: 1, color: VLINE }] };
      }
    },

    /* ---------------- DERIVADAS ---------------- */
    'der-constante': {
      params: {
        c: { min: -4, max: 4, step: 0.5, value: 3 },
        x0: { min: -4, max: 4, step: 0.25, value: 1, label: 'x₀' }
      },
      view: { xmin: -5, xmax: 5, ymin: -5, ymax: 5 },
      formula: p => derivText(num(p.c), '0', p.x0, 0),
      plot: p => derivPlot(() => p.c, () => 0, p.x0)
    },
    'der-potencia': {
      params: {
        n: { min: 1, max: 5, step: 1, value: 3 },
        x0: { min: -2, max: 2, step: 0.25, value: 1, label: 'x₀' }
      },
      view: { xmin: -2.5, xmax: 2.5, ymin: -6, ymax: 6 },
      formula: p => {
        const fT = p.n === 1 ? 'x' : 'x' + sup(p.n);
        const dT = p.n === 1 ? '1' : p.n === 2 ? '2x' : p.n + 'x' + sup(p.n - 1);
        return derivText(fT, dT, p.x0, p.n * Math.pow(p.x0, p.n - 1));
      },
      plot: p => derivPlot(x => Math.pow(x, p.n), x => p.n * Math.pow(x, p.n - 1), p.x0)
    },
    'der-multiplo': {
      params: {
        c: { min: -3, max: 3, step: 0.5, value: 2, avoid: [0] },
        x0: { min: -2.5, max: 2.5, step: 0.25, value: 1, label: 'x₀' }
      },
      view: { xmin: -3, xmax: 3, ymin: -8, ymax: 8 },
      formula: p => derivText(coef(p.c, 'x²'), coef(2 * p.c, 'x'), p.x0, 2 * p.c * p.x0) +
        '\n(x²)′ = 2x, então (' + coef(p.c, 'x²') + ')′ = ' + par(p.c) + '·2x',
      plot: p => derivPlot(x => p.c * x * x, x => 2 * p.c * x, p.x0, [x => x * x])
    },
    'der-soma': {
      params: {
        op: { min: 0, max: 1, step: 1, value: 0, label: 'operação', choices: ['soma', 'diferença'] },
        x0: { min: -2.5, max: 2.5, step: 0.25, value: 1.5, label: 'x₀' }
      },
      view: { xmin: -3, xmax: 3, ymin: -8, ymax: 8 },
      formula: p => {
        const s = p.op === 0 ? 1 : -1, o = s > 0 ? ' + ' : ' − ';
        return 'f(x) = x³' + o + '3x  →  f′(x) = (x³)′' + o + '(3x)′\nf′(x) = 3x²' + o + '3\n' +
          'f′(' + num(p.x0) + ') = ' + num(3 * p.x0 * p.x0 + 3 * s) + ' → inclinação da tangente';
      },
      plot: p => {
        const s = p.op === 0 ? 1 : -1;
        return derivPlot(x => x * x * x + 3 * s * x, x => 3 * x * x + 3 * s, p.x0, [x => x * x * x, x => 3 * s * x]);
      }
    },
    'der-produto': {
      params: { x0: { min: -2.5, max: 2.5, step: 0.25, value: 1.5, label: 'x₀' } },
      view: { xmin: -3, xmax: 3, ymin: -8, ymax: 8 },
      formula: p => 'f(x) = x · (x² − 4)   (u = x, v = x² − 4)\nf′(x) = 1·(x² − 4) + x·2x = 3x² − 4\n' +
        'f′(' + num(p.x0) + ') = ' + num(3 * p.x0 * p.x0 - 4) + ' → inclinação da tangente',
      plot: p => derivPlot(x => x * (x * x - 4), x => 3 * x * x - 4, p.x0, [x => x, x => x * x - 4])
    },

    /* ---------------- INTEGRAIS ---------------- */
    'int-indefinida': {
      params: { C: { min: -3, max: 3, step: 0.5, value: 0 } },
      view: { xmin: -2.5, xmax: 2.5, ymin: -6, ymax: 6 },
      formula: p => '∫ 3x² dx = x³ + C\ncom C = ' + num(p.C) + ':  F(x) = ' + poly([[1, 'x³'], [p.C, '']]) + '   (F′(x) = 3x² para todo C)',
      plot: p => {
        const curves = [];
        for (let c = -3; c <= 3; c++) curves.push({ fn: x => x * x * x + c, color: FAINT, width: 1.4 });
        curves.push({ fn: x => x * x * x + p.C, color: ACCENT, width: 2.8 });
        return { curves, markers: [{ x: 0, y: p.C, color: BLUE, label: 'C = ' + num(p.C) }] };
      }
    },
    'int-definida': {
      params: {
        a: { min: -2, max: 3, step: 0.25, value: 0 },
        b: { min: -2, max: 3, step: 0.25, value: 2 }
      },
      view: { xmin: -2.5, xmax: 3.5, ymin: -1, ymax: 10 },
      formula: p => '∫<sub>' + num(p.a) + '</sub><sup>' + num(p.b) + '</sup> x² dx = [x³/3]<sub>' + num(p.a) + '</sub><sup>' + num(p.b) +
        '</sup> = (' + num(Math.pow(p.b, 3)) + ' − ' + par(Math.pow(p.a, 3)) + ')/3 = ' +
        num((Math.pow(p.b, 3) - Math.pow(p.a, 3)) / 3),
      plot: p => ({
        curves: [{ fn: x => x * x }],
        fills: [{ fn: x => x * x, from: Math.min(p.a, p.b), to: Math.max(p.a, p.b), color: FILL }],
        lines: [{ vertical: p.a, color: VLINE }, { vertical: p.b, color: VLINE }]
      })
    },
    'int-substituicao': {
      params: { b: { min: 0, max: 3, step: 0.05, value: 1.5 } },
      view: { xmin: -0.2, xmax: 3.2, ymin: -6.5, ymax: 6.5 },
      formula: p => '∫<sub>0</sub><sup>' + num(p.b) + '</sup> 2x·cos(x²) dx = [sen(x²)]<sub>0</sub><sup>' + num(p.b) +
        '</sup> = sen(' + num(p.b * p.b) + ') = ' + num(Math.sin(p.b * p.b)),
      plot: p => ({
        curves: [{ fn: x => 2 * x * Math.cos(x * x) }],
        fills: [{ fn: x => 2 * x * Math.cos(x * x), from: 0, to: p.b, color: FILL }],
        lines: [{ vertical: p.b, color: VLINE }]
      })
    },
    'int-partes': {
      params: { b: { min: 0, max: 6.25, step: 0.05, value: 3.15 } },
      view: { xmin: -0.3, xmax: 6.6, ymin: -5.5, ymax: 3 },
      formula: p => '∫<sub>0</sub><sup>' + num(p.b) + '</sup> x·sen(x) dx = [sen(x) − x·cos(x)]<sub>0</sub><sup>' + num(p.b) +
        '</sup> = ' + num(Math.sin(p.b) - p.b * Math.cos(p.b)),
      plot: p => ({
        curves: [{ fn: x => x * Math.sin(x) }],
        fills: [{ fn: x => x * Math.sin(x), from: 0, to: p.b, color: FILL }],
        lines: [{ vertical: p.b, color: VLINE }]
      })
    },
    'int-entre': {
      params: { k: { min: 0.5, max: 6, step: 0.5, value: 4 } },
      view: { xmin: -3, xmax: 3, ymin: -1, ymax: 7 },
      formula: p => {
        const r = Math.sqrt(p.k);
        return 'Área = ∫<sub>−' + num(r) + '</sub><sup>' + num(r) + '</sup> (' + num(p.k) + ' − x²) dx = (4/3)·' + num(p.k) + '<sup>3/2</sup> = ' +
          num(4 / 3 * Math.pow(p.k, 1.5));
      },
      plot: p => {
        const r = Math.sqrt(p.k);
        return {
          curves: [{ fn: () => p.k, color: BLUE }, { fn: x => x * x, color: ACCENT }],
          fills: [{ fn: () => p.k, lower: x => x * x, from: -r, to: r, color: FILL }],
          markers: [{ x: -r, y: p.k, color: PINK }, { x: r, y: p.k, color: PINK, label: '(' + num(r) + ', ' + num(p.k) + ')' }]
        };
      }
    },
    'int-aplicacao': {
      params: {
        v0: { min: 0, max: 5, step: 0.5, value: 2, label: 'v₀' },
        a: { min: -1, max: 2, step: 0.25, value: 1 },
        T: { min: 1, max: 6, step: 0.5, value: 4 }
      },
      view: p => {
        const v6 = p.v0 + p.a * 6;
        return { xmin: -0.3, xmax: 6.5, ymin: Math.min(0, v6) - 1, ymax: Math.max(p.v0, v6, 1) + 1, xLabel: 't', yLabel: 'v' };
      },
      formula: p => 'v(t) = ' + poly([[p.v0, ''], [p.a, 't']]) + '\nΔs = ∫<sub>0</sub><sup>' + num(p.T) + '</sup> v(t) dt = ' +
        num(p.v0) + '·' + num(p.T) + ' + ' + par(p.a) + '·' + num(p.T) + '²/2 = ' + num(p.v0 * p.T + p.a * p.T * p.T / 2) + ' m',
      plot: p => ({
        curves: [{ fn: t => p.v0 + p.a * t }],
        fills: [{ fn: t => p.v0 + p.a * t, from: 0, to: p.T, color: FILL }],
        lines: [{ vertical: p.T, color: VLINE }]
      })
    }
  };


  /* operações das propriedades dos limites */
  const PROP_OPS = [
    { txt: '[f(x) + g(x)]', rule: (L, M) => L + ' + ' + M, fn: (u, v) => u + v },
    { txt: '[f(x) − g(x)]', rule: (L, M) => L + ' − ' + M, fn: (u, v) => u - v },
    { txt: '[f(x) · g(x)]', rule: (L, M) => L + ' · ' + M, fn: (u, v) => u * v },
    { txt: '[f(x) / g(x)]', rule: (L, M) => L + ' / ' + M, fn: (u, v) => u / v },
    { txt: '[3 · f(x)]', rule: L => '3 · ' + L, fn: u => 3 * u },
    { txt: '[f(x)]²', rule: L => '(' + L + ')²', fn: u => u * u }
  ];

  /* funções para a aproximação lateral */
  const APPROACH = [
    { a: 0, fn: x => (x === 0 ? NaN : Math.abs(x) / x), view: { xmin: -3, xmax: 3, ymin: -2.5, ymax: 2.5 },
      pieces: [x => (x < 0 ? -1 : NaN), x => (x > 0 ? 1 : NaN)],
      marks: [{ x: 0, y: -1, type: 'open', color: BLUE }, { x: 0, y: 1, type: 'open', color: PINK }],
      concl: 'lim<sub>x→0⁻</sub> = −1 e lim<sub>x→0⁺</sub> = 1 → o limite não existe' },
    { a: 0, fn: x => 1 / x, view: { xmin: -3, xmax: 3, ymin: -10, ymax: 10 },
      concl: 'lim<sub>x→0⁻</sub> = −∞ e lim<sub>x→0⁺</sub> = +∞ → não existe; assíntota vertical x = 0' },
    { a: 0, fn: x => 1 / (x * x), view: { xmin: -3, xmax: 3, ymin: -1, ymax: 12 },
      concl: 'lim<sub>x→0⁻</sub> = lim<sub>x→0⁺</sub> = +∞ → lim = +∞; assíntota vertical x = 0' },
    { a: 1, fn: x => (x < 1 ? x + 1 : x + 3), view: { xmin: -1, xmax: 3, ymin: -1, ymax: 7 },
      pieces: [x => (x < 1 ? x + 1 : NaN), x => (x >= 1 ? x + 3 : NaN)],
      marks: [{ x: 1, y: 2, type: 'open', color: BLUE }, { x: 1, y: 4, color: PINK }],
      concl: 'lim<sub>x→1⁻</sub> = 2 e lim<sub>x→1⁺</sub> = 4 → o limite não existe (salto)' }
  ];

  /* os quatro casos de continuidade em x = 1 */
  const CONT = [
    { curves: [x => x + 1], c: [1, 1, 1], t: ['f(1) = 2', 'vale 2', '2 = 2'],
      marks: [{ x: 1, y: 2, color: BLUE, label: 'f(1) = 2' }], verdict: 'f é contínua em x = 1' },
    { curves: [x => (x === 1 ? NaN : x + 1)], c: [1, 1, 0], t: ['f(1) = 4', 'vale 2', '2 ≠ 4'],
      marks: [{ x: 1, y: 2, type: 'open', color: BLUE, label: 'lim = 2' }, { x: 1, y: 4, color: PINK, label: 'f(1) = 4' }],
      verdict: 'descontinuidade removível (basta redefinir f(1) = 2)' },
    { curves: [x => (x < 1 ? x + 1 : NaN), x => (x >= 1 ? x + 3 : NaN)], c: [1, 0, 0],
      t: ['f(1) = 4', 'não (laterais 2 e 4)', 'não se aplica'],
      marks: [{ x: 1, y: 2, type: 'open', color: BLUE }, { x: 1, y: 4, color: PINK, label: 'f(1) = 4' }],
      verdict: 'descontinuidade de salto' },
    { curves: [x => 1 / (x - 1)], c: [0, 0, 0], t: ['não (divisão por zero)', 'não (±∞)', 'não se aplica'],
      marks: [], verdict: 'descontinuidade infinita (assíntota vertical x = 1)' }
  ];

  /* ================= MOTOR ================= */

  /* evita valores proibidos pulando para o vizinho no sentido do movimento */
  function sanitize(cfg, v, prev) {
    (cfg.avoid || []).forEach(av => {
      if (Math.abs(v - av) < 1e-9) v = prev > av ? av - cfg.step : av + cfg.step;
    });
    return Math.round(v * 1e6) / 1e6;
  }

  function setup(card) {
    const def = TYPES[card.dataset.type];
    if (!def) return;
    const canvas = card.querySelector('canvas');
    const live = card.querySelector('.type-live');
    const box = card.querySelector('.sliders');
    const resetBtn = card.querySelector('.type-reset');

    const initial = {}, p = {}, inputs = {}, outs = {};

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
        const raw = parseFloat(input.value);
        const v = sanitize(cfg, raw, p[name]);
        if (v !== raw) input.value = v;
        p[name] = v;
        render();
      });
    });

    function render() {
      Object.keys(p).forEach(n => {
        const cfg = def.params[n];
        outs[n].textContent = cfg.choices ? cfg.choices[p[n]] : num(p[n]);
      });
      live.innerHTML = def.formula(p);

      const changed = Object.keys(p).some(n => p[n] !== initial[n]);
      const g = def.plot(p);
      const curves = g.curves.map((c, i) => Object.assign({ color: ACCENT, width: 2.8 }, c));
      if (def.ghost && changed) {
        curves.unshift(Object.assign({}, def.plot(initial).curves[0], { color: GHOST, dash: [6, 5], width: 1.6 }));
      }
      const view = typeof def.view === 'function' ? def.view(p) : def.view;
      Plot.draw(canvas, curves, Object.assign({
        showLegend: false, height: 300,
        markers: g.markers || [], lines: g.lines || [], fills: g.fills || []
      }, view));
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
