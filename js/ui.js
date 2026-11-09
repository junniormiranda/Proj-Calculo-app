/* =========================================================
   UI compartilhada: menu mobile, sumário ativo, voltar ao topo
   ========================================================= */
(function () {
  'use strict';

  /* ---- menu mobile ---- */
  const nav = document.querySelector('.navbar');
  const toggle = document.querySelector('.nav-toggle');
  if (nav && toggle) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.querySelectorAll('.nav-links a').forEach(a =>
      a.addEventListener('click', () => nav.classList.remove('open')));
  }

  /* ---- sumário: destaca a seção visível ---- */
  const tocLinks = Array.from(document.querySelectorAll('#sumario a[href^="#"]'));
  if (tocLinks.length && 'IntersectionObserver' in window) {
    const byId = new Map();
    tocLinks.forEach(a => {
      const el = document.getElementById(a.getAttribute('href').slice(1));
      if (el) byId.set(el, a);
    });
    const visible = new Set();
    const setCurrent = () => {
      let best = null;
      byId.forEach((a, el) => {
        if (visible.has(el) && (!best || el.offsetTop < best.offsetTop)) best = el;
      });
      if (!best) return;
      tocLinks.forEach(a => a.classList.remove('current'));
      const link = byId.get(best);
      link.classList.add('current');
      const bar = link.parentElement;
      if (bar && bar.scrollWidth > bar.clientWidth) {
        bar.scrollTo({ left: link.offsetLeft - bar.clientWidth / 2 + link.offsetWidth / 2, behavior: 'smooth' });
      }
    };
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)));
      setCurrent();
    }, { rootMargin: '-140px 0px -55% 0px' });
    byId.forEach((_, el) => io.observe(el));
  }

  /* ---- voltar ao topo ---- */
  const btn = document.createElement('button');
  btn.className = 'to-top';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Voltar ao topo');
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  document.body.appendChild(btn);
  const onScroll = () => btn.classList.toggle('show', window.scrollY > 600);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
