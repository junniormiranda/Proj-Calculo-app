/* =========================================================
   MathParser — avalia expressões matemáticas digitadas pelo
   usuário (ex.: "2*x^2 - 3*x + 1", "sin(x)/x", "(x^2-9)/(x-3)")
   Suporte: + - * / ^, parênteses, constantes, funções.
   ========================================================= */

const MathParser = (function () {
  'use strict';

  const FUNCS = {
    sin: Math.sin, cos: Math.cos, tan: Math.tan,
    asin: Math.asin, acos: Math.acos, atan: Math.atan,
    ln: Math.log, log: Math.log10, log10: Math.log10,
    sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs,
    exp: Math.exp, floor: Math.floor, ceil: Math.ceil,
    round: Math.round, sign: Math.sign, tanh: Math.tanh
  };

  const CONSTS = { pi: Math.PI, PI: Math.PI, e: Math.E };

  const PREC = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 3, 'u-': 3, 'u+': 3 };
  const RIGHT = { '^': true, 'u-': true, 'u+': true };

  /* ---------- tokenização ---------- */
  function tokenize(src) {
    const tokens = [];
    let i = 0;
    while (i < src.length) {
      const c = src[i];
      if (/\s/.test(c)) { i++; continue; }

      if (/[0-9.]/.test(c)) {
        let j = i;
        while (j < src.length && /[0-9.]/.test(src[j])) j++;
        const raw = src.slice(i, j);
        const value = parseFloat(raw);
        if (!isFinite(value)) throw new Error('Número inválido: "' + raw + '"');
        tokens.push({ type: 'num', value });
        i = j;
        continue;
      }

      if (/[a-zA-Z_]/.test(c)) {
        let j = i;
        while (j < src.length && /[a-zA-Z0-9_]/.test(src[j])) j++;
        const name = src.slice(i, j);
        let k = j;
        while (k < src.length && /\s/.test(src[k])) k++;
        const isCall = src[k] === '(' && FUNCS[name];
        if (isCall) {
          tokens.push({ type: 'func', name });
        } else if (Object.prototype.hasOwnProperty.call(CONSTS, name)) {
          tokens.push({ type: 'num', value: CONSTS[name] });
        } else {
          tokens.push({ type: 'var', name });
        }
        i = j;
        continue;
      }

      if ('+-*/^()'.includes(c)) {
        tokens.push({ type: c === '(' ? 'lparen' : c === ')' ? 'rparen' : 'op', value: c });
        i++;
        continue;
      }

      throw new Error('Caractere inválido: "' + c + '"');
    }
    return tokens;
  }

  /* ---------- multiplicação implícita: 2x, 3(x+1), 2sin(x) ---------- */
  function implicitMultiply(tokens) {
    const out = [];
    const prevOk = t => t && (t.type === 'num' || t.type === 'rparen' || t.type === 'var');
    const curOk = t => t && (t.type === 'num' || t.type === 'lparen' || t.type === 'var' || t.type === 'func');
    for (let i = 0; i < tokens.length; i++) {
      if (prevOk(out[out.length - 1]) && curOk(tokens[i])) {
        out.push({ type: 'op', value: '*' });
      }
      out.push(tokens[i]);
    }
    return out;
  }

  /* ---------- shunting-yard para RPN ---------- */
  function toRPN(tokens) {
    const out = [];
    const stack = [];
    let expectOperand = true;

    for (const t of tokens) {
      if (t.type === 'num' || t.type === 'var') {
        out.push(t);
        expectOperand = false;
      } else if (t.type === 'func') {
        stack.push(t);
        expectOperand = true;
      } else if (t.type === 'lparen') {
        stack.push(t);
        expectOperand = true;
      } else if (t.type === 'rparen') {
        while (stack.length && stack[stack.length - 1].type !== 'lparen') out.push(stack.pop());
        if (!stack.length) throw new Error('Parênteses desbalanceados.');
        stack.pop(); // remove "("
        if (stack.length && stack[stack.length - 1].type === 'func') out.push(stack.pop());
        expectOperand = false;
      } else if (t.type === 'op') {
        if (expectOperand && (t.value === '-' || t.value === '+')) {
          if (t.value === '-') stack.push({ type: 'op', value: 'u-' });
          // "+" unário é ignorado (identidade)
          expectOperand = true;
          continue;
        }
        if (expectOperand && t.value !== '-') {
          throw new Error('Expressão mal formada perto de "' + t.value + '".');
        }
        while (stack.length) {
          const top = stack[stack.length - 1];
          if (top.type === 'lparen') break;
          const pTop = PREC[top.value];
          const pCur = PREC[t.value];
          const pop = pTop > pCur || (pTop === pCur && !RIGHT[t.value]);
          if (!pop) break;
          out.push(stack.pop());
        }
        stack.push(t);
        expectOperand = true;
      }
    }

    while (stack.length) {
      const t = stack.pop();
      if (t.type === 'lparen') throw new Error('Parênteses desbalanceados.');
      out.push(t);
    }
    return out;
  }

  /* ---------- avaliação do RPN ---------- */
  function evalRPN(rpn, vars) {
    const st = [];
    for (const t of rpn) {
      if (t.type === 'num') { st.push(t.value); continue; }
      if (t.type === 'var') {
        if (Object.prototype.hasOwnProperty.call(vars, t.name)) { st.push(vars[t.name]); continue; }
        throw new Error('Valor não informado para "' + t.name + '".');
      }
      if (t.type === 'func') {
        const a = st.pop();
        if (a === undefined) throw new Error('Falta o argumento de ' + t.name + '().');
        st.push(FUNCS[t.name](a));
        continue;
      }
      if (t.value === 'u-') { st.push(-st.pop()); continue; }
      if (t.value === 'u+') { st.push(st.pop()); continue; }
      const b = st.pop();
      const a = st.pop();
      if (a === undefined || b === undefined) throw new Error('Expressão mal formada.');
      switch (t.value) {
        case '+': st.push(a + b); break;
        case '-': st.push(a - b); break;
        case '*': st.push(a * b); break;
        case '/': st.push(a / b); break;
        case '^': st.push(Math.pow(a, b)); break;
        default: throw new Error('Operador desconhecido.');
      }
    }
    if (st.length !== 1) throw new Error('Expressão mal formada.');
    return st[0];
  }

  /** Compila uma expressão em uma função (vars) => número */
  function compile(expr) {
    const rpn = toRPN(implicitMultiply(tokenize(expr)));
    return function (vars) { return evalRPN(rpn, vars || {}); };
  }

  /** Avalia uma expressão com as variáveis informadas. */
  function evaluate(expr, vars) {
    return compile(expr)(vars || {});
  }

  /** Avalia tratando erros como NaN (útil para gráficos). */
  function safe(expr) {
    let fn;
    try { fn = compile(expr); } catch (e) { return function () { return NaN; }; }
    return function (x) {
      try {
        const v = fn({ x: x });
        return typeof v === 'number' ? v : NaN;
      } catch (e) { return NaN; }
    };
  }

  /** Formata um número para exibição. */
  function format(n) {
    if (typeof n !== 'number' || Number.isNaN(n)) return 'indeterminado';
    if (!isFinite(n)) return n > 0 ? '∞' : '-∞';
    const a = Math.abs(n);
    if (a !== 0 && (a < 1e-4 || a >= 1e7)) return n.toExponential(4);
    const r = Math.round(n * 1e6) / 1e6;
    return String(r);
  }

  return { compile, evaluate, safe, format, FUNCS, CONSTS };
})();
