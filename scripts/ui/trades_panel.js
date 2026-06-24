// Live market-data view for the top-left of the map.
//
// Connects to the server's public `/trades` WebSocket (the trading extension
// pack, gated behind ENABLE_TRADING on the server) and shows, per resource:
//   - the resting order book's top 3 bid / ask price levels,
//   - the latest trade, and
//   - a running count of trades filled this game.
//
// The feed sends one full MarketSnapshot on subscribe (per-resource fair price +
// resting bids/asks) and thereafter an incremental MarketEvent stream
// ("order_add" / "order_remove" / "trade"); the snapshot is the only full book
// we ever get, so we maintain the book ourselves from the event stream.
//
// State is mirrored to localStorage keyed by game id, so a page reload restores
// the view instantly and — importantly — carries the client-accumulated fill
// count across reloads (it is never re-sent by the server). The next snapshot
// re-seeds the authoritative book on top of whatever we restored.
//
// If the server has trading disabled the socket simply errors/closes and the
// panel stays hidden, so this is a no-op against non-trading servers.

import assetManager from '/scripts/ui/asset_manager.js';

// Granite (resource id 0) is the currency, never a tradeable commodity.
const GRANITE_ID = 0;

// How many price levels to show per side.
const LEVELS = 3;

const STORAGE_PREFIX = 'mb_trades_';
const SAVE_DEBOUNCE_MS = 300;

class TradesPanel {
  constructor() {
    this.ws = null;
    this.sessionId = 0;            // bumped on each connect/disconnect to fence stale callbacks
    this.gameId = null;
    this.latestTrade = {};         // resource_id -> { side, quantity, price_per_unit, time_stamp }
    this.fairPrice = {};           // resource_id -> granite fair price
    this.tradeCount = {};          // resource_id -> # trades filled this game
    this.book = {};                // resource_id -> { bids: {orderId:{q,p}}, asks: {orderId:{q,p}} }
    this.resourceNames = {};       // resource_id -> display name
    this.root = null;
    this.listEl = null;
    this.saveTimer = null;
  }

  ensureDom() {
    if (this.root) return;
    this.root = document.getElementById('trades-panel');
    if (this.root) this.listEl = this.root.querySelector('#trades-panel-list');
  }

  setResources(resourceConfigs) {
    this.resourceNames = {};
    (resourceConfigs || []).forEach((rc, idx) => {
      this.resourceNames[idx] = rc.name;
    });
  }

  show() { this.ensureDom(); this.root?.classList.remove('hidden'); }
  hide() { this.ensureDom(); this.root?.classList.add('hidden'); }

  // Clear in-memory + DOM state. Does not touch persisted storage.
  reset() {
    this.latestTrade = {};
    this.fairPrice = {};
    this.tradeCount = {};
    this.book = {};
    this.ensureDom();
    if (this.listEl) this.listEl.innerHTML = '';
    this.hide();
  }

  // ---- persistence -------------------------------------------------------

  storageKey(gameId) { return `${STORAGE_PREFIX}${gameId}`; }

