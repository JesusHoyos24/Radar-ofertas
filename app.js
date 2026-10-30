/* Radar de ofertas (versión estática). Lee data.json; todo el texto externo entra con textContent. */
(function () {
  const h = (tag, a, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(a || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v; else if (k.startsWith('on')) el.addEventListener(k.slice(2), v); else el.setAttribute(k, v === true ? '' : v);
    }
    const add = (c) => { if (c == null || c === false) return; Array.isArray(c) ? c.forEach(add) : el.append(c.nodeType ? c : document.createTextNode(String(c))); };
    kids.forEach(add); return el;
  };
  const money = (n) => '$' + Math.round(n).toLocaleString('es-MX');
  const ago = (t) => { if (!t) return 'nunca'; const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'hace un momento' : m < 60 ? `hace ${m} min` : m < 1440 ? `hace ${Math.round(m / 60)} h` : `hace ${Math.round(m / 1440)} d`; };
  const safeUrl = (u) => (/^https:\/\/([a-z0-9-]+\.)*(mercadolibre\.com\.mx|mercadolibre\.com|mercadopago\.com\.mx)\//i.test(u || '') ? u : '#');
  const safeImg = (u) => (/^https:\/\/[a-z0-9.-]*mlstatic\.com\//i.test(u || '') ? u : '');

  const state = { topic: '', tab: 'error', category: '', min: '', search: '', sort: 'discount', shown: 60 };
  const TABS = [['error', '🚨 Errores de precio'], ['top', '🔥 Mejores ofertas'], ['buena', '👍 Buenas ofertas'], ['all', '📦 Todo'], ['coupons', '🎟️ Cupones']];
  const RANK = { error: 0, top: 1, buena: 2, normal: 3 };
  let data;

  const chips = h('div', { class: 'tabs chips' });
  const body = h('div', {}); const tabs = h('div', { class: 'tabs' }); const filters = h('div', { class: 'filters' }); const statusEl = h('div', { class: 'status' });
  const cats = () => data.categories;
  const selCat = h('select', { onchange: (e) => { state.category = e.target.value; state.shown = 60; draw(); } });
  const selSort = h('select', { onchange: (e) => { state.sort = e.target.value; draw(); } }, ...[['discount', 'Mayor descuento'], ['price', 'Menor precio'], ['new', 'Más nuevas'], ['drop', 'Mayor caída reciente']].map(([v, l]) => h('option', { value: v }, l)));
  const inMin = h('input', { type: 'number', placeholder: '% mín', style: 'width:90px', min: 0, max: 99, onchange: (e) => { state.min = e.target.value; state.shown = 60; draw(); } });
  let t; const inSearch = h('input', { placeholder: 'Buscar producto…', oninput: (e) => { clearTimeout(t); t = setTimeout(() => { state.search = e.target.value.toLowerCase(); state.shown = 60; draw(); }, 250); } });
  filters.append(selCat, inMin, selSort, inSearch);

  function card(p) {
    const badge = { error: ['b-error', '🚨 POSIBLE ERROR'], top: ['b-top', '🔥 TOP'], buena: ['b-buena', 'OFERTA'] }[p.l];
    const img = safeImg(p.i); const url = safeUrl(p.u);
    return h('div', { class: `card ${p.l}` },
      h('a', { class: 'img', href: url, target: '_blank', rel: 'noopener noreferrer' }, img ? h('img', { src: img, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' }) : null,
        badge ? h('span', { class: 'badge ' + badge[0] }, badge[1]) : null, p.d ? h('span', { class: 'off' }, `-${p.d}%`) : null),
      h('div', { class: 'body' },
        h('a', { class: 'title', href: url, target: '_blank', rel: 'noopener noreferrer' }, p.t),
        h('div', {}, h('span', { class: 'price' }, money(p.p)), p.o > p.p ? h('span', { class: 'was' }, money(p.o)) : null),
        ...p.w.slice(0, 3).map((r) => h('div', { class: 'why' }, '• ' + r)),
        h('div', { class: 'meta' }, [p.r ? `⭐ ${p.r}` : null, p.v ? `${String(p.v).trim()} vendidos` : null, p.f ? 'Envío gratis' : null].filter(Boolean).join(' · ')),
        h('div', { class: 'meta' }, `visto ${ago(p.ls)}${p.n > 1 ? ` · ${p.n} revisiones` : ''}`)));
  }

  function draw() {
    chips.replaceChildren(h('button', { class: !state.topic ? 'on' : '', onclick: () => { state.topic = ''; state.shown = 60; draw(); } }, 'Todas las secciones'),
      ...data.topics.map((t) => h('button', { class: state.topic === t.id ? 'on' : '', onclick: () => { state.topic = t.id; if (state.tab === 'error') state.tab = 'all'; state.shown = 60; draw(); } }, `${t.icon} ${t.name}`)));
    tabs.replaceChildren(...TABS.map(([k, l]) => h('button', { class: state.tab === k ? 'on' : '', onclick: () => { state.tab = k; state.shown = 60; draw(); } }, l)));
    filters.style.display = state.tab === 'coupons' ? 'none' : '';
    chips.style.display = state.tab === 'coupons' ? 'none' : '';
    if (state.tab === 'coupons') {
      const list = data.coupons;
      body.replaceChildren(...(list.length ? list.map((c) => h('div', { class: 'coupon' },
        h('div', { class: 'd' }, c.discount || '🎟️'),
        h('div', { style: 'flex:1;min-width:200px' }, h('div', {}, h('b', {}, c.title || 'Cupón')), c.description ? h('div', { class: 'muted small' }, c.description) : null,
          h('div', { class: 'muted small' }, [c.min_purchase ? `Compra mín. ${c.min_purchase}` : null, c.expires ? `Vence: ${c.expires}` : null].filter(Boolean).join(' · '))),
        c.code ? h('code', {}, c.code) : null, c.url ? h('a', { class: 'btn', href: safeUrl(c.url), target: '_blank', rel: 'noopener noreferrer' }, 'Ver productos') : null))
        : [h('div', { class: 'empty' }, 'Aún no hay cupones cargados. Se actualizan una vez al día.')]));
      return;
    }
    let list = data.deals.filter((p) => state.tab === 'all' || RANK[p.l] <= RANK[state.tab]);
    if (state.topic) list = list.filter((p) => p.tp === state.topic);
    if (state.category) list = list.filter((p) => p.c === state.category);
    if (state.min) list = list.filter((p) => p.d >= Number(state.min));
    if (state.search) list = list.filter((p) => p.t.toLowerCase().includes(state.search));
    const sorters = { discount: (a, b) => b.d - a.d || a.p - b.p, price: (a, b) => a.p - b.p, new: (a, b) => b.fs - a.fs, drop: (a, b) => ((b.pp > 0 ? (b.pp - b.p) / b.pp : 0) - (a.pp > 0 ? (a.pp - a.p) / a.pp : 0)) };
    list.sort(sorters[state.sort]);
    const page = list.slice(0, state.shown);
    body.replaceChildren(list.length ? h('div', {}, h('div', { class: 'grid' }, page.map(card)),
      list.length > page.length ? h('p', { style: 'text-align:center;margin-top:18px' }, h('button', { class: 'btn', onclick: () => { state.shown += 60; draw(); } }, `Mostrar más (${list.length - page.length})`)) : null)
      : h('div', { class: 'empty' }, state.tab === 'error' ? 'No hay errores de precio ahora. Es normal: son raros. Revisa 🔥 Mejores ofertas.' : state.topic ? 'Aún no hay ofertas en esta sección. Se llena en cada escaneo.' : 'Sin resultados con esos filtros.'));
  }

  async function start() {
    document.getElementById('app').replaceChildren(h('header', {}, h('h1', {}, '📡 Radar de ofertas'), h('span', { class: 'muted small' }, 'Mercado Libre México')), h('main', {}, statusEl, chips, tabs, filters, body));
    body.replaceChildren(h('div', { class: 'empty' }, 'Cargando…'));
    try { data = await (await fetch('data.json?t=' + Date.now())).json(); }
    catch { body.replaceChildren(h('div', { class: 'empty' }, 'No pude cargar los datos. Intenta de nuevo en un momento.')); return; }
    selCat.replaceChildren(h('option', { value: '' }, 'Todas las categorías'), ...cats().map((c) => h('option', { value: c.id }, c.name)));
    const c = data.counts || {};
    if (!c.error) state.tab = 'top';
    statusEl.replaceChildren(h('span', {}, `Actualizado ${ago(data.generated_at)}`), h('span', {}, `${data.total} productos revisados · 🚨 ${c.error || 0} · 🔥 ${c.top || 0} · 👍 ${c.buena || 0}`), h('span', {}, `🎟️ ${data.coupons.length} cupones`),
      h('span', { class: 'muted' }, 'Precios al momento de la revisión: confirma en Mercado Libre antes de comprar.'));
    draw();
  }
  start();
})();
