const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Animate sections as they scroll into view ---------- */
if (!reducedMotion && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;

      entry.target.classList.remove('wait');
      entry.target.classList.add('in');
      observer.unobserve(entry.target);
    });
  }, { threshold: .12 });

  document.querySelectorAll('.reveal').forEach((element) => {
    element.classList.add('wait');
    observer.observe(element);
  });
}

/* ---------- ConeSortium card: tap once to read the withheld words ---------- */
/* Hover reveals them with a mouse. On touch there is no hover, so the first tap
   lifts the bars and the second follows the link. */
document.querySelectorAll('.conesortium').forEach((card) => {
  let touched = false;
  card.addEventListener('pointerdown', (event) => { touched = event.pointerType === 'touch'; });
  card.addEventListener('click', (event) => {
    if (!touched || card.classList.contains('open')) return;
    event.preventDefault();
    card.classList.add('open');
  });
});
