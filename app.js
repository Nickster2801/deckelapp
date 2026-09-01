(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const fmt = (n) => Number(n || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  const nowIso = () => new Date().toISOString();
  const id = () => crypto?.randomUUID?.() || String(Date.now()) + Math.random().toString(16).slice(2);
  const norm = (s) => String(s || '').trim();
  const num = (v) => Number(String(v ?? '').replace('€', '').replace(',', '.').trim()) || 0;

  const THEME_KEY = 'deckelapp-theme';
  function getTheme() {
    try { return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'; }
    catch { return 'dark'; }
  }
  function applyTheme(theme) {
    const next = theme === 'light' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', next === 'light' ? '#F4F6FB' : '#07111F');
  }
  function setTheme(theme) {
    const next = theme === 'light' ? 'light' : 'dark';
    try { localStorage.setItem(THEME_KEY, next); } catch {}
    applyTheme(next);
  }
  applyTheme(getTheme());

  const defaults = {
    groups: [
      { name: 'Favoriten', sortOrder: 0 },
      { name: 'Alkoholisch', sortOrder: 1 },
      { name: 'Alkoholfrei', sortOrder: 2 },
      { name: 'Speisen', sortOrder: 3 },
      { name: 'Kuchen & Süßes', sortOrder: 4 },
      { name: 'Spirituosen', sortOrder: 5 },
      { name: 'Sonstiges', sortOrder: 6 }
    ],
    articles: [
      a('Bier', 2.50, 'Alkoholisch', true, 0.50, true, '🍺'),
      a('Radler', 2.50, 'Alkoholisch', true, 0.50, true, '🍺'),
      a('Glühwein rot', 3.00, 'Alkoholisch', false, 0, true, '🍷'),
      a('Glühwein weiß', 3.00, 'Alkoholisch', false, 0, false, '🍷'),
      a('Grog', 3.50, 'Alkoholisch', false, 0, false, '☕'),
      a('Cola', 2.00, 'Alkoholfrei', true, 0.50, true, '🥤'),
      a('Fanta', 2.00, 'Alkoholfrei', true, 0.50, false, '🥤'),
      a('Sprite', 2.00, 'Alkoholfrei', true, 0.50, false, '🥤'),
      a('Wasser', 1.50, 'Alkoholfrei', true, 0.50, true, '💧'),
      a('Pommes', 3.50, 'Speisen', false, 0, true, '🍟'),
      a('Burger', 5.00, 'Speisen', false, 0, false, '🍔'),
      a('Grillwurst im Brötchen', 3.50, 'Speisen', false, 0, true, '🌭'),
      a('Schnitzelbrötchen', 4.50, 'Speisen', false, 0, false, '🥪'),
      a('Soljanka', 4.00, 'Speisen', false, 0, false, '🍲'),
      a('Kuchen', 2.50, 'Kuchen & Süßes', false, 0, false, '🍰'),
      a('Waffel', 2.50, 'Kuchen & Süßes', false, 0, false, '🧇'),
      a('Muffin', 2.00, 'Kuchen & Süßes', false, 0, false, '🧁'),
      a('Klopfer', 2.00, 'Spirituosen', false, 0, false, '🥃'),
      a('Klarer', 2.00, 'Spirituosen', false, 0, false, '🥃')
    ],
    events: [{ name: 'Standard-Event', createdAt: nowIso(), isActive: true }],
    currentEvent: 'Standard-Event',
    orders: []
  };
  defaults.articles.forEach((x, i) => x.sortOrder = i);
  function a(name, price, group, hasDeposit, depositPrice, favorite, icon) {
    return { id: id(), name, price, group, hasDeposit, depositPrice, favorite, visible: true, icon, sortOrder: 0 };
  }

  const storage = {
    key: 'deckelapp-pwa-v1',
    load() {
      try {
        const raw = localStorage.getItem(this.key);
        if (!raw) return structuredClone(defaults);
        const data = JSON.parse(raw);
        return {
          groups: Array.isArray(data.groups) && data.groups.length ? data.groups : structuredClone(defaults.groups),
          articles: Array.isArray(data.articles) && data.articles.length ? data.articles.map(x => ({ id: x.id || id(), icon: x.icon || '🥤', visible: x.visible !== false, ...x })) : structuredClone(defaults.articles),
          events: Array.isArray(data.events) && data.events.length ? data.events : structuredClone(defaults.events),
          currentEvent: data.currentEvent || 'Standard-Event',
          orders: Array.isArray(data.orders) ? data.orders : []
        };
      } catch { return structuredClone(defaults); }
    },
    save() { localStorage.setItem(this.key, JSON.stringify(state.data)); }
  };

  const state = {
    data: storage.load(),
    order: [],
    note: '',
    page: 'orders',
    search: '',
    collapsed: {},
    installPrompt: null
  };

  const el = {
    content: $('#content'), drawer: $('#drawer'), scrim: $('#scrim'), menuButton: $('#menuButton'),
    eventLabel: $('#eventLabel'), drawerEvent: $('#drawerEvent'), orderButton: $('#orderButton'),
    sheet: $('#orderSheet'), closeSheet: $('#closeSheet'), orderLines: $('#orderLines'), modalHost: $('#modalHost'),
    toast: $('#toast'), installButton: $('#installButton')
  };

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); state.installPrompt = e; el.installButton.classList.remove('hidden');
  });
  el.installButton.addEventListener('click', async () => {
    if (!state.installPrompt) return;
    state.installPrompt.prompt(); await state.installPrompt.userChoice; state.installPrompt = null; el.installButton.classList.add('hidden');
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('service-worker.js').catch(() => {}));
  }

  el.menuButton.addEventListener('click', openDrawer);
  el.scrim.addEventListener('click', () => { closeDrawer(); closeSheet(); });
  el.orderButton.addEventListener('click', openSheet);
  el.closeSheet.addEventListener('click', closeSheet);
  $$('.drawer-item').forEach(b => b.addEventListener('click', () => { showPage(b.dataset.page); closeDrawer(); }));

  function openDrawer() { el.drawer.classList.add('open'); el.scrim.classList.add('open'); el.drawer.setAttribute('aria-hidden', 'false'); }
  function closeDrawer() { el.drawer.classList.remove('open'); if (!el.sheet.classList.contains('open')) el.scrim.classList.remove('open'); el.drawer.setAttribute('aria-hidden', 'true'); }
  function openSheet() { renderOrderSheet(); el.sheet.classList.add('open'); el.scrim.classList.add('open'); el.sheet.setAttribute('aria-hidden', 'false'); }
  function closeSheet() { el.sheet.classList.remove('open'); if (!el.drawer.classList.contains('open')) el.scrim.classList.remove('open'); el.sheet.setAttribute('aria-hidden', 'true'); }
  function toast(text) { el.toast.textContent = text; el.toast.classList.remove('hidden'); clearTimeout(toast.t); toast.t = setTimeout(() => el.toast.classList.add('hidden'), 1800); }
  function save() { storage.save(); updateHeader(); updateOrderButton(); }
  function currentOrders() { return state.data.orders.filter(o => !o.eventName || o.eventName === state.data.currentEvent); }
  function orderTotal() { return state.order.reduce((s, x) => s + x.quantity * x.unitPrice, 0); }
  function orderCount() { return state.order.filter(x => !x.isDeposit).reduce((s, x) => s + x.quantity, 0); }

  function updateHeader() {
    el.eventLabel.textContent = state.data.currentEvent;
    el.drawerEvent.textContent = state.data.currentEvent;
    $$('.drawer-item').forEach(b => b.classList.toggle('active', b.dataset.page === state.page));
  }
  function updateOrderButton() { el.orderButton.textContent = `📝 Bestellung anzeigen   ${orderCount()} Artikel | ${fmt(orderTotal())}`; }

  function showPage(page) {
    state.page = page || 'orders'; updateHeader();
    if (state.page === 'orders') return renderOrdersPage();
    if (state.page === 'events') return renderEventsPage();
    if (state.page === 'articles') return renderArticlesPage();
    if (state.page === 'history') return renderHistoryPage();
    if (state.page === 'stats') return renderStatsPage();
    if (state.page === 'settings') return renderSettingsPage();
  }

  function pageTitle(text) { return `<div class="page-title">${escapeHtml(text)}</div>`; }
  function renderOrdersPage() {
    el.content.innerHTML = pageTitle(`Bestellungen · ${state.data.currentEvent}`) + `
      <input id="search" class="search" placeholder="Artikel suchen" value="${escapeAttr(state.search)}">
      <div id="articles"></div>`;
    $('#search').addEventListener('input', (e) => { state.search = e.target.value || ''; renderArticleGroups(); });
    renderArticleGroups();
  }

  function renderArticleGroups() {
    const wrap = $('#articles'); if (!wrap) return;
    const q = state.search.trim().toLowerCase();
    const groups = state.data.groups.map(g => g.name).filter(g => g.toLowerCase() !== 'favoriten');
    if (state.data.articles.some(x => x.favorite && x.visible)) groups.unshift('Favoriten');
    wrap.innerHTML = '';
    for (const group of groups) {
      const articles = state.data.articles
        .filter(x => x.visible && (group === 'Favoriten' ? x.favorite : x.group === group))
        .filter(x => !q || x.name.toLowerCase().includes(q))
        .sort((a,b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name, 'de'));
      if (!articles.length) continue;
      const collapsed = !!state.collapsed[group];
      const btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'group-button';
      btn.innerHTML = `<span>${collapsed ? '▶' : '▼'} ${escapeHtml(group)}</span><span class="group-count">${articles.length}</span>`;
      btn.addEventListener('click', () => { state.collapsed[group] = !collapsed; renderArticleGroups(); });
      wrap.appendChild(btn);
      if (collapsed) continue;
      const card = document.createElement('div'); card.className = 'card';
      const grid = document.createElement('div'); grid.className = 'article-grid'; card.appendChild(grid);
      articles.forEach(article => grid.appendChild(articleTile(article)));
      wrap.appendChild(card);
    }
  }

  function articleTile(article) {
    const qty = state.order.filter(x => !x.isDeposit && !x.isDepositReturn && x.articleName === article.name).reduce((s,x)=>s+x.quantity,0);
    const b = document.createElement('button'); b.type = 'button'; b.className = 'article-tile';
    b.innerHTML = `${qty ? `<div class="count">${qty}</div>` : ''}<div class="icon">${escapeHtml(article.icon || '🥤')}</div><div class="name">${escapeHtml(article.name)}</div><div class="price">${fmt(article.price)}</div>`;
    b.addEventListener('click', () => addArticle(article)); return b;
  }

  function addArticle(article) {
    let line = state.order.find(x => !x.isDeposit && !x.isDepositReturn && x.articleName === article.name);
    if (!line) {
      state.order.push({ name: article.name, articleName: article.name, quantity: 1, unitPrice: Number(article.price), isDeposit: false, isDepositReturn: false });
      if (article.hasDeposit && Number(article.depositPrice) > 0) state.order.push({ name: 'Pfand', articleName: article.name, quantity: 1, unitPrice: Number(article.depositPrice), isDeposit: true, isDepositReturn: false });
    } else {
      line.quantity++;
      const dep = state.order.find(x => x.isDeposit && x.articleName === article.name); if (dep) dep.quantity++;
    }
    updateOrderButton(); renderArticleGroups(); if (el.sheet.classList.contains('open')) renderOrderSheet();
  }

  function renderOrderSheet() {
    let html = '';
    if (!state.order.length) html += `<div class="card small-muted">Noch keine Positionen.</div>`;
    state.order.forEach((line, index) => {
      html += `<div class="card order-line">
        <div><div class="line-title">${escapeHtml(line.name)}</div><div class="line-meta">${fmt(line.unitPrice)} einzeln · ${fmt(line.unitPrice * line.quantity)}</div></div>
        <div class="qty-controls"><button class="icon-button small" data-minus="${index}">−</button><div class="qty">${line.quantity}</div><button class="icon-button small" data-plus="${index}">+</button><button class="icon-button small" data-del="${index}">×</button></div>
      </div>`;
    });
    html += `<textarea id="orderNote" class="note" placeholder="Notiz zur Bestellung">${escapeHtml(state.note)}</textarea>
      <div class="total-line"><span>Gesamt</span><span>${fmt(orderTotal())}</span></div>
      <div class="row fill"><button id="depositBack" class="secondary-button">Pfand zurück</button><button id="clearOrder" class="danger-button">Leeren</button></div>
      <div class="row"><button id="saveOrder" class="action-button" style="width:100%">Bestellung abschließen</button></div>`;
    el.orderLines.innerHTML = html;
    $$('[data-minus]', el.orderLines).forEach(b => b.onclick = () => changeQty(Number(b.dataset.minus), -1));
    $$('[data-plus]', el.orderLines).forEach(b => b.onclick = () => changeQty(Number(b.dataset.plus), 1));
    $$('[data-del]', el.orderLines).forEach(b => b.onclick = () => removeOrderLine(Number(b.dataset.del)));
    $('#orderNote').addEventListener('input', e => state.note = e.target.value || '');
    $('#clearOrder').onclick = () => { state.order = []; state.note = ''; changedOrder(); };
    $('#depositBack').onclick = () => addDepositReturn();
    $('#saveOrder').onclick = () => saveOrder();
  }
  function removeOrderLine(index) {
    const line = state.order[index];
    if (!line) return;
    if (!line.isDeposit && !line.isDepositReturn) {
      const articleName = line.articleName;
      state.order = state.order.filter(x => !(x.articleName === articleName && (x === line || x.isDeposit)));
    } else {
      state.order.splice(index, 1);
    }
    changedOrder();
  }
  function changeQty(index, by) {
    const line = state.order[index];
    if (!line) return;
    if (!line.isDeposit && !line.isDepositReturn) {
      const dep = state.order.find(x => x.isDeposit && x.articleName === line.articleName);
      line.quantity += by;
      if (dep) dep.quantity += by;
      if (line.quantity <= 0) {
        const articleName = line.articleName;
        state.order = state.order.filter(x => !(x.articleName === articleName && (x === line || x.isDeposit)));
      } else if (dep && dep.quantity <= 0) {
        state.order = state.order.filter(x => x !== dep);
      }
    } else {
      line.quantity += by;
      if (line.quantity <= 0) state.order.splice(index, 1);
    }
    changedOrder();
  }
  function changedOrder() { updateOrderButton(); renderOrderSheet(); if (state.page === 'orders') renderArticleGroups(); }
  function addDepositReturn() {
    modal(`<h2>Pfandrückgabe</h2><div class="form-grid"><div class="field"><label>Pfandpreis</label><input id="depPrice" inputmode="decimal" value="1,00" aria-label="Pfandpreis"></div><div class="field"><label>Anzahl</label><input id="depQty" inputmode="numeric" value="1" aria-label="Anzahl"></div><div class="row fill"><button class="secondary-button" data-close>Abbrechen</button><button id="addDep" class="action-button">Übernehmen</button></div></div>`);
    $('#addDep').onclick = () => {
      const price = num($('#depPrice').value);
      const q = parseInt($('#depQty').value, 10) || 0;
      if (price <= 0) { toast('Bitte gültigen Pfandpreis eingeben'); return; }
      if (q <= 0) { toast('Bitte gültige Anzahl eingeben'); return; }
      state.order.push({ name:'Pfand zurück', articleName:'Pfand zurück', quantity:q, unitPrice:-price, isDeposit:false, isDepositReturn:true });
      closeModal();
      changedOrder();
    };
  }
  function saveOrder() {
    if (!state.order.length) return;
    const total = orderTotal();

    const finish = (received) => {
      state.data.orders.push({ id:id(), date: nowIso(), eventName: state.data.currentEvent, note: state.note, received, lines: state.order.map(x => ({...x})) });
      state.order = []; state.note = ''; save(); closeModal(); closeSheet(); renderArticleGroups(); toast('Bestellung gespeichert');
    };

    // Bei einem reinen Null-/Auszahlungsbetrag bleibt die bestehende Logik erhalten,
    // ohne einen unpassenden Bezahl-Nummernblock einzublenden.
    if (total <= 0) {
      modal(`<div class="payment-view">
        <h2 class="payment-title">Bestellung abschließen</h2>
        <div class="payment-total-card">
          <div class="small-muted">${total < 0 ? 'Auszahlung / Saldo' : 'Gesamtbetrag'}</div>
          <div class="payment-total">${fmt(Math.abs(total))}</div>
        </div>
        <div class="payment-actions">
          <button class="secondary-button" data-close>Zurück</button>
          <button id="finishOrder" class="action-button">✓ Bestellung abschließen</button>
        </div>
      </div>`);
      $('#finishOrder').onclick = () => finish(total);
      return;
    }

    let receivedText = '0';
    const quickAmounts = paymentQuickAmounts(total);
    modal(`<div class="payment-view">
      <h2 class="payment-title">Bezahlung</h2>
      <div class="payment-total-card">
        <div class="small-muted">Zu bezahlen</div>
        <div class="payment-total">${fmt(total)}</div>
      </div>
      <div class="payment-received-card">
        <div class="small-muted">Erhalten</div>
        <div id="receivedDisplay" class="payment-received">${fmt(0)}</div>
      </div>
      <div class="payment-quick-row">
        ${quickAmounts.map(v => `<button type="button" class="payment-quick-button" data-quick="${v}">${fmt(v)}</button>`).join('')}
        <button type="button" id="payExact" class="payment-quick-button exact">Passend</button>
      </div>
      <div id="paymentBalance" class="payment-balance open">
        <span>Noch offen</span><strong>${fmt(total)}</strong>
      </div>
      <div class="payment-keypad" aria-label="Nummernblock für erhaltenen Betrag">
        <button type="button" data-key="1">1</button><button type="button" data-key="2">2</button><button type="button" data-key="3">3</button>
        <button type="button" data-key="4">4</button><button type="button" data-key="5">5</button><button type="button" data-key="6">6</button>
        <button type="button" data-key="7">7</button><button type="button" data-key="8">8</button><button type="button" data-key="9">9</button>
        <button type="button" data-key=",">,</button><button type="button" data-key="0">0</button><button type="button" data-key="back" aria-label="Letzte Ziffer löschen">⌫</button>
      </div>
      <div class="payment-actions">
        <button class="secondary-button" data-close>Zurück</button>
        <button id="finishOrder" class="action-button payment-finish" disabled>✓ Bezahlung abschließen</button>
      </div>
    </div>`);

    const display = $('#receivedDisplay');
    const balance = $('#paymentBalance');
    const finishButton = $('#finishOrder');

    const setReceived = (value) => {
      receivedText = String(Number(value).toFixed(2)).replace('.', ',');
      refreshPayment();
    };

    const refreshPayment = () => {
      const received = num(receivedText);
      display.textContent = fmt(received);
      const difference = received - total;
      if (difference >= -0.0001) {
        balance.className = 'payment-balance change';
        balance.innerHTML = `<span>Rückgeld</span><strong>${fmt(Math.max(0, difference))}</strong>`;
        finishButton.disabled = false;
      } else {
        balance.className = 'payment-balance open';
        balance.innerHTML = `<span>Noch offen</span><strong>${fmt(Math.abs(difference))}</strong>`;
        finishButton.disabled = true;
      }
    };

    $$('[data-quick]', el.modalHost).forEach(button => button.onclick = () => setReceived(Number(button.dataset.quick)));
    $('#payExact').onclick = () => setReceived(total);
    $$('[data-key]', el.modalHost).forEach(button => button.onclick = () => {
      const key = button.dataset.key;
      if (key === 'back') {
        receivedText = receivedText.length > 1 ? receivedText.slice(0, -1) : '0';
      } else if (key === ',') {
        if (!receivedText.includes(',')) receivedText += ',';
      } else {
        const comma = receivedText.indexOf(',');
        if (comma >= 0 && receivedText.length - comma - 1 >= 2) return;
        if (receivedText === '0') receivedText = key;
        else receivedText += key;
      }
      refreshPayment();
    });
    finishButton.onclick = () => {
      const received = num(receivedText);
      if (received + 0.0001 < total) { toast('Betrag noch nicht vollständig'); return; }
      finish(received);
    };
    refreshPayment();
  }

  function paymentQuickAmounts(total) {
    const amounts = [];
    const add = (value) => {
      const rounded = Math.round(Number(value) * 100) / 100;
      if (rounded > total + 0.0001 && !amounts.some(x => Math.abs(x - rounded) < 0.0001)) amounts.push(rounded);
    };

    let first = Math.ceil(total - 0.0001);
    if (first <= total + 0.0001) first = total < 10 ? first + 1 : Math.ceil((total + 1) / 5) * 5;
    add(first);

    let second = Math.ceil(total / 5) * 5;
    while (second <= total + 0.0001 || amounts.some(x => Math.abs(x - second) < 0.0001)) second += 5;
    add(second);

    const notes = [5, 10, 20, 50, 100, 200, 500];
    const third = notes.find(v => v > total + 0.0001 && !amounts.some(x => Math.abs(x - v) < 0.0001) && v > (amounts.at(-1) || 0));
    add(third || (Math.ceil((amounts.at(-1) || total) / 10) * 10 + 10));

    return amounts.slice(0, 3);
  }

  function renderArticlesPage() {
    el.content.innerHTML = pageTitle('Artikelstamm') + `<div class="row fill"><button id="newArticle" class="action-button">+ Artikel</button><button id="newGroup" class="secondary-button">+ Gruppe</button></div><div class="row fill"><button id="deleteArticle" class="danger-button">Artikel löschen</button><button id="deleteGroup" class="danger-button">Gruppe löschen</button></div><div id="articleAdmin"></div>`;
    $('#newArticle').onclick = () => editArticle(); $('#newGroup').onclick = addGroup; $('#deleteArticle').onclick = deleteArticle; $('#deleteGroup').onclick = deleteGroup;
    const box = $('#articleAdmin'); box.innerHTML = '';
    state.data.groups.filter(g => g.name !== 'Favoriten').forEach(g => {
      const articles = state.data.articles.filter(a => a.group === g.name).sort((a,b)=>(a.sortOrder??0)-(b.sortOrder??0)||a.name.localeCompare(b.name,'de'));
      if (!articles.length) return;
      const h = document.createElement('button'); h.type='button'; h.className='group-button'; h.innerHTML = `<span>${escapeHtml(g.name)}</span><span class="group-count">${articles.length}</span>`; box.appendChild(h);
      articles.forEach(article => {
        const card = document.createElement('div'); card.className = 'card';
        card.innerHTML = `<div class="row"><div style="font-size:28px">${escapeHtml(article.icon||'🥤')}</div><div style="flex:1"><div class="line-title">${escapeHtml(article.name)}</div><div class="line-meta">${fmt(article.price)} · ${escapeHtml(article.group)} · ${article.visible ? 'sichtbar' : 'ausgeblendet'} · ${article.favorite ? 'Favorit' : 'kein Favorit'} · ${article.hasDeposit ? 'Pfand '+fmt(article.depositPrice) : 'ohne Pfand'}</div></div><button class="action-button" data-edit="${article.id}">Bearbeiten</button></div>`;
        box.appendChild(card);
      });
    });
    $$('[data-edit]').forEach(b => b.onclick = () => editArticle(state.data.articles.find(a => a.id === b.dataset.edit)));
  }
  function addGroup() {
    modal(`<h2>Neue Gruppe</h2><div class="form-grid"><div class="field"><label>Gruppenname</label><input id="groupName"></div><div class="row fill"><button class="secondary-button" data-close>Abbrechen</button><button id="saveGroup" class="action-button">Speichern</button></div></div>`);
    $('#saveGroup').onclick = () => { const name = norm($('#groupName').value); if (!name) return; if (state.data.groups.some(g => g.name.toLowerCase() === name.toLowerCase())) return toast('Gruppe gibt es bereits'); state.data.groups.push({ name, sortOrder: state.data.groups.length }); save(); closeModal(); renderArticlesPage(); };
  }
  function deleteArticle() {
    const options = state.data.articles.map(a => `<option value="${a.id}">${escapeHtml(a.name)} (${escapeHtml(a.group)})</option>`).join('');
    modal(`<h2>Artikel löschen</h2><div class="form-grid"><div class="field"><label>Artikel auswählen</label><select id="delArticle">${options}</select></div><div class="row fill"><button class="secondary-button" data-close>Abbrechen</button><button id="confirmDelArticle" class="danger-button">Löschen</button></div></div>`);
    $('#confirmDelArticle').onclick = () => {
      const val = $('#delArticle').value;
      const removed = state.data.articles.find(a => a.id === val);
      state.data.articles = state.data.articles.filter(a => a.id !== val);
      if (removed) state.order = state.order.filter(x => x.articleName !== removed.name);
      save();
      updateOrderButton();
      closeModal();
      renderArticlesPage();
      toast('Artikel gelöscht');
    };
  }
  function deleteGroup() {
    const groups = state.data.groups.filter(g => g.name !== 'Favoriten').map(g => `<option value="${escapeAttr(g.name)}">${escapeHtml(g.name)}</option>`).join('');
    modal(`<h2>Gruppe löschen</h2><div class="form-grid"><div class="field"><label>Gruppe auswählen</label><select id="delGroup">${groups}</select></div><div class="card small-muted">Artikel dieser Gruppe werden nach „Sonstiges“ verschoben.</div><div class="row fill"><button class="secondary-button" data-close>Abbrechen</button><button id="confirmDelGroup" class="danger-button">Löschen</button></div></div>`);
    $('#confirmDelGroup').onclick = () => { const name = $('#delGroup').value; state.data.groups = state.data.groups.filter(g => g.name !== name); state.data.articles.forEach(a => { if (a.group === name) a.group = 'Sonstiges'; }); if (!state.data.groups.some(g => g.name === 'Sonstiges')) state.data.groups.push({ name:'Sonstiges', sortOrder: state.data.groups.length }); save(); closeModal(); renderArticlesPage(); toast('Gruppe gelöscht'); };
  }
  function editArticle(article) {
    const isNew = !article;
    const a = article ? {...article} : { id: id(), icon:'🥤', name:'', price:0, group: state.data.groups.find(g=>g.name!=='Favoriten')?.name || 'Sonstiges', visible:true, favorite:false, hasDeposit:false, depositPrice:0.25, sortOrder: state.data.articles.length };
    const groups = state.data.groups.filter(g => g.name !== 'Favoriten').map(g => `<option ${g.name===a.group?'selected':''}>${escapeHtml(g.name)}</option>`).join('');
    modal(`<h2>${isNew ? 'Neuer Artikel' : 'Artikel bearbeiten'}</h2><div class="form-grid">
      <div class="field"><label>Symbol</label><div class="symbol-input-row"><input id="artIcon" value="${escapeAttr(a.icon || '')}" placeholder="Symbol eintragen"><button id="pickSymbol" type="button" class="secondary-button symbol-picker-button"><span id="symbolPreview">${escapeHtml(a.icon || '🥤')}</span><span>Symbol</span></button></div></div>
      <div class="field"><label>Artikelname</label><input id="artName" value="${escapeAttr(a.name)}" placeholder="Name eintragen"></div>
      <div class="field"><label>Preis</label><input id="artPrice" inputmode="decimal" value="${String(Number(a.price).toFixed(2)).replace('.', ',')}"></div>
      <div class="field"><label>Gruppe</label><select id="artGroup">${groups}</select></div>
      ${switchRow('Sichtbarkeit', 'artVisible', a.visible !== false)}
      ${switchRow('Favoriten', 'artFavorite', !!a.favorite)}
      ${switchRow('Pfand', 'artDeposit', !!a.hasDeposit)}
      <div id="depRow" class="field"><label>Pfandwert</label><input id="artDepPrice" inputmode="decimal" value="${String(Number(a.depositPrice || 0.25).toFixed(2)).replace('.', ',')}"></div>
      <div class="row fill"><button class="secondary-button" data-close>Abbrechen</button><button id="saveArticle" class="action-button">Speichern</button></div>
    </div>`);
    const toggleDep = () => $('#depRow').classList.toggle('hidden', !$('#artDeposit').checked); toggleDep(); $('#artDeposit').onchange = toggleDep;
    const syncSymbolPreview = () => { const preview = $('#symbolPreview'); if (preview) preview.textContent = norm($('#artIcon').value) || '🥤'; };
    $('#artIcon').addEventListener('input', syncSymbolPreview);
    $('#pickSymbol').onclick = () => openSymbolPicker($('#artIcon'), syncSymbolPreview);
    $('#saveArticle').onclick = () => {
      const name = norm($('#artName').value); if (!name) return toast('Name fehlt');
      Object.assign(a, { icon: norm($('#artIcon').value) || '🥤', name, price: num($('#artPrice').value), group: $('#artGroup').value, visible: $('#artVisible').checked, favorite: $('#artFavorite').checked, hasDeposit: $('#artDeposit').checked, depositPrice: num($('#artDepPrice').value) });
      if (isNew) state.data.articles.push(a); else Object.assign(article, a);
      save(); closeModal(); renderArticlesPage(); if (state.page === 'orders') renderArticleGroups(); toast('Artikel gespeichert');
    };
  }
  function openSymbolPicker(targetInput, onSelect) {
    const groups = [
      ['Getränke', ['🍺','🍻','🥤','🧃','🧋','☕','🍵','🥛','💧','🫗','🍹','🍸','🍷','🥂','🍾']],
      ['Essen', ['🍟','🌭','🍔','🍕','🥨','🥪','🌯','🌮','🍗','🥩','🥓','🧀','🥗','🍿','🍰','🧁','🍩','🍪']],
      ['Sonstiges', ['⭐','❤️','🔥','🎉','🎟️','🎫','🎁','🪙','💶','🧾','🛒','📦','⚡','✅','🔔','🏷️','🥤','🍽️']]
    ];
    const picker = document.createElement('div');
    picker.className = 'symbol-picker-overlay';
    picker.innerHTML = `<div class="symbol-picker-panel"><div class="symbol-picker-head"><div><div class="symbol-picker-title">Symbol auswählen</div><div class="small-muted">Tippe auf ein Symbol, um es zu übernehmen.</div></div><button type="button" class="icon-button small" id="closeSymbolPicker" aria-label="Symbolauswahl schließen">×</button></div><div class="symbol-picker-scroll">${groups.map(([name, symbols]) => `<div class="symbol-picker-group"><div class="symbol-picker-group-title">${escapeHtml(name)}</div><div class="symbol-grid">${symbols.map(symbol => `<button type="button" class="symbol-choice" data-symbol="${escapeAttr(symbol)}" aria-label="${escapeAttr(symbol)} auswählen">${escapeHtml(symbol)}</button>`).join('')}</div></div>`).join('')}</div></div>`;
    el.modalHost.appendChild(picker);
    const closePicker = () => picker.remove();
    $('#closeSymbolPicker', picker).onclick = closePicker;
    picker.addEventListener('click', e => { if (e.target === picker) closePicker(); });
    $$('.symbol-choice', picker).forEach(button => button.onclick = () => {
      targetInput.value = button.dataset.symbol || '';
      targetInput.dispatchEvent(new Event('input', { bubbles: true }));
      if (onSelect) onSelect();
      closePicker();
    });
  }

  function switchRow(label, idName, checked) { return `<div class="switch-row"><span>${label}</span><label class="switch"><input id="${idName}" type="checkbox" ${checked?'checked':''}><span class="slider"></span></label></div>`; }

  function renderEventsPage() {
    el.content.innerHTML = pageTitle('Eventverwaltung') + `<div class="card"><div class="small-muted">Aktiv</div><div class="stat-value">${escapeHtml(state.data.currentEvent)}</div></div><button id="addEvent" class="action-button" style="width:100%">+ Neues Event</button><div id="events"></div>`;
    $('#addEvent').onclick = () => { modal(`<h2>Neues Event</h2><div class="form-grid"><div class="field"><label>Name</label><input id="eventName"></div><div class="row fill"><button class="secondary-button" data-close>Abbrechen</button><button id="saveEvent" class="action-button">Speichern</button></div></div>`); $('#saveEvent').onclick = () => { const name = norm($('#eventName').value); if (!name) return; setCurrentEvent(name); closeModal(); renderEventsPage(); }; };
    const box = $('#events'); state.data.events.slice().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).forEach(e => { const b = document.createElement('button'); b.type='button'; b.className=e.name===state.data.currentEvent?'action-button':'secondary-button'; b.style.cssText='width:100%;margin-top:8px;text-align:left'; b.textContent=(e.name===state.data.currentEvent?'✓ ':'')+e.name; b.onclick=()=>{setCurrentEvent(e.name); renderEventsPage();}; box.appendChild(b); });
  }
  function setCurrentEvent(name) { state.data.currentEvent = name; if (!state.data.events.some(e=>e.name===name)) state.data.events.push({name,createdAt:nowIso(),isActive:true}); state.data.events.forEach(e=>e.isActive=e.name===name); save(); }
  function renderHistoryPage() {
    const orders = currentOrders().sort((a,b)=>new Date(b.date)-new Date(a.date));
    el.content.innerHTML = pageTitle(`Bestellhistorie · ${state.data.currentEvent}`) + `<div id="hist"></div>`;
    const box = $('#hist');
    if (!orders.length) { box.innerHTML = `<div class="card small-muted">Noch keine Bestellungen gespeichert.</div>`; return; }
    orders.forEach(o => {
      const positions = o.lines.filter(l=>!l.isDeposit).map(l=>`${l.quantity}x ${l.name}`).join(', ');
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `<div class="small-muted">${new Date(o.date).toLocaleString('de-DE')}</div><div class="line-title">${escapeHtml(positions || 'Bestellung')}</div><div class="line-meta">${o.note ? 'Notiz: '+escapeHtml(o.note)+'<br>' : ''}Gesamt ${fmt(totalOf(o))} · Erhalten ${fmt(o.received)} · Rückgeld ${fmt(Math.max(0, Number(o.received)-totalOf(o)))}</div><button class="danger-button" style="width:100%;margin-top:10px" data-cancel-order="${escapeHtml(o.id)}">Bestellung stornieren</button>`;
      box.appendChild(card);
    });
    $$('[data-cancel-order]', box).forEach(button => button.onclick = () => cancelOrder(button.dataset.cancelOrder));
  }
  function cancelOrder(orderId) {
    const idx = state.data.orders.findIndex(o => String(o.id) === String(orderId));
    if (idx < 0) return;
    const orderToCancel = state.data.orders[idx];
    const when = new Date(orderToCancel.date).toLocaleString('de-DE');
    if (!confirm(`Bestellung vom ${when} über ${fmt(totalOf(orderToCancel))} wirklich stornieren?`)) return;
    state.data.orders.splice(idx,1);
    save();
    renderHistoryPage();
    toast('Bestellung storniert');
  }
  function totalOf(o) { return (o.lines||[]).reduce((s,l)=>s+Number(l.unitPrice)*Number(l.quantity),0); }
  function renderStatsPage() {
    const orders = currentOrders(); const today = orders.filter(o=>new Date(o.date).toDateString()===new Date().toDateString());
    const lines = orders.flatMap(o=>o.lines||[]); const normal = lines.filter(l=>!l.isDeposit&&!l.isDepositReturn); const top = Object.values(normal.reduce((m,l)=>{m[l.name]??={name:l.name,qty:0,total:0}; m[l.name].qty+=Number(l.quantity); m[l.name].total+=Number(l.quantity)*Number(l.unitPrice); return m;},{})).sort((a,b)=>b.qty-a.qty).slice(0,10);
    el.content.innerHTML = pageTitle(`Statistik · ${state.data.currentEvent}`) + stat('Bestellungen gesamt', orders.length) + stat('Umsatz gesamt', fmt(orders.reduce((s,o)=>s+totalOf(o),0))) + stat('Heute', fmt(today.reduce((s,o)=>s+totalOf(o),0))) + stat('Pfand eingenommen', fmt(lines.filter(l=>l.isDeposit).reduce((s,l)=>s+Number(l.quantity)*Number(l.unitPrice),0))) + stat('Pfand ausgezahlt', fmt(-lines.filter(l=>l.isDepositReturn).reduce((s,l)=>s+Number(l.quantity)*Number(l.unitPrice),0))) + `<div class="group-button">Top-Artikel</div>` + (top.map(t=>`<div class="card">${t.qty}x ${escapeHtml(t.name)} · ${fmt(t.total)}</div>`).join('') || `<div class="card small-muted">Noch keine Verkäufe.</div>`);
  }
  function stat(label, value) { return `<div class="card row"><div style="flex:1" class="small-muted">${escapeHtml(label)}</div><div class="stat-value">${escapeHtml(value)}</div></div>`; }
  function renderSettingsPage() {
    const lightMode = getTheme() === 'light';
    el.content.innerHTML = pageTitle('Einstellungen') + `
      <div class="card stack">
        <div class="switch-row">
          <div>
            <div>Heller Modus</div>
            <div class="small-muted">Aus = Darkmode · Ein = heller Modus</div>
          </div>
          <label class="switch" aria-label="Hellen Modus umschalten">
            <input id="lightModeToggle" type="checkbox" ${lightMode ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
        </div>
        <button id="exportData" class="secondary-button">Daten exportieren</button>
        <button id="importData" class="secondary-button">Daten importieren</button>
        <input id="importFile" type="file" accept="application/json" class="hidden">
        <button id="resetData" class="danger-button">Demo-Daten zurücksetzen</button>
        <div class="small-muted">Alle Daten werden nur lokal in diesem Browser/Gerät gespeichert. Die App ist nach dem ersten Laden offline nutzbar.</div>
      </div>`;
    $('#lightModeToggle').onchange = e => {
      setTheme(e.target.checked ? 'light' : 'dark');
      toast(e.target.checked ? 'Heller Modus aktiviert' : 'Darkmode aktiviert');
    };
    $('#exportData').onclick = () => { const blob = new Blob([JSON.stringify(state.data,null,2)], {type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='deckelapp-daten.json'; a.click(); URL.revokeObjectURL(url); };
    $('#importData').onclick = () => $('#importFile').click();
    $('#importFile').onchange = async e => { const f=e.target.files?.[0]; if(!f)return; try{ state.data=JSON.parse(await f.text()); save(); showPage('orders'); toast('Daten importiert'); }catch{toast('Import fehlgeschlagen');} };
    $('#resetData').onclick = () => { if(confirm('Lokale Daten wirklich zurücksetzen?')) { state.data = structuredClone(defaults); state.order=[]; state.note=''; save(); showPage('orders'); toast('Zurückgesetzt'); } };
  }

  function modal(html) { el.modalHost.innerHTML = `<div class="modal">${html}</div>`; el.modalHost.classList.remove('hidden'); $$('[data-close]', el.modalHost).forEach(b => b.onclick = closeModal); }
  function closeModal() { el.modalHost.classList.add('hidden'); el.modalHost.innerHTML=''; }
  function escapeHtml(s) { return String(s ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function escapeAttr(s) { return escapeHtml(s); }

  updateHeader(); updateOrderButton(); showPage('orders');
})();
