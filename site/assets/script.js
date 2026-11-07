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

/* ---------- Departures board: split-flap cells that page through the list ---------- */
/* Each departure is packed into lines as wide as the board, words wrapping to a
   new line when one does not fit. Every few seconds the board flips to the next
   page; each cell steps through the few characters before its new one. */
document.querySelectorAll('.board').forEach((board) => {
  const flaps = board.querySelector('.board-flaps');
  const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const SEPARATOR = [...' — '].map((ch) => ({ ch, accent: false }));
  const HOLD = 4000;  // ms each page stays up
  const STEP = 55;    // ms per flap
  const STAGGER = 14; // ms between neighbouring cells
  const MAX_COLUMNS = 200; // hard cap, whatever the measurements say

  // Each item becomes a list of words; each word a list of { ch, accent }.
  const items = [...flaps.querySelectorAll('.board-item')].map((item) => {
    const chars = [...item.children].flatMap((part) =>
      [...part.textContent.toUpperCase()].map((ch) => ({ ch, accent: part.classList.contains('accent') })));
    const words = [[]];
    chars.forEach((c) => (c.ch === ' ' ? words.push([]) : words[words.length - 1].push(c)));
    return words.filter((word) => word.length);
  });

  let cells = [];
  let pages = [];
  let page = 0;
  let columns = 0;
  let timer = 0;
  let visible = false;

  // A space is red only when it sits between two red characters, as in 1.1 MS.
  const space = (before, after) => ({ ch: ' ', accent: Boolean(before[before.length - 1]?.accent && after[0]?.accent) });

  // Pack the items into lines of at most `width` characters.
  function packLines(width) {
    const lines = [];
    let line = [];
    const push = () => { if (line.length) lines.push(line); line = []; };

    items.forEach((words) => {
      const flat = words.flatMap((word, i) => (i ? [space(words[i - 1], word), ...word] : word));
      if (flat.length <= width) {
        const add = line.length ? [...SEPARATOR, ...flat] : flat;
        if (line.length + add.length > width) { push(); line = flat; } else { line = line.concat(add); }
        return;
      }
      // Too long for one line: start fresh and wrap word by word.
      push();
      words.forEach((word) => {
        const piece = word.slice(0, width);
        const add = line.length ? [space(line, piece), ...piece] : piece;
        if (line.length + add.length > width) { push(); line = piece; } else { line = line.concat(add); }
      });
      push();
    });
    push();
    return lines;
  }

  // Returns false, leaving the static line, when the tiles have no size yet:
  // Safari can run this before the stylesheet applies (often on a livereload),
  // and a 0px tile once meant Infinity columns and tiles until memory ran out.
  function build() {
    const rows = board.clientWidth < 560 ? 2 : 1;

    const probe = document.createElement('span');
    probe.className = 'flap';
    flaps.append(probe);
    const tile = probe.getBoundingClientRect().width;
    probe.remove();
    if (!(tile >= 4)) return false;

    flaps.textContent = '';
    flaps.classList.add('live');
    const gap = parseFloat(getComputedStyle(flaps).columnGap) || 0;
    columns = Math.min(MAX_COLUMNS, Math.max(8, Math.floor((flaps.clientWidth + gap) / (tile + gap))));
    flaps.style.setProperty('--columns', columns);

    const lines = packLines(columns);
    pages = [];
    for (let i = 0; i < lines.length; i += rows) pages.push(lines.slice(i, i + rows));

    cells = [];
    for (let i = 0; i < rows * columns; i += 1) {
      const el = document.createElement('span');
      el.className = 'flap';
      flaps.append(el);
      cells.push({ el, ch: ' ', run: 0, wait: 0 });
    }
    page = 0;
    show(pages[0]);
    return true;
  }

  function start() {
    if (!build()) return false;
    timer = setInterval(tick, HOLD);
    return true;
  }

  function setCell(cell, target) {
    cell.ch = target.ch;
    cell.el.textContent = target.ch === ' ' ? '' : target.ch;
    cell.el.classList.toggle('accent', target.accent);
  }

  // Cancel a flip that is running or still waiting for its turn.
  function stop(cell) {
    clearTimeout(cell.wait);
    clearInterval(cell.run);
  }

  function show(lines) {
    cells.forEach((cell, i) => {
      const row = Math.floor(i / columns);
      const target = (lines[row] || [])[i % columns] || { ch: ' ', accent: false };
      stop(cell);

      const same = cell.ch === target.ch && cell.el.classList.contains('accent') === target.accent;
      if (reducedMotion || same) { setCell(cell, target); return; }

      // Like a real flap unit, step through the characters in order and stop on
      // the target. Random letters could spell words on a neighbouring row.
      let steps = 3 + Math.floor(Math.random() * 6);
      const end = CHARSET.includes(target.ch) ? CHARSET.indexOf(target.ch) : CHARSET.length;
      cell.wait = setTimeout(() => {
        cell.el.classList.remove('accent');
        cell.run = setInterval(() => {
          if (steps === 0) {
            clearInterval(cell.run);
            setCell(cell, target);
          } else {
            cell.el.textContent = CHARSET[(end - steps + CHARSET.length * 2) % CHARSET.length];
          }
          // Two identical animations, alternated, so each flap restarts it.
          cell.el.classList.toggle('flip-a', steps % 2 === 0);
          cell.el.classList.toggle('flip-b', steps % 2 === 1);
          steps -= 1;
        }, STEP);
      }, i % columns * STAGGER + Math.floor(i / columns) * STAGGER * 4);
    });
  }

  function tick() {
    if (!visible || document.hidden || pages.length < 2) return;
    page = (page + 1) % pages.length;
    show(pages[page]);
  }

  // Too early: try again once the page, stylesheet included, has loaded.
  if (!start()) window.addEventListener('load', start, { once: true });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(board);
  } else {
    visible = true;
  }

  // Rebuild only when the number of cells per line changes.
  if ('ResizeObserver' in window) {
    let lastWidth = board.clientWidth;
    new ResizeObserver(() => {
      if (board.clientWidth === lastWidth) return;
      lastWidth = board.clientWidth;
      clearInterval(timer);
      cells.forEach(stop);
      start();
    }).observe(board);
  }
});
