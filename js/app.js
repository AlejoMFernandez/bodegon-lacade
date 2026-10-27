// Bodegón LACADÉ · demo — JS propio de la web (el kit maneja datos, carrito, reservas y panel).
import { initKit } from '../kit/kit.js?v=18';
import { popup } from '../kit/core/ui.js';

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const html = document.documentElement;
const desk = matchMedia('(min-width: 900px)');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const espera = (ms) => new Promise(r => setTimeout(r, ms));
const TZ = 'America/Argentina/Buenos_Aires';

// =====================================================================
// INTRO: el LCD se entinta, se arma el sello y se abre en dos
// =====================================================================
async function intro() {
  const el = $('#intro');
  if (!html.classList.contains('con-intro') || !el) { html.classList.add('listo'); return; }
  const corto = !desk.matches;
  const t = corto ? [30, 420, 900, 1000] : [60, 650, 1300, 1380];
  const inicio = performance.now();
  const heroImg = $('.hero__foto img');
  const listos = Promise.all([
    document.fonts ? document.fonts.ready.catch(() => {}) : null,
    heroImg && !heroImg.complete ? new Promise(r => { heroImg.addEventListener('load', r, { once: true }); heroImg.addEventListener('error', r, { once: true }); }) : null,
  ]);
  await espera(t[0]); el.classList.add('p1');
  await espera(t[1] - t[0]); el.classList.add('p2');
  await espera(t[2] - t[1]);
  // no se abre hasta tener fuentes y foto, pero nunca más de 2,6 s en total
  await Promise.race([listos, espera(Math.max(0, 2600 - (performance.now() - inicio)))]);
  el.classList.add('p3');
  await espera(t[3] - t[2]); el.classList.add('p4');
  html.classList.add('listo');
  await espera(corto ? 620 : 720);
  html.classList.remove('con-intro');
  el.classList.add('fin');
}

// =====================================================================
// BARRA, MENÚ Y ENTRADAS
// =====================================================================
function barra() {
  const b = $('#barra'); const hero = $('.hero');
  const pintar = () => b.classList.toggle('solida', scrollY > Math.min(hero.offsetHeight - 120, innerHeight * .7));
  addEventListener('scroll', () => requestAnimationFrame(pintar), { passive: true }); pintar();

  const menu = $('#menu'); const btn = $('[data-menu]');
  let y = 0;
  const abrir = (si) => {
    if (si) { y = scrollY; document.body.style.cssText = `position:fixed;top:-${y}px;left:0;right:0`; menu.hidden = false; }
    else { document.body.style.cssText = ''; menu.hidden = true; scrollTo({ top: y, behavior: 'instant' }); }
    html.classList.toggle('menu-abierto', si); btn.setAttribute('aria-expanded', si); btn.setAttribute('aria-label', si ? 'Cerrar menú' : 'Abrir menú');
  };
  btn.addEventListener('click', () => abrir(menu.hidden));
  menu.addEventListener('click', (e) => { const a = e.target.closest('a'); if (!a) return; e.preventDefault(); abrir(false); setTimeout(() => $(a.getAttribute('href'))?.scrollIntoView({ behavior: 'smooth' }), 30); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) abrir(false); });
  const ancho = matchMedia('(min-width: 1200px)'); ancho.addEventListener('change', () => { if (ancho.matches && !menu.hidden) abrir(false); });
  // link activo según la sección a la vista
  const links = $$('.barra__nav a');
  const io = new IntersectionObserver((es) => es.forEach(en => { if (en.isIntersecting) links.forEach(a => a.classList.toggle('activo', a.getAttribute('href') === '#' + en.target.id)); }), { rootMargin: '-45% 0px -50% 0px' });
  links.forEach(a => { const s = $(a.getAttribute('href')); if (s) io.observe(s); });
}

function entradas(root = document) {
  const io = new IntersectionObserver((es) => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('visto'); io.unobserve(en.target); } }), { threshold: .18, rootMargin: '0px 0px -6% 0px' });
  $$('.reveal, .seccion .titulo, .reveal-foto, .linea-estrella', root).forEach(el => { if (!el.classList.contains('visto')) io.observe(el); });
  // las animaciones infinitas se pausan fuera de pantalla
  const vis = new IntersectionObserver((es) => es.forEach(en => en.target.classList.toggle('fuera', !en.isIntersecting)));
  $$('.hero, .cumple').forEach(el => vis.observe(el));
  // el mapa se carga recién cuando se acerca
  const ifr = $('iframe[data-src]');
  if (ifr) new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { ifr.src = ifr.dataset.src; o.disconnect(); } }, { rootMargin: '400px' }).observe(ifr);
}

// arrastrar con el mouse las filas deslizables (en el celu ya se deslizan con el dedo)
function arrastre() {
  $$('[data-arrastre]').forEach(fila => {
    let x0 = 0, s0 = 0, activo = false, movio = false;
    fila.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse' || fila.scrollWidth <= fila.clientWidth || e.target.closest('button, a, input')) return; activo = true; movio = false; x0 = e.clientX; s0 = fila.scrollLeft; fila.style.scrollSnapType = 'none'; fila.style.cursor = 'grabbing'; });
    addEventListener('pointermove', (e) => { if (!activo) return; const dx = e.clientX - x0; if (Math.abs(dx) > 4) movio = true; fila.scrollLeft = s0 - dx; });
    addEventListener('pointerup', () => { if (!activo) return; activo = false; fila.style.cursor = ''; fila.style.scrollSnapType = ''; });
    fila.addEventListener('click', (e) => { if (movio) { e.preventDefault(); e.stopPropagation(); movio = false; } }, true);
  });
}

