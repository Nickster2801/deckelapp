(() => {
  'use strict';
  const CHANNEL = 'deckelapp-customer-display-v1';
  const STATE_KEY = 'deckelapp-customer-display-state';
  const $ = s => document.querySelector(s);
  const fmt = n => Number(n || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  const channel = 'BroadcastChannel' in window ? new BroadcastChannel(CHANNEL) : null;
  let lastSnapshot = null;

  const el = {
    logo: $('#terminalLogo'), title: $('#terminalTitle'), event: $('#terminalEvent'), count: $('#terminalCount'),
    empty: $('#terminalEmpty'), lines: $('#terminalLines'), total: $('#terminalTotal')
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

  function combineOrderLines(order) {
    const deposits = new Map();
    const usedDeposits = new Set();

    order.forEach((line, index) => {
      if (!line.isDeposit || line.isDepositReturn) return;
      const key = String(line.articleName || '').trim();
      if (!key) return;
      if (!deposits.has(key)) deposits.set(key, []);
      deposits.get(key).push({ line, index });
    });

    const result = [];
    order.forEach((line, index) => {
      if (line.isDeposit && !line.isDepositReturn) return;

      if (line.isDepositReturn) {
        result.push({
          kind: 'return',
          name: line.name || 'Pfand zurück',
          quantity: Number(line.quantity || 0),
          unitPrice: Number(line.unitPrice || 0),
          total: Number(line.quantity || 0) * Number(line.unitPrice || 0)
        });
        return;
      }

      const key = String(line.articleName || line.name || '').trim();
      const linked = deposits.get(key) || [];
      let depositQty = 0;
      let depositTotal = 0;
      let depositPrice = 0;
      linked.forEach(entry => {
        usedDeposits.add(entry.index);
        const qty = Number(entry.line.quantity || 0);
        const price = Number(entry.line.unitPrice || 0);
        depositQty += qty;
        depositTotal += qty * price;
        if (!depositPrice && price) depositPrice = price;
      });

      const productQty = Number(line.quantity || 0);
      const productPrice = Number(line.unitPrice || 0);
      result.push({
        kind: 'product',
        name: line.name || key,
        quantity: productQty,
        unitPrice: productPrice,
        depositQty,
        depositPrice,
        depositTotal,
        total: productQty * productPrice + depositTotal
      });
    });

    order.forEach((line, index) => {
      if (!line.isDeposit || line.isDepositReturn || usedDeposits.has(index)) return;
      result.push({
        kind: 'deposit',
        name: line.articleName ? `Pfand · ${line.articleName}` : 'Pfand',
        quantity: Number(line.quantity || 0),
        unitPrice: Number(line.unitPrice || 0),
        total: Number(line.quantity || 0) * Number(line.unitPrice || 0)
      });
    });

    return result.filter(line => line.quantity > 0);
  }

  function fitLayout(count) {
    if (!count) {
      document.documentElement.dataset.density = 'normal';
      document.documentElement.style.setProperty('--terminal-cols', 1);
      document.documentElement.style.setProperty('--terminal-rows', 1);
      return;
    }

    const width = Math.max(window.innerWidth || 0, 320);
    const height = Math.max(window.innerHeight || 0, 320);
    const estimatedChrome = width <= 600 ? 132 : 170;
    const usableHeight = Math.max(150, height - estimatedChrome);
    const targetRowHeight = width <= 600 ? 70 : 92;
    const maxRows = Math.max(2, Math.floor(usableHeight / targetRowHeight));
    let cols = Math.max(1, Math.ceil(count / maxRows));
    const maxCols = width < 700 ? 2 : width < 1200 ? 3 : 4;
    cols = Math.min(cols, maxCols);
    let rows = Math.ceil(count / cols);

    while (rows > maxRows && cols < maxCols) {
      cols += 1;
      rows = Math.ceil(count / cols);
    }

    const rowHeight = usableHeight / Math.max(rows, 1);
    const density = rowHeight < 52 ? 'dense' : rowHeight < 75 ? 'compact' : 'normal';
    document.documentElement.dataset.density = density;
    document.documentElement.style.setProperty('--terminal-cols', cols);
    document.documentElement.style.setProperty('--terminal-rows', rows);
  }

  function render(snapshot) {
    if (!snapshot || snapshot.type !== 'order-state') return;
    lastSnapshot = snapshot;
    applyAppearance(snapshot.appearance);
    el.event.textContent = snapshot.eventName || 'Event';
    const itemCount = Number(snapshot.count || 0);
    el.count.textContent = `${itemCount} Artikel`;
    el.total.textContent = fmt(snapshot.total);

    const rawOrder = Array.isArray(snapshot.order) ? snapshot.order.filter(line => Number(line.quantity || 0) > 0) : [];
    const order = combineOrderLines(rawOrder);
    el.empty.classList.toggle('hidden', order.length > 0);
    el.lines.classList.toggle('hidden', order.length === 0);
    fitLayout(order.length);

    el.lines.innerHTML = order.map(line => {
      if (line.kind === 'product') {
        const depositText = line.depositQty > 0
          ? `<span class="terminal-line-deposit"> · Pfand ${fmt(line.depositPrice)}${line.depositQty !== line.quantity ? ` × ${line.depositQty}` : ''}</span>`
          : '';
        return `<article class="terminal-line">
          <div class="terminal-line-main">
            <div class="terminal-line-name">${escapeHtml(line.name)}</div>
            <div class="terminal-line-meta">${line.quantity} × ${fmt(line.unitPrice)}${depositText}</div>
          </div>
          <div class="terminal-line-total">${fmt(line.total)}</div>
        </article>`;
      }

      const cls = line.kind === 'return' ? 'return' : 'deposit';
      return `<article class="terminal-line ${cls}">
        <div class="terminal-line-main">
          <div class="terminal-line-name">${escapeHtml(line.name)}</div>
          <div class="terminal-line-meta">${line.quantity} × ${fmt(line.unitPrice)}</div>
        </div>
        <div class="terminal-line-total">${fmt(line.total)}</div>
      </article>`;
    }).join('');
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

  window.addEventListener('resize', () => {
    if (lastSnapshot) render(lastSnapshot);
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
  }, 250);

  try { channel?.postMessage({ type: 'customer-ready' }); } catch {}
  setInterval(() => { try { channel?.postMessage({ type: 'customer-heartbeat' }); } catch {} }, 2500);
  window.addEventListener('beforeunload', () => { try { channel?.postMessage({ type: 'customer-closed' }); } catch {} });
})();
