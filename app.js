/* === NEEDLEX FINAL – app.js === */

// Shortcuts
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

let ARTICLES = [];

/* === Grundfunktionen === */

// Jahr im Footer anzeigen
$('#year').textContent = new Date().getFullYear();

// Scroll-Reveal-Animation
const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('show');
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.1 });

$$('.reveal').forEach(el => io.observe(el));

// Scroll-Top-Button
const scrollBtn = document.createElement('button');
scrollBtn.id = 'scrollTop';
scrollBtn.textContent = '↑';
document.body.appendChild(scrollBtn);
window.addEventListener('scroll', () => {
  if (window.scrollY > 400) scrollBtn.classList.add('show');
  else scrollBtn.classList.remove('show');
});
scrollBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

/* === Dark-/Light-Mode === */
const modeToggle = $('#modeToggle');
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
modeToggle.textContent = savedTheme === 'dark' ? '🌗' : '🌞';

modeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  modeToggle.textContent = next === 'dark' ? '🌗' : '🌞';
});

/* === Daten laden === */
async function loadData() {
  const res = await fetch('data/articles.json', { cache: 'no-store' });
  ARTICLES = await res.json();
  ARTICLES.forEach(a => a._date = new Date(a.date));
  renderLatest();
  initSearch();
}
loadData();

/* === Neueste Artikel anzeigen === */
function renderLatest() {
  const list = $('#latestList');
  if (!list) return;
  const latest = [...ARTICLES].sort((a, b) => b._date - a._date).slice(0, 10);
  list.innerHTML = latest.map(a => `
    <a class="item" href="article.html?slug=${encodeURIComponent(a.slug)}">
      <strong>${a.title}</strong>
      <div class="meta">${a.category} • ${formatDate(a._date)}</div>
    </a>
  `).join('');
}

/* === Datum formatieren === */
function formatDate(d) {
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* === Suche mit Verlauf === */
function initSearch() {
  const input = $('#searchInput');
  const box = $('#suggestions');
  const recent = $('#recentSearches');
  if (!input || !box) return;

  const LS_KEY = 'needlex_recent_searches';
  let history = JSON.parse(localStorage.getItem(LS_KEY) || '[]');

  renderRecent();

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (q.length < 2) {
      box.hidden = true;
      return;
    }
    const hits = ARTICLES.filter(a =>
      a.title.toLowerCase().includes(q) ||
      (a.keywords || []).some(k => k.toLowerCase().includes(q))
    ).slice(0, 6);

    if (!hits.length) {
      box.hidden = true;
      return;
    }
    box.hidden = false;
    box.innerHTML = hits.map(h => `
      <a href="article.html?slug=${encodeURIComponent(h.slug)}">
        <strong>${highlight(h.title, q)}</strong>
        <div class="k">${h.category} • ${formatDate(h._date)}</div>
      </a>
    `).join('');
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const q = input.value.trim();
      if (!q) return;
      history.unshift(q);
      history = [...new Set(history)].slice(0, 5);
      localStorage.setItem(LS_KEY, JSON.stringify(history));
      renderRecent();
    }
  });

  function renderRecent() {
    if (!recent) return;
    if (!history.length) {
      recent.innerHTML = '';
      return;
    }
    recent.innerHTML = `<p>Letzte Suchen:</p>` + history.map(h => `<span>${h}</span>`).join('');
    recent.querySelectorAll('span').forEach(span => {
      span.addEventListener('click', () => {
        input.value = span.textContent;
        input.dispatchEvent(new Event('input'));
      });
    });
  }

  document.addEventListener('click', e => {
    if (!box.contains(e.target) && e.target !== input) {
      box.hidden = true;
    }
  });
}

/* === Text-Highlight === */
function highlight(text, q) {
  const i = text.toLowerCase().indexOf(q);
  if (i < 0) return text;
  return text.slice(0, i) + '<u>' + text.slice(i, i + q.length) + '</u>' + text.slice(i + q.length);
}