// =====================================================================
// EL RELOJ: la web cambia según la hora del bodegón
// =====================================================================
const MOMENTOS = {
  manana: {
    img: 'salon', alt: 'El salón celeste y blanco de la sede, listo para el desayuno', chip: 'El salón de la sede · cafetería desde las 9',
    kicker: '★ Desayunos, meriendas y brunch ★', sub: 'Desde las 9: cafetería, combos y brunch para dos. Si sos socio, 10 % pagando en efectivo.',
    cta: { txt: 'Ver la cafetería', carta: 'cafeteria' }, cta2: { txt: 'Reservá tu mesa', reservar: true },
  },
  mediodia: {
    img: 'bife', alt: 'Gran Bife Costas con huevo frito, panceta y provoleta sobre mantel a rayas', chip: 'Gran Bife “Costas” · 600 g · panceta, provoleta y huevo',
    kicker: '★ Sede Villa del Parque ★', sub: 'Milanesas para cuatro, el Gran Bife “Costas” y el Volcán “Chelo Díaz”, en la sede de Racing de Nogoyá 3065. Apto para no socios.',
    cta: { txt: 'Reservá el almuerzo', reservar: true }, cta2: { txt: 'Ver la carta', carta: 'almuerzo-cena' },
  },
  noche: {
    img: 'cielito', alt: 'El cielito de Costas, trago celeste en copa con el logo de Lacadé', chip: 'El cielito de Costas · vodka, Blue curaçao y espumante',
    kicker: '★ Primer y segundo tiempo ★', sub: 'Cena en dos tandas: primer tiempo desde las 20 y segundo desde las 22:15. Muchachos, traigan vino.',
    cta: { txt: 'Reservá la cena', reservar: true }, cta2: { txt: 'Ver la carta', carta: 'almuerzo-cena' },
  },
};
function ahoraBA() {
  const p = {}; new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', minute: 'numeric', weekday: 'short', hourCycle: 'h23' }).formatToParts(new Date()).forEach(x => { p[x.type] = x.value; });
  return { min: Number(p.hour) * 60 + Number(p.minute), dia: p.weekday };
}
function momentoReal() {
  const { min } = ahoraBA();
  return min >= 540 && min < 720 ? 'manana' : min >= 720 && min < 1020 ? 'mediodia' : 'noche';
}
let momento = 'mediodia';
function aplicarMomento(m, { real = false } = {}) {
  momento = m; const M = MOMENTOS[m]; const hero = $('.hero');
  hero.dataset.momento = m; html.classList.toggle('noche', m === 'noche');
  $$('[data-momento-btn]').forEach(b => b.setAttribute('aria-pressed', b.dataset.momentoBtn === m));
  const { min, dia } = ahoraBA();
  const cerrado = real && (dia === 'Mon' || min < 540 || min >= 1410);
  $('[data-m-kicker]').textContent = cerrado ? (dia === 'Mon' ? '★ Hoy lunes descansamos ★' : '★ Abrimos a las 9 ★') : M.kicker;
  $('[data-m-sub]').textContent = cerrado ? (dia === 'Mon' ? 'Volvemos mañana a las 9 con cafetería, almuerzo y cena. Ya podés reservar tu mesa.' : 'De martes a domingo, de 9 a 23:30. Reservá tu mesa para el almuerzo o la cena.') : M.sub;
  const ponerCta = (b, c) => {
    b.textContent = c.txt;
    if (c.reservar) { b.setAttribute('data-kit-open', 'reservas'); b.removeAttribute('data-ir-carta'); b.removeAttribute('href'); if (b.tagName === 'A') b.setAttribute('role', 'button'); }
    else { b.removeAttribute('data-kit-open'); b.dataset.irCarta = c.carta; if (b.tagName === 'A') { b.setAttribute('href', '#carta'); b.removeAttribute('role'); } }
  };
  ponerCta($('[data-m-cta]'), M.cta); ponerCta($('[data-m-cta2]'), M.cta2);
  $('[data-m-chip]').textContent = M.chip;
  const img = $('[data-m-img]'); const src = $('[data-m-src-d]');
  const nuevo = `img/${M.img}-800.webp`;
  if (!img.src.endsWith(nuevo)) {
    img.classList.add('cambiando');
    setTimeout(() => {
      src.srcset = `img/${M.img}-1400.webp`; img.srcset = `img/${M.img}-800.webp 800w, img/${M.img}-1400.webp 1400w`; img.src = nuevo; img.alt = M.alt;
      const fin = () => img.classList.remove('cambiando');
      if (img.complete) requestAnimationFrame(fin); else { img.addEventListener('load', fin, { once: true }); img.addEventListener('error', fin, { once: true }); }
    }, html.classList.contains('listo') ? 260 : 0);
  }
}
function reloj() {
  const q = new URLSearchParams(location.search).get('momento');
  const inicial = MOMENTOS[q] ? q : momentoReal();
  aplicarMomento(inicial, { real: !MOMENTOS[q] });
  $('.reloj').addEventListener('click', (e) => { const b = e.target.closest('[data-momento-btn]'); if (b) aplicarMomento(b.dataset.momentoBtn); });
  // botones que llevan a una página de la carta
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ir-carta]'); if (!b) return;
    e.preventDefault(); irACarta(b.dataset.irCarta);
  });
}

