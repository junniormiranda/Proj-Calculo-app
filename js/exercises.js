/* =========================================================
   Exercises — verifica automaticamente os exercícios com
   entrada numérica.

   Como usar no HTML:

   <div class="exercise" data-expect="a*x0+b" data-tol="0.01">
     <p class="q-title">Questão 1 ...</p>
     <div class="inputs-row">
       <div class="field"><label>a</label><input type="number" data-var="a" step="any"></div>
       <div class="field"><label>x₀</label><input type="number" data-var="x0" step="any"></div>
       <div class="field answer-field"><label>f(x₀)</label>
         <input type="number" data-answer step="any" placeholder="sua resposta"></div>
     </div>
     <div class="actions">
       <button class="btn small btn-check">Verificar</button>
       <button class="btn small ghost btn-solution">Ver solução</button>
       <button class="btn small ghost btn-reset">Limpar</button>
     </div>
     <div class="feedback"></div>
     <div class="solution"> ... passo a passo ... </div>
   </div>

   - data-expect: expressões esperadas separadas por ";" (uma por campo
     com data-answer, na mesma ordem).
   - data-tol: tolerância numérica (padrão 0.01).
   ========================================================= */

(function () {
  'use strict';

  function readVars(root) {
    const vars = {};
    let missing = null;
    root.querySelectorAll('[data-var]').forEach(inp => {
      const raw = inp.value.trim();
      if (raw === '') { if (!missing) missing = inp.dataset.var; return; }
      const v = parseFloat(raw);
      if (Number.isNaN(v)) { if (!missing) missing = inp.dataset.var; return; }
      vars[inp.dataset.var] = v;
    });
    return { vars, missing };
  }

  function showFeedback(el, kind, html) {
    el.className = 'feedback show ' + kind;
    el.innerHTML = html;
  }

  /* ---------------------------------------------------------
     Gráfico exibido quando o exercício é resolvido.
     data-plot="fn: a*x + b | point: x0, a*x0 + b | x: -5, 5"
       fn      expressão em x (usa as variáveis do exercício)
       point   ponto destacado "x, y" (pode repetir)
       hole    bolinha aberta "x, y" (limite)
       tangent abscissa do ponto de tangência
       area    intervalo sombreado "de, até"
       hline   reta horizontal y = valor (assíntota)
       vline   reta vertical x = valor (assíntota)
       x / y   janela "mín, máx" (opcional)
       caption legenda acima do gráfico
     --------------------------------------------------------- */
  function parsePlotSpec(str) {
    const spec = [];
    str.split('|').forEach(part => {
      const i = part.indexOf(':');
      if (i < 0) return;
      spec.push({ key: part.slice(0, i).trim(), val: part.slice(i + 1).trim() });
    });
    return spec;
  }

  function renderPlot(root, vars) {
    const raw = root.dataset.plot;
    if (!raw || typeof Plot === 'undefined') return;
    removePlot(root);

    const ev = e => MathParser.evaluate(e, vars);
    const pair = v => v.split(',').map(s => ev(s.trim()));
    const fmt = n => MathParser.format(Math.round(n * 1e4) / 1e4);

    let fnExpr = null, caption = null, xr = null, yr = null, tangentY = null;
    const markers = [], lines = [], fills = [], xs = [];

    try {
      const spec = parsePlotSpec(raw);
      const fnItem = spec.find(s => s.key === 'fn');
      if (!fnItem) return;
      fnExpr = fnItem.val;
      const compiled = MathParser.compile(fnExpr);
      const f = x => {
        try { const v = compiled(Object.assign({}, vars, { x: x })); return isFinite(v) ? v : NaN; }
        catch (e) { return NaN; }
      };

      spec.forEach(({ key, val }) => {
        if (key === 'point' || key === 'hole') {
          const [x, y] = pair(val);
          xs.push(x);
          markers.push({ x, y, type: key === 'hole' ? 'open' : 'dot', label: '(' + fmt(x) + ', ' + fmt(y) + ')' });
        } else if (key === 'tangent') {
          const x0 = ev(val), y0 = f(x0), m = Plot.derivative(f, x0);
          xs.push(x0);
          const sx = Math.abs(x0) < 1e-9 ? 'x' : '(x ' + (x0 < 0 ? '+ ' : '− ') + fmt(Math.abs(x0)) + ')';
          const sy = Math.abs(y0) < 1e-9 ? '' : (y0 < 0 ? ' − ' : ' + ') + fmt(Math.abs(y0));
          lines.push({ fn: x => y0 + m * (x - x0), color: '#f472b6', label: 'tangente: y = ' + fmt(m) + '·' + sx + sy });
          // janela vertical centrada no ponto de tangência
          const h = Math.max(3, Math.abs(m) * 2.4);
          tangentY = [y0 - h, y0 + h];
          markers.push({ x: x0, y: y0, type: 'dot', color: '#f472b6', label: '(' + fmt(x0) + ', ' + fmt(y0) + ')' });
        } else if (key === 'area') {
          const [a, b] = pair(val);
          xs.push(a, b);
          fills.push({ fn: f, expr: fnExpr, from: Math.min(a, b), to: Math.max(a, b), color: 'rgba(251,146,60,0.28)', label: 'área de ' + fmt(a) + ' a ' + fmt(b) });
        } else if (key === 'hline') {
          const c = ev(val);
          lines.push({ fn: () => c, color: '#38bdf8', dash: [6, 5], label: 'y = ' + fmt(c) });
        } else if (key === 'vline') {
          lines.push({ vertical: ev(val), color: 'rgba(56,189,248,0.6)' });
        } else if (key === 'x') xr = pair(val);
        else if (key === 'y') yr = pair(val);
        else if (key === 'caption') caption = val;
      });

      if (!xr || !xr.every(isFinite)) {
        if (xs.length) {
          const lo = Math.min.apply(null, xs), hi = Math.max.apply(null, xs);
          const pad = Math.max(3, (hi - lo) * 0.35);
          xr = [lo - pad, hi + pad];
        } else xr = [-6, 6];
      }

      const box = document.createElement('div');
      box.className = 'ex-plot';
      box.innerHTML = '<p class="ex-plot-title">' + (caption || 'Visualização da sua resposta') + '</p><canvas></canvas>';
      const anchor = root.querySelector('.feedback');
      anchor.parentNode.insertBefore(box, anchor.nextSibling);

      const opts = { xmin: xr[0], xmax: xr[1], height: 300, markers, lines, fills };
      if ((!yr || !yr.every(isFinite)) && tangentY && tangentY.every(isFinite)) yr = tangentY;
      if (yr && yr.every(isFinite)) { opts.ymin = Math.min(yr[0], yr[1]); opts.ymax = Math.max(yr[0], yr[1]); }
      Plot.draw(box.querySelector('canvas'), [{ fn: f, expr: fnExpr, color: '#fb923c', label: 'f(x)' }], opts);
    } catch (e) {
      console.warn('Gráfico do exercício não pôde ser gerado:', e);
      removePlot(root);
    }
  }

  function removePlot(root) {
    root.querySelectorAll('.ex-plot').forEach(el => el.remove());
  }

  function initExercise(root) {
    const expects = (root.dataset.expect || '').split(';').map(s => s.trim()).filter(Boolean);
    const tol = parseFloat(root.dataset.tol || '0.01');
    const successMsg = root.dataset.success || '<strong>Correto!</strong> Resposta certa. 🎉';
    const feedback = root.querySelector('.feedback');
    const solution = root.querySelector('.solution');
    const answers = Array.from(root.querySelectorAll('[data-answer]'));
    let attempts = 0;

    const check = () => {
      const { vars, missing } = readVars(root);
      if (missing) {
        showFeedback(feedback, 'err', 'Preencha o campo <strong>' + missing + '</strong> antes de verificar.');
        return;
      }

      let userValues = [];
      for (let i = 0; i < answers.length; i++) {
        const raw = answers[i].value.trim();
        if (raw === '') {
          showFeedback(feedback, 'err', 'Digite a sua resposta antes de verificar.');
          answers[i].focus();
          return;
        }
        const v = parseFloat(raw);
        if (Number.isNaN(v)) {
          showFeedback(feedback, 'err', 'Resposta inválida: digite apenas <strong>número</strong>.');
          answers[i].focus();
          return;
        }
        userValues.push(v);
      }

      if (!expects.length) {
        showFeedback(feedback, 'err', 'Este exercício não está configurado (data-expect).');
        return;
      }

      const wrong = [];
      for (let i = 0; i < expects.length; i++) {
        let expected;
        try {
          expected = MathParser.evaluate(expects[i], vars);
        } catch (e) {
          showFeedback(feedback, 'err', 'Erro na configuração: ' + e.message);
          return;
        }
        const user = userValues[i];
        const t = answers[i] && answers[i].dataset.tol
          ? parseFloat(answers[i].dataset.tol)
          : tol;
        if (!isFinite(expected) || Math.abs(expected - user) > Math.abs(t)) {
          wrong.push({ i, expected });
        }
      }

      if (!wrong.length) {
        attempts = 0;
        showFeedback(feedback, 'ok', successMsg);
        if (solution) solution.classList.add('show');
        root.classList.add('solved');
        renderPlot(root, vars);
        return;
      }

      removePlot(root);
      root.classList.remove('solved');
      attempts++;
      let msg = attempts === 1
        ? '<strong>Incorreto.</strong> Revise os passos e tente novamente.'
        : '<strong>Ainda não.</strong> Confira os sinais e os cálculos.';
      if (attempts >= 2) msg += ' A solução passo a passo está disponível abaixo — clique em <em>Ver solução</em>.';
      showFeedback(feedback, 'err', msg);
      if (attempts >= 3 && solution) solution.classList.add('show');
    };

    const btnCheck = root.querySelector('.btn-check');
    if (btnCheck) btnCheck.addEventListener('click', check);

    const btnSol = root.querySelector('.btn-solution');
    if (btnSol) btnSol.addEventListener('click', () => {
      if (!solution) return;
      const open = solution.classList.toggle('show');
      btnSol.textContent = open ? 'Ocultar solução' : 'Ver solução';
    });

    const btnReset = root.querySelector('.btn-reset');
    if (btnReset) btnReset.addEventListener('click', () => {
      root.querySelectorAll('input').forEach(i => { i.value = ''; });
      attempts = 0;
      feedback.className = 'feedback';
      feedback.innerHTML = '';
      if (solution) solution.classList.remove('show');
      if (btnSol) btnSol.textContent = 'Ver solução';
      root.classList.remove('solved');
      removePlot(root);
    });

    // Enter verifica
    root.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); check(); }
    });
  }

  function init() {
    document.querySelectorAll('.exercise[data-expect]').forEach(initExercise);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.Exercises = { init };
})();
