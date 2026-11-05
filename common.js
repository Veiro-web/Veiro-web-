// Wspólny, lekki skrypt dla podstron usług (bez formularza i mapy).
// Zawiera tylko: rok w stopce + bezpieczną animację pojawiania się sekcji.

// ===== Rok w stopce =====
(function () {
  const yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
})();

// ===== Umiarkowane animacje pojawiania się sekcji przy przewijaniu =====
// Ta sama, bezpieczna logika co na stronie głównej: treść jest domyślnie
// widoczna; JS dodaje .reveal-on tylko gdy observer faktycznie działa,
// a elementy już widoczne na starcie pokazują się natychmiast. Gdyby
// cokolwiek zawiodło — nic nie zostaje trwale ukryte.
(function () {
  const revealEls = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  if (!revealEls.length) return;

  function markVisible(el) {
    el.classList.add('is-visible');
  }
  function showAll() {
    revealEls.forEach(markVisible);
  }

  const prefersReduced =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReduced || !('IntersectionObserver' in window)) {
    return;
  }

  const root = document.documentElement;
  root.classList.add('reveal-on');

  function reveal(el, obs) {
    markVisible(el);
    if (obs) obs.unobserve(el);
  }

  try {
    const observer = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) reveal(entry.target, obs);
        });
      },
      { threshold: 0, rootMargin: '0px 0px -8% 0px' }
    );

    const vh = window.innerHeight || document.documentElement.clientHeight;
    revealEls.forEach(function (el) {
      const top = el.getBoundingClientRect().top;
      if (top < vh * 0.95) {
        markVisible(el);
      } else {
        observer.observe(el);
      }
    });
  } catch (err) {
    showAll();
    return;
  }

  window.setTimeout(showAll, 3000);
})();