// =====================================================================
// HORARIOS Y ESTADO
// =====================================================================
function horarios(kit) {
  const H = kit.config.horarios;
  const dias = [['mar', 'Martes'], ['mie', 'Miércoles'], ['jue', 'Jueves'], ['vie', 'Viernes'], ['sab', 'Sábado'], ['dom', 'Domingo'], ['lun', 'Lunes']];
  const hoy = { Mon: 'lun', Tue: 'mar', Wed: 'mie', Thu: 'jue', Fri: 'vie', Sat: 'sab', Sun: 'dom' }[ahoraBA().dia];
  $('[data-horarios]').innerHTML = dias.map(([k, n]) => `<li class="${k === hoy ? 'hoy' : ''}"><span>${n}</span><span>${(H[k] || []).length ? H[k].map(f => f.map(x => x.replace(/:00$/, '')).join(' a ')).join(' · ') : 'Cerrado'}</span></li>`).join('');
  const est = $('[data-estado]');
  const pintar = () => { const s = kit.abierto(); est.hidden = false; est.classList.toggle('cerrado', !s.abierto); est.textContent = s.abierto ? `Abierto · cierra ${s.cierra}` : s.abre ? `Abre a las ${s.abre}` : 'Cerrado hoy'; };
  pintar(); setInterval(pintar, 60_000);
}

// =====================================================================
// CARTA en páginas: índice + una sección por vez + foto del plato
// =====================================================================
const CARTA = { cats: [], prods: [], pagina: 'almuerzo-cena', cat: null, socio: false, grupos: [] };
const DOS_COL = ['cafe', 'jugos', 'dulces', 'bebidas', 'cervezas', 'salsas', 'guarniciones', 'kids'];
let K; // contexto del kit
const money = (n) => K.money(n);
const precioSocio = (p) => Math.round(p * (1 - (K.config.socios?.descuento || 10) / 100));
const grande = (src) => /^img\/.+-800\.webp$/.test(src || '') ? src.replace('-800.', '-1400.') : src;
const hoja = '<svg class="plato__veggie" viewBox="0 0 24 24" aria-label="Veggie" role="img"><path fill="currentColor" d="M20 4C10 4 4 9 4 16c0 2 1 4 1 4s2-7 9-10c-5 4-7 8-7 10 9 0 13-7 13-16Z"/></svg>';

function precioHTML(p, { clase = '' } = {}) {
  if (p.precio == null) return `<span class="${clase}">Consultar</span>`;
  if (!CARTA.socio) return `<span class="${clase}">${money(p.precio)}</span>`;
  return `<span class="${clase}"><s>${money(p.precio)}</s><span class="ahorro">${money(precioSocio(p.precio))}</span></span>`;
}
function catsDePagina(pid) {
  const g = CARTA.grupos.find(x => x.id === pid);
  const usados = new Set(CARTA.grupos.flatMap(x => x.categorias));
  let ids = g ? g.categorias.slice() : [];
  // secciones nuevas creadas desde el panel: van a "Almuerzo y cena"
  if (pid === 'almuerzo-cena') ids = ids.concat(CARTA.cats.filter(c => !usados.has(c.id)).map(c => c.id));
  return ids.map(id => CARTA.cats.find(c => c.id === id)).filter(c => c && CARTA.prods.some(p => p.categoria === c.id));
}
const paginasVisibles = () => CARTA.grupos.filter(g => g.id !== 'ejecutivo' && catsDePagina(g.id).length);

function pintarPaginas() {
  $('[data-paginas]').innerHTML = paginasVisibles().map(g => `<button type="button" role="tab" class="pag-btn" aria-selected="${g.id === CARTA.pagina}" data-pagina="${esc(g.id)}">${esc(g.nombre)}</button>`).join('');
}

function pintarCarta({ animar = true } = {}) {
  const cuerpo = $('[data-carta-cuerpo]');
  const cats = catsDePagina(CARTA.pagina);
  if (!cats.length) { CARTA.pagina = paginasVisibles()[0]?.id; if (!CARTA.pagina) return; return pintarCarta(); }
  if (!cats.some(c => c.id === CARTA.cat)) CARTA.cat = cats[0].id;
  const cat = cats.find(c => c.id === CARTA.cat); const i = cats.indexOf(cat);
  const items = CARTA.prods.filter(p => p.categoria === cat.id);
  const conFotoPag = cats.some(c => CARTA.prods.some(p => p.categoria === c.id && p.foto));
  const primeraFoto = items.find(p => p.foto) || CARTA.prods.find(p => cats.some(c => c.id === p.categoria) && p.foto);
  const pedible = (p) => K.carrito && p.precio != null && p.disponible !== false && CARTA.pagina === 'merch';
  cuerpo.classList.toggle('con-foto', conFotoPag);
  cuerpo.innerHTML = `
    <div class="indice">
      <span class="indice__k" hidden>SECCIONES</span>
      <div class="indice__lista" role="tablist" aria-label="Secciones">${cats.map(c => `<button type="button" role="tab" class="indice__b" aria-selected="${c.id === cat.id}" data-cat="${esc(c.id)}"><span>${esc(c.nombre)}</span><small>${CARTA.prods.filter(p => p.categoria === c.id).length}</small></button>`).join('')}</div>
    </div>
    <div class="seccion-carta" role="tabpanel" aria-label="${esc(cat.nombre)}">
      <div class="seccion-carta__cab"><h3 class="seccion-carta__t">${esc(cat.nombre)}</h3><span class="seccion-carta__n">${items.length} ${items.length === 1 ? 'opción' : 'opciones'}</span></div>
      ${cat.nota ? `<p class="seccion-carta__nota">${esc(cat.nota)}</p>` : '<p class="seccion-carta__nota"></p>'}
      <ul class="platos${DOS_COL.includes(cat.id) ? ' platos--dos' : ''}">${items.map((p, k) => `
        <li class="plato${p.foto ? ' plato--foto' : ''}${p.disponible === false ? ' is-off' : ''}" data-id="${esc(p.id)}" ${p.foto ? `data-foto="${esc(K.asset(grande(p.foto)))}"` : ''} style="--i:${animar ? k : 0}">
          ${p.foto ? `<img class="plato__mini" src="${esc(K.asset(p.foto))}" alt="" width="60" height="60" loading="lazy" decoding="async">` : ''}
          <p class="plato__nom">${(p.etiquetas || []).includes('idolo') ? '<span class="estrella" aria-label="Plato ídolo">★</span>' : ''}${esc(p.nombre)}${(p.etiquetas || []).includes('veggie') ? hoja : ''}</p>
          ${p.disponible === false ? '<span class="plato__precio">Sin stock hoy</span>' : precioHTML(p, { clase: 'plato__precio' })}
          ${p.descripcion ? `<p class="plato__desc">${esc(p.descripcion)}</p>` : ''}
          ${pedible(p) ? `<div class="plato__add" data-kit-qty="${esc(p.id)}"></div>` : ''}
        </li>`).join('')}</ul>
      <div class="seccion-carta__nav">
        <button type="button" data-mover="-1" ${i <= 0 ? 'disabled' : ''}>← ${esc(cats[i - 1]?.nombre || '')}</button>
        <button type="button" data-mover="1" ${i >= cats.length - 1 ? 'disabled' : ''}>${esc(cats[i + 1]?.nombre || '')} →</button>
      </div>
    </div>
    ${conFotoPag ? `<figure class="foto-plato" aria-hidden="true"><div class="foto-plato__box">${primeraFoto ? `<img src="${esc(K.asset(grande(primeraFoto.foto)))}" alt=""><span class="foto-plato__chip">${esc(primeraFoto.nombre)}</span>` : ''}</div><figcaption>Pasá el mouse por los platos con punto celeste para ver la foto.</figcaption></figure>` : ''}`;
  $('.indice__k', cuerpo).hidden = !desk.matches;
  K.carrito?.sync(cuerpo);
  const on = $('.indice__b[aria-selected="true"]', cuerpo);
  if (on && !desk.matches) { const l = $('.indice__lista', cuerpo); l.scrollLeft = on.offsetLeft - 20; }
}

