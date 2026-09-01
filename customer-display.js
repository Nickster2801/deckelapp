(() => {
  'use strict';
  const CHANNEL = 'deckelapp-customer-display-v1';
  const STATE_KEY = 'deckelapp-customer-display-state';
  const $ = s => document.querySelector(s);
  const fmt = n => Number(n || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  const channel = 'BroadcastChannel' in window ? new BroadcastChannel(CHANNEL) : null;
  let lastSnapshot = null;
  let lastHighlighted = '';

  const el = {
    logo: $('#terminalLogo'), title: $('#terminalTitle'), event: $('#terminalEvent'), count: $('#terminalCount'),
    empty: $('#terminalEmpty'), change: $('#terminalChange'), lines: $('#terminalLines'), total: $('#terminalTotal')
  };

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c]));
  }

  function applyAppearance(appearance = {}) {
    const theme = ['classic','orange','burgundy','forest'].includes(appearance.theme) ? appearance.theme : 'classic';
    const mode = appearance.mode === 'light' ? 'light' : 'dark';
    document.documentElement.dataset.preset = theme;
    document.documentElement.dataset.mode = mode;
    if (appearance.useCustomBg && /^#[0-9a-f]{6}$/i.test(appearance.background || '')) {
      document.documentElement.style.setProperty('--td-bg', appearance.background);
      document.documentElement.style.setProperty('--td-bg2', appearance.background);
    } else {
      document.documentElement.style.removeProperty('--td-bg');
      document.documentElement.style.removeProperty('--td-bg2');
    }
    const presetThemeColors = {
      classic: mode === 'light' ? '#F4F6FB' : '#07111F',
      orange: mode === 'light' ? '#FFF7ED' : '#1A1008',
      burgundy: mode === 'light' ? '#FFF1F2' : '#17080E',
      forest: mode === 'light' ? '#F0FDF4' : '#06140D'
    };
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute('content', appearance.useCustomBg ? appearance.background : presetThemeColors[theme]);
    el.logo.src = appearance.logo || 'icons/icon-192.png';
    el.title.textContent = appearance.title || 'Ihre Bestellung';
  }

  function render(snapshot) {
    if (!snapshot || snapshot.type !== 'order-state') return;
    lastSnapshot = snapshot;
    applyAppearance(snapshot.appearance);
    el.event.textContent = snapshot.eventName || 'Event';
    const itemCount = Number(snapshot.count || 0);
    el.count.textContent = `${itemCount} ${itemCount === 1 ? 'Artikel' : 'Artikel'}`;
    el.total.textContent = fmt(snapshot.total);

    const order = Array.isArray(snapshot.order) ? snapshot.order.filter(line => Number(line.quantity || 0) > 0) : [];
    el.empty.classList.toggle('hidden', order.length > 0);
    el.lines.classList.toggle('hidden', order.length === 0);

    const change = snapshot.lastChange;
    if (change?.name && change.name !== 'Bestellung abgeschlossen' && change.name !== 'Bestellung geleert') {
      const sign = Number(change.delta) > 0 ? '+' : Number(change.delta) < 0 ? '−' : '';
      el.change.textContent = sign ? `Zuletzt geändert: ${sign}${Math.abs(Number(change.delta))} ${change.name}` : `Zuletzt: ${change.name}`;
      el.change.classList.remove('hidden');
    } else {
      el.change.classList.add('hidden');
    }

    const changeKey = String(change?.seq ?? change?.at ?? snapshot.changeSeq ?? '');
    const latestName = changeKey !== lastHighlighted ? change?.name : '';
    el.lines.innerHTML = order.map(line => {
      const label = line.isDeposit && line.articleName && line.articleName !== 'Pfand'
        ? `Pfand · ${line.articleName}`
        : line.name;
      const cls = line.isDepositReturn ? 'return' : line.isDeposit ? 'deposit' : '';
      const latest = latestName && !line.isDeposit && (line.articleName === latestName || line.name === latestName) ? ' latest' : '';
      return `<article class="terminal-line ${cls}${latest}">
        <div class="terminal-line-main">
          <div class="terminal-line-name">${escapeHtml(label)}</div>
          <div class="terminal-line-meta">${Number(line.quantity)} × ${fmt(line.unitPrice)}</div>
        </div>
        <div class="terminal-line-total">${fmt(Number(line.quantity) * Number(line.unitPrice))}</div>
      </article>`;
    }).join('');
    lastHighlighted = changeKey;
  }


  window.addEventListener('message', event => {
    if (event.origin !== location.origin) return;
    const msg = event.data || {};
    if (msg.type === 'order-state') render(msg);
    if (msg.type === 'close-display') window.close();
  });

  channel?.addEventListener('message', event => {
    const msg = event.data || {};
    if (msg.type === 'order-state') render(msg);
    if (msg.type === 'close-display') window.close();
  });

  window.addEventListener('storage', event => {
    if (event.key !== STATE_KEY || !event.newValue) return;
    try { render(JSON.parse(event.newValue)); } catch {}
  });

  try {
    const cached = JSON.parse(localStorage.getItem(STATE_KEY) || 'null');
    if (cached) render(cached);
  } catch {}

  let lastStoredUpdate = '';
  setInterval(() => {
    try {
      const cached = JSON.parse(localStorage.getItem(STATE_KEY) || 'null');
      if (!cached) return;
      const stamp = String(cached.updatedAt || '');
      if (stamp && stamp !== lastStoredUpdate) {
        lastStoredUpdate = stamp;
        render(cached);
      }
    } catch {}
  }, 350);

  try { channel?.postMessage({ type: 'customer-ready' }); } catch {}
  setInterval(() => { try { channel?.postMessage({ type: 'customer-heartbeat' }); } catch {} }, 2500);
  window.addEventListener('beforeunload', () => { try { channel?.postMessage({ type: 'customer-closed' }); } catch {} });
})();