  // Restore state for a game (if any) and prune other games' leftovers.
  loadState(gameId) {
    this.reset();
    try {
      // Drop stale per-game entries so storage doesn't grow without bound.
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_PREFIX) && key !== this.storageKey(gameId)) {
          localStorage.removeItem(key);
        }
      }
      const raw = localStorage.getItem(this.storageKey(gameId));
      if (raw) {
        const s = JSON.parse(raw);
        this.fairPrice = s.fairPrice || {};
        this.tradeCount = s.tradeCount || {};
        this.book = s.book || {};
        this.latestTrade = s.latestTrade || {};
      }
    } catch (e) {
      console.warn('Trades: could not load saved state:', e);
    }
  }

  scheduleSave() {
    if (this.saveTimer || this.gameId == null) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.saveState();
    }, SAVE_DEBOUNCE_MS);
  }

  saveState() {
    if (this.gameId == null) return;
    try {
      localStorage.setItem(this.storageKey(this.gameId), JSON.stringify({
        fairPrice: this.fairPrice,
        tradeCount: this.tradeCount,
        book: this.book,
        latestTrade: this.latestTrade,
      }));
    } catch (e) {
      console.warn('Trades: could not save state:', e);
    }
  }

  // ---- connection --------------------------------------------------------

  // Open a fresh trades feed for a game. resourceConfigs is map_config.resource_configs
  // (index === resource_id), used for names; icons come from the shared assetManager.
  connect(wsUrl, gameId, resourceConfigs) {
    this.disconnect();
    this.setResources(resourceConfigs);
    this.gameId = gameId;
    this.loadState(gameId);
    // If we restored anything, show it right away while the socket reconnects.
    if (Object.keys(this.fairPrice).length || Object.keys(this.latestTrade).length) {
      this.show();
      this.render();
    }

    const sessionId = ++this.sessionId;
    let ws;
    try {
      ws = new WebSocket(wsUrl);
    } catch (e) {
      console.warn('Trades feed unavailable:', e);
      return;
    }
    this.ws = ws;

    ws.onopen = () => {
      if (sessionId !== this.sessionId) { ws.close(); return; }
      ws.send(JSON.stringify({ game_id: gameId }));
    };

    ws.onmessage = (msg) => {
      if (sessionId !== this.sessionId) return;
      const handle = (text) => {
        let data;
        try { data = JSON.parse(text); } catch { return; }
        this.handleMessage(data);
      };
      if (msg.data instanceof Blob) msg.data.text().then(handle);
      else if (typeof msg.data === 'string') handle(msg.data);
    };

    // A server without the trading pack just won't accept the socket; keep quiet.
    ws.onerror = () => { console.log('Trades feed not available on this server.'); };
    ws.onclose = () => { if (sessionId === this.sessionId) this.ws = null; };
  }

  disconnect() {
    this.sessionId++;
    if (this.saveTimer) { clearTimeout(this.saveTimer); this.saveTimer = null; }
    this.saveState();              // flush before tearing down
    if (this.ws) {
      try { this.ws.onclose = null; this.ws.close(); } catch { /* ignore */ }
      this.ws = null;
    }
  }

  // ---- book maintenance --------------------------------------------------

  bookFor(resourceId) {
    let b = this.book[resourceId];
    if (!b) { b = this.book[resourceId] = { bids: {}, asks: {} }; }
    if (!b.bids) b.bids = {};
    if (!b.asks) b.asks = {};
    return b;
  }

  // The server serializes with glaze, which omits any field equal to its
  // default. So the snapshot's `type` ("snapshot", its default) never reaches
  // the wire, and an event's `side` is absent when it is the default `kBuy`.
  // We therefore dispatch the snapshot structurally (presence of `books`) and
  // treat a missing side as a buy.
  orderIdOf(o) { return o.order_id != null ? o.order_id : o.id; }
  isBuy(o) { return o.side === undefined ? true : o.side === 'kBuy'; }

  seedOrder(side, o) {
    const id = this.orderIdOf(o);
    if (id == null) return;
    side[id] = { q: o.quantity, p: o.price_per_unit };
  }

  afterUpdate() {
    this.scheduleSave();
    this.show();
    this.render();
  }

  handleMessage(data) {
    if (!data || typeof data !== 'object') return;

    // Subscribe handshake greeting: { "message": "..." } — nothing to show.
    if (data.message && !Array.isArray(data.books)) return;

    // Full market snapshot. Sent once on subscribe (and re-seeds the book if the
    // server ever resends one). It carries no `type` field — detect by `books`.
    if (Array.isArray(data.books)) {
      data.books.forEach(book => {
        this.fairPrice[book.resource_id] = book.fair_price;
        const b = this.bookFor(book.resource_id);
        b.bids = {};
        b.asks = {};
        (book.bids || []).forEach(o => this.seedOrder(b.bids, o));
        (book.asks || []).forEach(o => this.seedOrder(b.asks, o));
      });
      this.afterUpdate();
      return;
    }

    switch (data.type) {
      case 'order_add': {
        const b = this.bookFor(data.resource_id);
        const side = this.isBuy(data) ? b.bids : b.asks;
        side[this.orderIdOf(data)] = { q: data.quantity, p: data.price_per_unit };
        break;
      }

      case 'order_remove': {
        const b = this.bookFor(data.resource_id);
        // `side` may be absent on removes; delete by id from whichever side holds it.
        const id = this.orderIdOf(data);
        delete b.bids[id];
        delete b.asks[id];
        break;
      }

      case 'trade': {
        this.latestTrade[data.resource_id] = {
          side: this.isBuy(data) ? 'kBuy' : 'kSell',
          quantity: data.quantity,
          price_per_unit: data.price_per_unit,
          time_stamp: data.time_stamp,
        };
        this.tradeCount[data.resource_id] = (this.tradeCount[data.resource_id] || 0) + 1;
        // Decrement the resting order that was hit so the ladder stays accurate
        // until its "order_remove"/"filled" arrives.
        if (data.maker_order_id) {
          const b = this.bookFor(data.resource_id);
          for (const sideKey of ['bids', 'asks']) {
            const o = b[sideKey][data.maker_order_id];
            if (o) {
              o.q -= data.quantity;
              if (o.q <= 0) delete b[sideKey][data.maker_order_id];
              break;
            }
          }
        }
        break;
      }

      default:
        // Unrecognized payload — log once-ish so the wire format can be checked.
        console.debug('Trades: unhandled message', data);
        return;
    }

    this.afterUpdate();
  }

  // Aggregate a side's orders into the top price levels (qty summed per price).
  // side === 'bids' -> highest price first; 'asks' -> lowest price first.
  topLevels(resourceId, sideKey) {
    const orders = this.book[resourceId]?.[sideKey];
    if (!orders) return [];
    const byPrice = new Map();
    for (const o of Object.values(orders)) {
      if (!o || o.q <= 0) continue;
      byPrice.set(o.p, (byPrice.get(o.p) || 0) + o.q);
    }
    const levels = [...byPrice.entries()].map(([p, q]) => ({ p, q }));
    levels.sort((a, b) => (sideKey === 'bids' ? b.p - a.p : a.p - b.p));
    return levels.slice(0, LEVELS);
  }

  // ---- rendering ---------------------------------------------------------

  render() {
    this.ensureDom();
    if (!this.listEl) return;

    // Union of every tradeable resource we know about, granite excluded.
    const ids = new Set();
    Object.keys(this.resourceNames).forEach(id => { if (Number(id) !== GRANITE_ID) ids.add(Number(id)); });
    Object.keys(this.fairPrice).forEach(id => ids.add(Number(id)));
    Object.keys(this.latestTrade).forEach(id => ids.add(Number(id)));
    Object.keys(this.book).forEach(id => ids.add(Number(id)));

    const sorted = [...ids].sort((a, b) => a - b);
    this.listEl.innerHTML = '';
    sorted.forEach(id => this.listEl.appendChild(this.renderCard(id)));
  }

  renderCard(id) {
    const name = this.resourceNames[id] || `Resource ${id}`;
    const { itemImageSrc } = assetManager.getItemInfo({ id });
    const trade = this.latestTrade[id];
    const fair = this.fairPrice[id];
    const fills = this.tradeCount[id] || 0;

    const card = document.createElement('div');
    card.className = 'trade-card';

    // Header: icon + name/fair + fill count.
    const head = document.createElement('div');
    head.className = 'trade-card-head';

    const icon = document.createElement('img');
    icon.className = 'trade-card-icon';
    icon.src = itemImageSrc;
    icon.alt = name;
    head.appendChild(icon);

    const headText = document.createElement('div');
    headText.className = 'trade-card-headtext';

    const title = document.createElement('div');
    title.className = 'trade-card-name';
    title.textContent = name;
    headText.appendChild(title);

    const fairLine = document.createElement('div');
    fairLine.className = 'trade-card-fair';
    fairLine.textContent = fair != null ? `Fair ${fair}` : '';
    headText.appendChild(fairLine);

    head.appendChild(headText);

    const fillsBadge = document.createElement('div');
    fillsBadge.className = 'trade-card-fills';
    fillsBadge.textContent = `${fills} fill${fills === 1 ? '' : 's'}`;
    fillsBadge.title = 'Trades filled this game';
    head.appendChild(fillsBadge);

    card.appendChild(head);

    // Latest trade line.
    const last = document.createElement('div');
    last.className = 'trade-card-last';
    if (trade) {
      const isBuy = trade.side === 'kBuy';
      last.classList.add(isBuy ? 'trade-buy' : 'trade-sell');
      last.textContent = `${isBuy ? 'BUY' : 'SELL'} ${trade.quantity} @ ${trade.price_per_unit}`;
    } else {
      last.classList.add('trade-none');
      last.textContent = 'No trades yet';
    }
    card.appendChild(last);

    // Top-3 bid / ask ladder.
    const bids = this.topLevels(id, 'bids');
    const asks = this.topLevels(id, 'asks');
    card.appendChild(this.renderBook(bids, asks));

    return card;
  }

  renderBook(bids, asks) {
    const wrap = document.createElement('div');
    wrap.className = 'trade-card-book';

    const makeCol = (label, levels, cls) => {
      const col = document.createElement('div');
      col.className = `trade-book-col ${cls}`;

      const head = document.createElement('div');
      head.className = 'trade-book-colhead';
      head.textContent = label;
      col.appendChild(head);

      if (!levels.length) {
        const empty = document.createElement('div');
        empty.className = 'trade-book-row trade-book-empty';
        empty.textContent = '—';
        col.appendChild(empty);
      } else {
        levels.forEach(({ p, q }) => {
          const row = document.createElement('div');
          row.className = 'trade-book-row';

          const px = document.createElement('span');
          px.className = 'trade-book-px';
          px.textContent = p;
          row.appendChild(px);

          const qty = document.createElement('span');
          qty.className = 'trade-book-qty';
          qty.textContent = `×${q}`;
          row.appendChild(qty);

          col.appendChild(row);
        });
      }
      return col;
    };

    wrap.appendChild(makeCol('BID', bids, 'trade-book-bids'));
    wrap.appendChild(makeCol('ASK', asks, 'trade-book-asks'));
    return wrap;
  }
}

const tradesPanel = new TradesPanel();
export default tradesPanel;