function fotoPlato(li) {
  const box = $('.foto-plato__box'); if (!box || !li?.dataset.foto) return;
  $$('.plato.activo').forEach(x => x.classList.remove('activo')); li.classList.add('activo');
  const actual = $('img:not(.sale)', box); if (actual && actual.getAttribute('src') === li.dataset.foto) return;
  const img = new Image(); img.alt = ''; img.src = li.dataset.foto; img.className = 'sale';
  box.appendChild(img);
  const chip = $('.foto-plato__chip', box) || box.appendChild(Object.assign(document.createElement('span'), { className: 'foto-plato__chip' }));
  chip.textContent = $('.plato__nom', li).textContent.replace('★', '').trim();
  const mostrar = () => requestAnimationFrame(() => { img.classList.remove('sale'); if (actual) { actual.classList.add('sale'); setTimeout(() => actual.remove(), 400); } });
  if (img.complete) mostrar(); else img.onload = mostrar;
}

function carta() {
  const sec = $('#carta');
  sec.addEventListener('click', (e) => {
    const pg = e.target.closest('[data-pagina]');
    if (pg) { CARTA.pagina = pg.dataset.pagina; CARTA.cat = null; pintarPaginas(); pintarCarta(); return; }
    const c = e.target.closest('[data-cat]');
    if (c && c.closest('.indice')) { CARTA.cat = c.dataset.cat; pintarCarta(); if (!desk.matches) volverArribaCarta(); return; }
    const mv = e.target.closest('[data-mover]');
    if (mv) { const cats = catsDePagina(CARTA.pagina); const i = cats.findIndex(x => x.id === CARTA.cat) + Number(mv.dataset.mover); if (cats[i]) { CARTA.cat = cats[i].id; pintarCarta(); volverArribaCarta(); } }
  });
  let raf;
  sec.addEventListener('pointerover', (e) => { if (e.pointerType !== 'mouse') return; const li = e.target.closest('.plato--foto'); if (!li) return; cancelAnimationFrame(raf); raf = requestAnimationFrame(() => fotoPlato(li)); });
  const sw = $('[data-socio]');
  try { CARTA.socio = localStorage.getItem('lacade:socio') === '1'; } catch (_) { /* sin storage */ }
  sw.checked = CARTA.socio;
  sw.addEventListener('change', () => {
    CARTA.socio = sw.checked; try { localStorage.setItem('lacade:socio', sw.checked ? '1' : '0'); } catch (_) { /* nada */ }
    pintarCarta({ animar: false }); pintarAlbum({ mantener: true }); pintarEjecutivo();
  });
  desk.addEventListener('change', () => pintarCarta({ animar: false }));
}
function volverArribaCarta() {
  const c = $('[data-carta-cuerpo]'); const top = c.getBoundingClientRect().top + scrollY - (desk.matches ? 110 : 70);
  if (scrollY > top + 10) scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
}
function irACarta(pagina, prodId) {
  if (pagina) { CARTA.pagina = pagina; CARTA.cat = null; }
  if (prodId) { const p = CARTA.prods.find(x => x.id === prodId); if (p) { CARTA.pagina = (CARTA.grupos.find(g => g.categorias.includes(p.categoria)) || CARTA.grupos[0]).id; CARTA.cat = p.categoria; } }
  pintarPaginas(); pintarCarta();
  $('#carta').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  if (prodId) setTimeout(() => { const li = $(`.plato[data-id="${CSS.escape(prodId)}"]`); if (li) { li.classList.add('activo'); fotoPlato(li); li.animate([{ background: 'rgba(1,155,215,.25)' }, { background: 'transparent' }], { duration: 1800 }); } }, 700);
}

// =====================================================================
// ÁLBUM DE LOS ÍDOLOS
// =====================================================================
const ILU = { 'volcan-chelo': 'img/banana.webp' };
let albumPag = 0;
const idolos = () => CARTA.prods.filter(p => (p.etiquetas || []).includes('idolo'));

