/* =========================================================
   Plot — gráficos em canvas puro (sem dependências externas).

   Uso:
     Plot.draw('meuCanvas', [
       { expr: 'x^2 - 4', color: '#34d399' },
       { expr: '2*x + 1', color: '#fbbf24', dash: [6, 4] }
     ], { xmin: -6, xmax: 6 });

   Opções:
     xmin, xmax        intervalo do eixo x (padrão -10..10)
     ymin, ymax        fixa o eixo y (senão, calcula automaticamente)
     height            altura do canvas em px (padrão 340)
     fills             [{ expr, from, to, color }] áreas sombreadas
     markers           [{ x, y, type: 'open'|'dot', label, color }]
     lines             [{ y: (x)=>..., color, dash, label }] retas
     showLegend        boolean (padrão true)
     xLabel, yLabel    rótulos dos eixos
   ========================================================= */

const Plot = (function () {
  'use strict';

  const PAD = 46;

  function niceStep(range, target) {
    const raw = range / (target || 6);
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag;
    const s = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
    return s * mag;
  }

  function fmtTick(v) {
    if (Math.abs(v) < 1e-9) return '0';
    const r = Math.round(v * 1e6) / 1e6;
    return String(r);
  }

  function sample(fn, x0, x1, n) {
    const pts = [];
    const step = (x1 - x0) / n;
    for (let i = 0; i <= n; i++) {
      const x = x0 + i * step;
      let y = NaN;
      try { y = fn(x); } catch (e) { y = NaN; }
      pts.push([x, typeof y === 'number' ? y : NaN]);
    }
    return pts;
  }

  /* faixa automática do eixo y */
  function autoY(specs, opts) {
    const n = 900;
    const all = [];
    specs.forEach(s => {
      sample(s.fn, opts.xmin, opts.xmax, n).forEach(p => {
        if (isFinite(p[1])) all.push(p[1]);
      });
    });
    (opts.fills || []).forEach(f => {
      sample(f.fn, Math.max(opts.xmin, f.from), Math.min(opts.xmax, f.to), 400)
        .forEach(p => { if (isFinite(p[1])) all.push(p[1]); });
    });
    if (!all.length) return [-5, 5];
    all.sort((a, b) => a - b);
    const lo = all[Math.floor(all.length * 0.01)];
    const hi = all[Math.floor(all.length * 0.99)];
    let ymin = Math.min(lo, 0);
    let ymax = Math.max(hi, 0);
    if (ymax - ymin < 1e-9) { ymin -= 1; ymax += 1; }
    const pad = (ymax - ymin) * 0.12;
    return [ymin - pad, ymax + pad];
  }

  function draw(canvas, specs, opts) {
    if (typeof canvas === 'string') canvas = document.getElementById(canvas);
    if (!canvas || !canvas.getContext) { console.error('Plot.draw: canvas inválido.', canvas); return; }
    opts = opts || {};
    specs = (specs || []).filter(s => s && (s.expr || s.fn));

    const resolved = specs.map((s, i) => Object.assign({}, s, {
      fn: s.fn || MathParser.safe(s.expr),
      color: s.color || ['#34d399', '#fbbf24', '#60a5fa', '#f472b6', '#c084fc'][i % 5],
      width: s.width || 2.4
    }));

    const ctx = canvas.getContext('2d');
    const cssW = canvas.clientWidth || 700;
    const cssH = opts.height || canvas.clientHeight || 340;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const o = {
      xmin: opts.xmin !== undefined ? opts.xmin : -10,
      xmax: opts.xmax !== undefined ? opts.xmax : 10
    };
    if (o.xmax <= o.xmin) o.xmax = o.xmin + 1;
    o.ymin = opts.ymin;
    o.ymax = opts.ymax;
    if (o.ymin === undefined || o.ymax === undefined) {
      const r = autoY(resolved, o);
      o.ymin = opts.ymin !== undefined ? opts.ymin : r[0];
      o.ymax = opts.ymax !== undefined ? opts.ymax : r[1];
    }
    if (o.ymax <= o.ymin) o.ymax = o.ymin + 1;

    const W = cssW, H = cssH;
    const px = x => PAD + (x - o.xmin) / (o.xmax - o.xmin) * (W - PAD * 2);
    const py = y => H - PAD - (y - o.ymin) / (o.ymax - o.ymin) * (H - PAD * 2);
    const yRange = o.ymax - o.ymin;

    /* fundo */
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#060a08';
    ctx.fillRect(0, 0, W, H);

    /* grade */
    const stepX = niceStep(o.xmax - o.xmin, 7);
    const stepY = niceStep(yRange, 6);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(16,185,129,0.10)';
    ctx.beginPath();
    for (let v = Math.ceil(o.xmin / stepX) * stepX; v <= o.xmax; v += stepX) {
      ctx.moveTo(px(v), PAD); ctx.lineTo(px(v), H - PAD);
    }
    for (let v = Math.ceil(o.ymin / stepY) * stepY; v <= o.ymax; v += stepY) {
      ctx.moveTo(PAD, py(v)); ctx.lineTo(W - PAD, py(v));
    }
    ctx.stroke();

    /* eixos */
    ctx.strokeStyle = 'rgba(110,231,183,0.75)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    if (o.ymin <= 0 && o.ymax >= 0) { ctx.moveTo(PAD, py(0)); ctx.lineTo(W - PAD, py(0)); }
    if (o.xmin <= 0 && o.xmax >= 0) { ctx.moveTo(px(0), PAD); ctx.lineTo(px(0), H - PAD); }
    ctx.stroke();

    /* rótulos dos eixos */
    ctx.fillStyle = 'rgba(139,165,152,0.95)';
    ctx.font = '11px Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    for (let v = Math.ceil(o.xmin / stepX) * stepX; v <= o.xmax; v += stepX) {
      if (Math.abs(v) < 1e-9) continue;
      ctx.fillText(fmtTick(v), px(v), py(0) + 15);
    }
    ctx.textAlign = 'right';
    for (let v = Math.ceil(o.ymin / stepY) * stepY; v <= o.ymax; v += stepY) {
      if (Math.abs(v) < 1e-9) continue;
      ctx.fillText(fmtTick(v), px(0) - 7, py(v) + 4);
    }
    ctx.fillStyle = 'rgba(110,231,183,0.9)';
    ctx.font = 'italic 12px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillText(opts.xLabel || 'x', W - PAD + 6, py(0) + 4);
    ctx.fillText(opts.yLabel || 'y', px(0) + 8, PAD - 6);

    /* áreas preenchidas (integrais) */
    (opts.fills || []).forEach(f => {
      const fn = f.fn || MathParser.safe(f.expr);
      const a = Math.max(o.xmin, f.from);
      const b = Math.min(o.xmax, f.to);
      if (b <= a) return;
      const pts = sample(fn, a, b, 500);
      ctx.save();
      ctx.beginPath();
      ctx.rect(PAD, PAD, W - PAD * 2, H - PAD * 2);
      ctx.clip();
      ctx.beginPath();
      let started = false;
      pts.forEach(p => {
        if (!isFinite(p[1])) { started = false; return; }
        const yy = Math.min(Math.max(p[1], o.ymin - yRange), o.ymax + yRange);
        if (!started) { ctx.moveTo(px(p[0]), py(yy)); started = true; }
        else ctx.lineTo(px(p[0]), py(yy));
      });
      ctx.lineTo(px(b), py(0));
      ctx.lineTo(px(a), py(0));
      ctx.closePath();
      ctx.fillStyle = f.color || 'rgba(16,185,129,0.28)';
      ctx.fill();
      ctx.restore();
    });

    /* curvas */
    ctx.save();
    ctx.beginPath();
    ctx.rect(PAD, PAD, W - PAD * 2, H - PAD * 2);
    ctx.clip();

    resolved.forEach(s => {
      const pts = sample(s.fn, o.xmin, o.xmax, 1400);
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width;
      if (s.dash) ctx.setLineDash(s.dash); else ctx.setLineDash([]);
      ctx.beginPath();
      let prevY = null;
      pts.forEach(p => {
        const x = p[0], y = p[1];
        const valid = isFinite(y) && Math.abs(y) < 1e7;
        if (!valid) { prevY = null; return; }
        const jump = prevY !== null && Math.abs(y - prevY) > yRange * 1.5;
        if (prevY === null || jump) ctx.moveTo(px(x), py(y));
        else ctx.lineTo(px(x), py(y));
        prevY = y;
      });
      ctx.stroke();
    });
    ctx.setLineDash([]);

    /* retas auxiliares (ex.: tangente) */
    (opts.lines || []).forEach(l => {
      ctx.strokeStyle = l.color || '#f472b6';
      ctx.lineWidth = l.width || 2;
      ctx.setLineDash(l.dash || [7, 5]);
      ctx.beginPath();
      if (l.vertical !== undefined) {
        ctx.moveTo(px(l.vertical), py(o.ymin));
        ctx.lineTo(px(l.vertical), py(o.ymax));
      } else {
        ctx.moveTo(px(o.xmin), py(l.fn(o.xmin)));
        ctx.lineTo(px(o.xmax), py(l.fn(o.xmax)));
      }
      ctx.stroke();
      ctx.setLineDash([]);
    });

    /* marcadores (ponto removido, ponto da função, ...) */
    (opts.markers || []).forEach(m => {
      if (!isFinite(m.x) || !isFinite(m.y)) return;
      if (m.x < o.xmin || m.x > o.xmax || m.y < o.ymin || m.y > o.ymax) return;
      const col = m.color || '#fbbf24';
      ctx.beginPath();
      ctx.arc(px(m.x), py(m.y), 6, 0, Math.PI * 2);
      if (m.type === 'open') {
        ctx.fillStyle = '#060a08';
        ctx.fill();
        ctx.strokeStyle = col;
        ctx.lineWidth = 2.4;
        ctx.stroke();
      } else {
        ctx.fillStyle = col;
        ctx.fill();
      }
      if (m.label) {
        ctx.fillStyle = col;
        ctx.font = '12px Segoe UI, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(m.label, px(m.x) + 10, py(m.y) - 8);
      }
    });

    ctx.restore();

    /* legenda */
    const legendItems = [];
    resolved.forEach(s => {
      if (s.label) legendItems.push({ color: s.color, label: s.label, dash: s.dash });
    });
    (opts.lines || []).forEach(l => {
      if (l.label) legendItems.push({ color: l.color || '#f472b6', label: l.label, dash: [7, 5] });
    });
    (opts.fills || []).forEach(f => {
      if (f.label) legendItems.push({ color: f.color || 'rgba(16,185,129,0.45)', label: f.label, fill: true });
    });

    if (legendItems.length && opts.showLegend !== false) {
      ctx.font = '12px Segoe UI, sans-serif';
      let lx = PAD + 10, ly = 12;
      const boxW = Math.max(...legendItems.map(it => ctx.measureText(it.label).width)) + 34;
      const boxH = legendItems.length * 20 + 12;
      ctx.fillStyle = 'rgba(5,7,6,0.82)';
      ctx.strokeStyle = 'rgba(16,185,129,0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(lx - 6, ly, boxW, boxH, 8);
      ctx.fill();
      ctx.stroke();
      legendItems.forEach(it => {
        ly += 20;
        ctx.strokeStyle = it.color;
        ctx.lineWidth = it.fill ? 8 : 2.6;
        if (it.dash) ctx.setLineDash(it.dash); else ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(lx, ly - 5);
        ctx.lineTo(lx + 18, ly - 5);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#d9e8e0';
        ctx.textAlign = 'left';
        ctx.fillText(it.label, lx + 26, ly - 1);
      });
    }

    /* moldura */
    ctx.strokeStyle = 'rgba(16,185,129,0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(PAD, PAD, W - PAD * 2, H - PAD * 2);
  }

  /** Derivada numérica (para tangentes) */
  function derivative(fn, x) {
    const h = 1e-5;
    return (fn(x + h) - fn(x - h)) / (2 * h);
  }

  /** Integral numérica de Simpson */
  function integral(fn, a, b, n) {
    n = n && n % 2 === 0 ? n : 2000;
    if (a === b) return 0;
    if (a > b) { const t = a; a = b; b = t; }
    const h = (b - a) / n;
    let sum = fn(a) + fn(b);
    for (let i = 1; i < n; i++) sum += fn(a + i * h) * (i % 2 === 0 ? 2 : 4);
    return sum * h / 3;
  }

  return { draw, derivative, integral };
})();
