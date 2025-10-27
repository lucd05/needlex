const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

const y = document.getElementById('year');
if (y) y.textContent = new Date().getFullYear();

const io = new IntersectionObserver((entries)=>{
  entries.forEach(e=>{
    if(e.isIntersecting){ e.target.classList.add('show'); io.unobserve(e.target); }
  });
},{threshold:0.12});
$$('.reveal').forEach(el=>io.observe(el));

let ARTICLES = [];
let CATEGORIES = ["Technik","Haushalt","Haustiere","Gesundheit","Finanzen"];

async function loadData(){
  const res = await fetch('data/articles.json', {cache:'no-store'});
  if(!res.ok) throw new Error('Konnte articles.json nicht laden');
  ARTICLES = await res.json();
  ARTICLES.forEach(a => a._date = new Date(a.date));
}
loadData().then(()=>{
  initHome();
  initArticle();
  initSearch();
}).catch(err=>{
  console.error(err);
});

function initHome(){
  if(!$('#categoryGrid')) return;
  const icons = {
    "Technik":"💻","Haushalt":"🏠","Haustiere":"🐾","Gesundheit":"⚕️","Finanzen":"💶"
  };
  const grid = $('#categoryGrid');
  grid.innerHTML = CATEGORIES.map(cat => {
    const count = ARTICLES.filter(a=>a.category===cat).length;
    return `
      <div class="card">
        <h3>${icons[cat]||"📚"} ${cat}</h3>
        <p>${count} Artikel</p>
      </div>
    `;
  }).join('');

  const top5 = [...ARTICLES].sort((a,b)=> (b.popularity||0)-(a.popularity||0)).slice(0,5);
  renderList('#topList', top5);

  const latest = [...ARTICLES].sort((a,b)=> b._date - a._date).slice(0,8);
  renderList('#latestList', latest);
}

function renderList(sel, arr){
  const el = $(sel);
  if(!el) return;
  el.innerHTML = arr.map(a=>`
    <a class="item" href="article.html?slug=${encodeURIComponent(a.slug)}">
      <div class="meta">
        <span class="chip">${a.category}</span>
        <time>${formatDate(a._date)}</time>
      </div>
      <strong>${a.title}</strong>
      <span style="color:#c8c8cc">${a.summary}</span>
    </a>
  `).join('');
}

function formatDate(d){
  try{
    return d.toLocaleDateString('de-DE', {year:'numeric', month:'short', day:'2-digit'});
  }catch{ return ''; }
}

function initArticle(){
  const card = $('#articleCard');
  if(!card) return;
  const params = new URLSearchParams(location.search);
  const slug = params.get('slug');
  if(!slug){
    card.querySelector('#articleTitle').textContent = 'Artikel nicht gefunden';
    return;
  }
  const a = ARTICLES.find(x=>x.slug===slug);
  if(!a){
    card.querySelector('#articleTitle').textContent = 'Artikel nicht gefunden';
    return;
  }
  $('#articleCategory').textContent = a.category;
  $('#articleCategory').href = 'index.html#' + a.category.toLowerCase();
  $('#articleDate').textContent = formatDate(a._date);
  $('#articleTitle').textContent = a.title;
  $('#articleSummary').textContent = a.summary;
  $('#articleQuick').textContent = a.quick_answer;
  $('#articleBody').innerHTML = a.body_html;
  const rel = ARTICLES
    .filter(x=> x.slug!==a.slug && (x.category===a.category || shareKeyword(x, a)))
    .slice(0,6);
  $('#relatedList').innerHTML = rel.map(r=>`
    <li><a href="article.html?slug=${encodeURIComponent(r.slug)}">${r.title}</a></li>
  `).join('');
}

function shareKeyword(a,b){
  const setA = new Set((a.keywords||[]).map(k=>k.toLowerCase()));
  return (b.keywords||[]).some(k=> setA.has(k.toLowerCase()));
}

function initSearch(){
  const input = $('#searchInput');
  const box = $('#suggestions');
  if(!input || !box) return;
  let last = 0;
  input.addEventListener('input', () => {
    const v = input.value.trim().toLowerCase();
    const now = Date.now();
    if(now - last < 120) return;
    last = now;
    if(v.length < 2){
      box.hidden = true;
      box.innerHTML = '';
      return;
    }
    const hits = searchArticles(v).slice(0,6);
    if(hits.length===0){
      box.hidden = true; box.innerHTML = '';
      return;
    }
    box.hidden = false;
    box.innerHTML = hits.map(h => `
      <a href="article.html?slug=${encodeURIComponent(h.slug)}">
        <div><strong>${highlight(h.title, v)}</strong></div>
        <div class="k">${h.category} • ${formatDate(h._date)} • Keywords: ${(h.keywords||[]).slice(0,3).join(', ')}</div>
      </a>
    `).join('');
  });
  document.addEventListener('click', (e)=>{
    if(!box.contains(e.target) && e.target !== input){
      box.hidden = true;
    }
  });
}

function highlight(text, q){
  const idx = text.toLowerCase().indexOf(q);
  if(idx<0) return text;
  return text.slice(0,idx) + '<u>' + text.slice(idx, idx+q.length) + '</u>' + text.slice(idx+q.length);
}

function tokenize(s){
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').split(/[^a-z0-9äöüß]+/).filter(Boolean);
}

function scoreForQuery(a, q){
  const qTokens = tokenize(q);
  const hay = [
    a.title, a.summary, a.category, (a.keywords||[]).join(' ')
  ].join(' ').toLowerCase();
  let score = 0;
  qTokens.forEach(t=>{
    if(hay.includes(t)) score += 5;
    if((a.keywords||[]).some(k=>k.toLowerCase()===t)) score += 4;
    if(a.title.toLowerCase().includes(t)) score += 6;
  });
  score += (a.popularity||0) * 0.5;
  const days = (Date.now() - a._date.getTime())/86400000;
  score += Math.max(0, 8 - Math.min(8, Math.floor(days/30)));
  return score;
}

function searchArticles(query){
  return [...ARTICLES]
    .map(a=>({ ...a, _score: scoreForQuery(a, query) }))
    .filter(x=>x._score>0)
    .sort((a,b)=> b._score - a._score);
}