const corto = (s) => String(s || '').replace(/\s*\([^)]*\)/g, '').replace(/ de carne rellena$/i, '').trim();
function figHTML(p, n, i) {
  const ilu = ILU[p.id]; p = { ...p, nombre: corto(p.nombre) };
  const cara = p.foto
    ? `<div class="fig__cara"><img class="fig__foto" src="${esc(K.asset(p.foto))}" alt="" loading="lazy" decoding="async"><div class="fig__pie"><span class="fig__n">${n}</span><span class="fig__nom">${esc(p.nombre)}</span></div></div>`
    : `<div class="fig__cara fig__cara--dificil">${ilu ? `<img class="fig__ilu" src="${ilu}" alt="" loading="lazy">` : '<span class="lcd-mask"></span>'}<span class="fig__n" style="color:#fff">${n}</span><span class="fig__nom">${esc(p.nombre)}</span><span class="fig__dificil">Figurita difícil · probala en el bodegón</span></div>`;
  return `<div class="fig" data-id="${esc(p.id)}" style="--i:${i}">
    <div class="fig__in">${cara}
      <div class="fig__dorso"><span class="fig__k">DORSO · ${n}</span><span class="fig__nom">${esc(p.nombre)}</span>${p.descripcion ? `<p class="fig__desc">${esc(p.descripcion)}</p>` : ''}
        <span class="fig__precio">${p.precio == null ? 'Consultar' : CARTA.socio ? `<s>${money(p.precio)}</s>${money(precioSocio(p.precio))}` : money(p.precio)}</span>
        <button type="button" class="fig__ver" data-ver="${esc(p.id)}">Ver en la carta →</button></div>
    </div>
    <button type="button" class="fig__btn" aria-label="Figurita ${n}: ${esc(p.nombre)}. Dar vuelta"></button>
  </div>`;
}

let mazoAlbum = null;
function pintarAlbum({ mantener = false } = {}) {
  const box = $('[data-album]'); if (!box || !K) return;
  const lista = idolos(); if (!lista.length) { box.innerHTML = ''; return; }
  const vueltas = mantener ? new Set($$('.fig.vuelta', box).map(f => f.dataset.id)) : new Set();
  if (desk.matches) {
    const porPag = 6, pags = Math.ceil(lista.length / porPag), spreads = Math.ceil(pags / 2);
    albumPag = Math.min(albumPag, spreads - 1);
    const pagina = (k) => {
      const items = lista.slice(k * porPag, k * porPag + porPag);
      const huecos = k < pags ? Math.max(0, porPag - items.length) : 0;
      return `<div class="libro__pag"><div class="libro__cab"><b>${k === 0 ? 'Los ídolos de la carta' : k === 1 ? 'Parrilla, pastas y postres' : 'La barra'}</b><span>PÁG. ${k + 1}</span></div>
        <div class="libro__grid">${items.map((p, i) => figHTML(p, k * porPag + i + 1, i)).join('')}${Array.from({ length: huecos }, (_, j) => `<span class="libro__hueco" aria-hidden="true">${k * porPag + items.length + j + 1}</span>`).join('')}</div></div>`;
    };
    box.innerHTML = `<div class="libro">${pagina(albumPag * 2)}${pagina(albumPag * 2 + 1)}</div>
      ${spreads > 1 ? `<div class="album__nav"><button type="button" class="album__flecha" data-libro="-1" aria-label="Páginas anteriores" ${albumPag === 0 ? 'disabled' : ''}>←</button>
        <span class="album__cont">Páginas ${albumPag * 2 + 1} y ${albumPag * 2 + 2} de ${spreads * 2}</span>
        <button type="button" class="album__flecha" data-libro="1" aria-label="Páginas siguientes" ${albumPag >= spreads - 1 ? 'disabled' : ''}>→</button></div>` : ''}`;
    vueltas.forEach(id => $(`.fig[data-id="${CSS.escape(id)}"]`, box)?.classList.add('vuelta'));
    mazoAlbum = null;
    $('[data-album-ayuda]').textContent = 'Cada plato con nombre de ídolo es una figurita. Las que tienen foto ya las podés ver; las otras son “figuritas difíciles”: hay que probarlas en el bodegón. Hacé clic en una para darla vuelta.';
    return;
  }
  const idxArriba = mantener && mazoAlbum ? mazoAlbum.indice() : 0;
  box.innerHTML = `<div class="mazo">${lista.map((p, i) => figHTML(p, i + 1, 0)).join('')}</div>
    <div class="album__nav"><button type="button" class="album__flecha" data-mazo="-1" aria-label="Figurita anterior">←</button>
      <span class="album__cont" data-cont></span><span class="album__barra"><i data-barra></i></span>
      <button type="button" class="album__flecha" data-mazo="1" aria-label="Figurita siguiente">→</button></div>`;
  vueltas.forEach(id => $(`.fig[data-id="${CSS.escape(id)}"]`, box)?.classList.add('vuelta'));
  mazoAlbum = crearMazo($('.mazo', box), $$('.fig', box), {
    inicio: idxArriba,
    onTap: (fig, e) => { if (e.target.closest('[data-ver]')) return; fig.classList.toggle('vuelta'); },
    onSale: (fig) => setTimeout(() => fig.classList.remove('vuelta'), 300),
    onCambio: (i, n) => { $('[data-cont]', box).textContent = `${i + 1} / ${n}`; $('[data-barra]', box).style.width = `${(i + 1) / n * 100}%`; },
  });
  $('[data-album-ayuda]').textContent = 'Cada plato con nombre de ídolo es una figurita. Deslizá para pasarlas y tocá una para darla vuelta.';
}

