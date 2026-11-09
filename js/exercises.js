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
        return;
      }

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