function album() {
  const box = $('[data-album]');
  box.addEventListener('click', (e) => {
    const ver = e.target.closest('[data-ver]'); if (ver) { e.stopPropagation(); irACarta(null, ver.dataset.ver); return; }
    const lb = e.target.closest('[data-libro]');
    if (lb) { albumPag += Number(lb.dataset.libro); const l = $('.libro', box); l?.classList.add('pasando'); setTimeout(() => pintarAlbum(), reduce ? 0 : 200); return; }
    const mz = e.target.closest('[data-mazo]'); if (mz && mazoAlbum) { Number(mz.dataset.mazo) > 0 ? mazoAlbum.siguiente(1) : mazoAlbum.anterior(); return; }
    if (desk.matches) { const b = e.target.closest('.fig__btn'); if (b) b.closest('.fig').classList.toggle('vuelta'); }
  });
  box.addEventListener('keydown', (e) => { if (!mazoAlbum) return; if (e.key === 'ArrowRight') mazoAlbum.siguiente(1); if (e.key === 'ArrowLeft') mazoAlbum.anterior(); });
  desk.addEventListener('change', () => pintarAlbum());
}

// Mazo de cartas que se pasan con el dedo (o arrastrando con el mouse). Un toque = onTap.
function crearMazo(cont, cartas, { inicio = 0, onTap, onSale, onCambio } = {}) {
  let orden = cartas.slice(inicio).concat(cartas.slice(0, inicio));
  const giro = cartas.map((_, i) => [-4, 3.5, -2, 4.5, -3][i % 5]);
  function pintar() {
    orden.forEach((c, k) => {
      c.classList.toggle('arriba', k === 0); c.style.zIndex = String(200 - k);
      const r = k === 0 ? 0 : giro[cartas.indexOf(c)];
      c.style.transform = `translate(${Math.min(k, 2) * 5}px, ${Math.min(k, 2) * 8}px) rotate(${r}deg)`;
      c.style.opacity = k < 3 ? '1' : '0';
      const btn = c.querySelector('.fig__btn'); if (btn) btn.tabIndex = k === 0 ? 0 : -1;
    });
    onCambio && onCambio(cartas.indexOf(orden[0]), cartas.length);
  }
  function siguiente(dir = 1) {
    const top = orden[0]; top.classList.add('vuela');
    top.style.transform = `translate(${dir * 120}%, -20px) rotate(${dir * 18}deg)`;
    onSale && onSale(top);
    setTimeout(() => { top.classList.remove('vuela'); orden.push(orden.shift()); pintar(); }, reduce ? 0 : 320);
  }
  function anterior() { orden.unshift(orden.pop()); pintar(); }
  let x0 = 0, y0 = 0, dx = 0, activa = null, movio = false, id = null;
  cont.addEventListener('pointerdown', (e) => {
    const c = e.target.closest('.arriba'); if (!c || e.button > 0) return;
    if (e.target.closest('[data-ver], a')) return;
    activa = c; id = e.pointerId; x0 = e.clientX; y0 = e.clientY; dx = 0; movio = false;
  });
  cont.addEventListener('pointermove', (e) => {
    if (!activa || e.pointerId !== id) return;
    dx = e.clientX - x0; const dy = e.clientY - y0;
    if (!movio && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) { movio = true; activa.classList.add('arrastrando'); try { cont.setPointerCapture(id); } catch (_) { /* nada */ } }
    if (movio) activa.style.transform = `translate(${dx}px, ${Math.abs(dx) * .05}px) rotate(${dx * .06}deg)`;
  });
  const soltar = (e) => {
    if (!activa || (e && e.pointerId !== id)) return;
    const c = activa; activa = null; c.classList.remove('arrastrando');
    if (movio && Math.abs(dx) > 70) siguiente(dx > 0 ? 1 : -1);
    else if (movio) pintar();
    else if (e && e.type === 'pointerup') onTap && onTap(c, e);
  };
  cont.addEventListener('pointerup', soltar); cont.addEventListener('pointercancel', () => { if (activa) { activa.classList.remove('arrastrando'); activa = null; pintar(); } });
  // con teclado: Enter sobre la carta de arriba
  cont.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('.arriba .fig__btn')) { e.preventDefault(); onTap && onTap(orden[0], e); } });
  pintar();
  return { siguiente, anterior, indice: () => cartas.indexOf(orden[0]) };
}

// galería "Ustedes": mazo en el celu, mosaico en desktop
function galeria() {
  const g = $('[data-galeria]'); const figs = $$('.g', g);
  let m = null;
  const armar = () => {
    if (desk.matches) { figs.forEach(f => { f.style.cssText = ''; f.classList.remove('arriba'); }); m = null; return; }
    if (!m) m = crearMazo(g, figs, {});
  };
  // en el celu no hay mosaico: sin animación de "foto que se descubre" (la foto ya está a la vista en el mazo)
  armar(); desk.addEventListener('change', () => { m = null; armar(); });
}

// =====================================================================
// MENÚ EJECUTIVO (sale de la carta: sección "ejecutivo", editable en /admin)
// =====================================================================
function pintarEjecutivo() {
  const box = $('[data-ejecutivo-cuerpo]'); if (!box || !K) return;
  const items = CARTA.prods.filter(p => p.categoria === 'ejecutivo' && p.disponible !== false);
  const pend = (s) => String(s || '').replace(/\[([^\]]+)\]/g, '<span class="pendiente">$1</span>');
  box.innerHTML = items.length ? items.map(p => `<div class="pizarra__item"><b>${esc(p.nombre)}</b><span>${p.precio == null ? '<span class="pendiente">PRECIO A CONFIRMAR</span>' : CARTA.socio ? money(precioSocio(p.precio)) : money(p.precio)}</span></div>
      ${p.descripcion ? `<p class="pizarra__desc">${pend(esc(p.descripcion))}</p>` : ''}`).join('') + `<p class="pizarra__desc">Al mediodía · <span class="pendiente">DÍAS Y HORARIO A CONFIRMAR</span></p>`
    : '<p class="pizarra__desc">Hoy no hay menú ejecutivo. Mirá la carta completa.</p>';
}

// =====================================================================
// MERCH (sale de la carta: sección "merch")
// =====================================================================
const MERCH_DEST = ['mate', 'vaso-fernetero', 'camiseta-sifon', 'pinguino-lacade', 'copa-libertadores'];
function pintarMerch() {
  const box = $('[data-merch]'); if (!box || !K) return;
  let items = MERCH_DEST.map(id => CARTA.prods.find(p => p.id === id && p.categoria === 'merch')).filter(Boolean);
  if (items.length < 5) items = items.concat(CARTA.prods.filter(p => p.categoria === 'merch' && !items.includes(p))).slice(0, 5);
  box.innerHTML = items.map(p => `<article class="merch-item">
      <div class="merch-item__ico">${p.foto ? `<img src="${esc(K.asset(p.foto))}" alt="" loading="lazy">` : p.id === 'pinguino-lacade' ? '<img class="ilu" src="img/pinguino.webp" alt="" loading="lazy">' : '<span class="lcd-mask"></span>'}</div>
      <b>${esc(p.nombre)}</b><span>${p.precio == null ? 'Consultar' : money(p.precio)}</span>
      ${p.precio != null && p.disponible !== false ? `<div data-kit-qty="${esc(p.id)}"></div>` : '<small>Sin stock</small>'}
    </article>`).join('');
  K.carrito?.sync(box);
}

// =====================================================================
// REGALÁ: la platea se escribe en vivo
// =====================================================================
function regala() {
  const GC = K.giftcards; const form = $('[data-regala]'); if (!GC || !form) return;
  const montos = GC.config.montos;
  const st = { monto: montos[0], para: '', de: '', mensaje: '' };
  $('[data-montos]').innerHTML = montos.map(m => `<button type="button" class="monto" role="radio" aria-checked="${m === st.monto}" data-monto="${m}">${esc(money(m))}</button>`).join('');
  $('[data-montos]').setAttribute('role', 'radiogroup');
  const P = { monto: $('[data-p-monto]'), para: $('[data-p-para]'), de: $('[data-p-de]'), msg: $('[data-p-msg]') };
  const pintar = () => {
    P.para.textContent = st.para.trim() || '…'; P.de.textContent = st.de.trim() || '…';
    P.msg.textContent = st.mensaje.trim() ? `“${st.mensaje.trim()}”` : '“Escribí un mensaje y aparece acá.”';
  };
  form.addEventListener('click', (e) => {
    const b = e.target.closest('[data-monto]'); if (!b) return;
    st.monto = Number(b.dataset.monto);
    $$('[data-monto]', form).forEach(x => x.setAttribute('aria-checked', x === b));
    P.monto.textContent = money(st.monto); P.monto.classList.remove('salta'); void P.monto.offsetWidth; P.monto.classList.add('salta');
  });
  form.addEventListener('input', (e) => { if (e.target.name) { st[e.target.name] = e.target.value; pintar(); } });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const err = $('.regala__error', form);
    if (!st.para.trim()) { err.textContent = 'Contanos para quién es la gift card.'; err.hidden = false; form.para.focus(); return; }
    err.hidden = true;
    GC.agregar({ monto: st.monto, para: st.para, de: st.de, mensaje: st.mensaje }, { origen: $('[data-regala-btn]') });
    setTimeout(() => K.carrito.abrir(), reduce ? 0 : 450);
  });
  pintar(); P.monto.textContent = money(st.monto);
}

// Al volver del pago aprobado: las plateas con su talón para cortar
function giftcardsListas(e) {
  e.preventDefault();
  const { giftcards } = e.detail;
  const vence = (iso) => iso ? new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
  const box = document.createElement('div'); box.className = 'gc-listas';
  box.innerHTML = `<p>¡Listo! El pago se aprobó. Cortá el talón para ver el código: el bodegón lo canjea al pagar la cuenta.</p>
    ${giftcards.map((g, i) => `<article class="gc-ticket" data-gc="${i}">
      <div class="platea__top"><div><span class="platea__k">PLATEA LACADÉ</span><b class="platea__monto">${esc(money(g.monto))}</b><span class="platea__k2">VENCE EL ${esc(vence(g.vence))}</span></div><img src="img/sello.webp" alt="" width="90" height="90" style="width:90px;height:90px"></div>
      <div class="platea__cuerpo" style="min-height:0">${g.para ? `<p><b>Para:</b> ${esc(g.para)}</p>` : ''}${g.de ? `<p><b>De:</b> ${esc(g.de)}</p>` : ''}${g.mensaje ? `<p class="platea__msg">“${esc(g.mensaje)}”</p>` : ''}</div>
      <div class="gc-ticket__talon"><span class="platea__cod">${esc(g.codigo)}</span><span>VÁLIDA 60 DÍAS</span></div>
    </article>
    <div class="tijera" data-tijera="${i}"><span>Arrastrá para cortar el talón ✂</span><button type="button" class="tijera__mano" aria-label="Cortar el talón y ver el código">→</button></div>`).join('')}
    <div style="display:flex;flex-wrap:wrap;gap:10px">
      <a class="btn btn--noche" data-wa-gc target="_blank" rel="noopener" href="#">Mandar por WhatsApp</a>
      <button type="button" class="btn btn--linea" data-close>Listo</button>
    </div>`;
  popup({ titulo: giftcards.length > 1 ? '¡Tus gift cards!' : '¡Tu gift card!', contenido: box, clase: 'kit-pop--resv' });
  const texto = giftcards.map(g => `🎟️ Gift card Bodegón LACADÉ por ${money(g.monto)}${g.para ? ` para ${g.para}` : ''}. Código: ${g.codigo}. Vence el ${vence(g.vence)}. Nogoyá 3065, Villa del Parque.`).join('\n');
  $('[data-wa-gc]', box).href = `https://wa.me/?text=${encodeURIComponent(texto)}`;
  $$('[data-tijera]', box).forEach(t => {
    const mano = $('.tijera__mano', t); const ticket = $(`[data-gc="${t.dataset.tijera}"]`, box);
    const cortar = () => { t.classList.add('hecha'); t.querySelector('span').textContent = '¡Cortado! Guardá el código'; mano.style.transform = `translateX(${t.clientWidth - 52}px)`; ticket.classList.add('cortado'); };
    let x0 = null;
    mano.addEventListener('pointerdown', (e) => { x0 = e.clientX; mano.setPointerCapture(e.pointerId); });
    mano.addEventListener('pointermove', (e) => { if (x0 == null) return; const dx = Math.max(0, Math.min(t.clientWidth - 52, e.clientX - x0)); mano.style.transform = `translateX(${dx}px)`; if (dx > (t.clientWidth - 52) * .8) { x0 = null; cortar(); } });
    mano.addEventListener('pointerup', () => { if (x0 != null) { x0 = null; if (!t.classList.contains('hecha')) mano.style.transform = ''; } });
    mano.addEventListener('click', () => { if (!t.classList.contains('hecha')) cortar(); }); // con teclado o un toque
  });
}

// Confirmación de la reserva: ticket con la camiseta puesta
function reservaLista(e) {
  e.preventDefault();
  const { resumen, reserva, el } = e.detail;
  const [y, m, d] = reserva.fecha.split('-'); const [hh, mm] = reserva.hora.split(':').map(Number);
  const ini = `${y}${m}${d}T${String(hh % 24).padStart(2, '0')}${String(mm).padStart(2, '0')}00`;
  const finM = hh * 60 + mm + 120; const fin = `${y}${m}${d}T${String(Math.floor(finM / 60) % 24).padStart(2, '0')}${String(finM % 60).padStart(2, '0')}00`;
  const cal = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('Mesa en Bodegón LACADÉ')}&dates=${ini}/${fin}&ctz=${encodeURIComponent(TZ)}&location=${encodeURIComponent('Nogoyá 3065, Villa del Parque, CABA')}`;
  const wa = `https://wa.me/${K.config.whatsapp}?text=${encodeURIComponent(`¡Hola Lacadé! Pedí una mesa para ${resumen.personas} el ${resumen.dia} a las ${resumen.hora} (${resumen.servicio}${resumen.tanda ? ', ' + resumen.tanda.toLowerCase() : ''}). A nombre de ${resumen.nombre}.`)}`;
  el.innerHTML = `<div class="ticket" role="status">
    <div class="ticket__top"><b>¡Mesa pedida!<br>Juega Lacadé</b><img src="img/sello.webp" alt="" width="78" height="78"></div>
    <div class="ticket__datos">
      <div><span>Día</span><b>${esc(resumen.dia)}</b></div>
      <div><span>Turno</span><b>${esc(resumen.servicio)} · ${esc(resumen.hora)}</b></div>
      <div><span>Mesa para</span><b>${esc(resumen.personas)}</b></div>
      <div><span>${esc(resumen.tanda || 'A nombre de')}</span><b>${esc(resumen.tanda ? resumen.nombre : resumen.nombre)}</b></div>
    </div>
    <p class="ticket__nota">Te confirmamos por WhatsApp. La mesa se guarda 15 minutos.</p>
    <div class="ticket__pie"><a class="btn btn--noche" href="${esc(wa)}" target="_blank" rel="noopener">Avisar por WhatsApp</a><a class="btn btn--linea" href="${esc(cal)}" target="_blank" rel="noopener">Agendar</a><a class="btn btn--linea" href="#llegar" data-cerrar-pop>Cómo llegar</a></div>
  </div>`;
  el.querySelector('[data-cerrar-pop]')?.addEventListener('click', () => el.closest('.kit-pop')?.querySelector('.kit-x')?.click());
}

// =====================================================================
// CUMPLE: el banner se esconde solo cuando vence la promo
// =====================================================================
function cumple() {
  const hasta = new Date('2026-12-01T03:00:00Z'); // 30/11 23:59 en Buenos Aires
  if (Date.now() >= hasta) $('[data-cumple]')?.remove();
}

// =====================================================================
// ARRANQUE
// =====================================================================
async function arrancar() {
  intro();
  barra(); entradas(); arrastre(); reloj(); cumple(); galeria(); carta(); album();
  document.addEventListener('kit:carta', (e) => {
    CARTA.prods = e.detail.productos; CARTA.cats = e.detail.categorias;
    if (!K) return; // el primer pintado lo hace el arranque, cuando el kit ya está listo
    pintarPaginas(); pintarCarta({ animar: false }); pintarAlbum({ mantener: true }); pintarEjecutivo(); pintarMerch();
  });
  document.addEventListener('kit:giftcards', giftcardsListas);
  document.addEventListener('kit:reserva-lista', reservaLista);
  try {
    K = await initKit({
      config: 'cliente.json',
      carrito: { label: 'Tus regalos', icono: '<svg viewBox="0 0 24 24"><rect x="3" y="8" width="18" height="12" rx="1.5"/><path d="M3 12h18M12 8v12M12 8c-1.5-3.5-6.5-3.5-5 0M12 8c1.5-3.5 6.5-3.5 5 0"/></svg>' },
    });
    CARTA.grupos = K.config.carta.grupos || [];
    CARTA.pagina = momento === 'manana' ? 'cafeteria' : 'almuerzo-cena';
    horarios(K); regala();
    pintarPaginas(); pintarCarta(); pintarAlbum(); pintarEjecutivo(); pintarMerch();
  } catch (err) { console.error('[lacade] kit', err); }
}
arrancar();
