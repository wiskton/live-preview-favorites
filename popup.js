document.addEventListener('DOMContentLoaded', async () => {

  // ── i18n ──────────────────────────────────────────────────────────────────
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const msg = chrome.i18n.getMessage(el.dataset.i18n);
    if (msg) el.textContent = msg;
  });

  // ── Elements ──────────────────────────────────────────────────────────────
  const twitchList    = document.getElementById('twitch-list');
  const kickList      = document.getElementById('kick-list');
  const twitchCount   = document.getElementById('twitch-count');
  const kickCount     = document.getElementById('kick-count');
  const twitchLoading = document.getElementById('twitch-loading');
  const kickLoading   = document.getElementById('kick-loading');
  const settingsToggle = document.getElementById('settingsToggle');
  const settingsPanel  = document.getElementById('settingsPanel');
  const mixCheckbox    = document.getElementById('mixPlatforms');
  const btcBox         = document.getElementById('btcBox');

  // ── Settings toggle ───────────────────────────────────────────────────────
  settingsToggle.addEventListener('click', () => {
    settingsPanel.classList.toggle('open');
  });

  // ── Load settings ─────────────────────────────────────────────────────────
  const stored = await chrome.storage.local.get(['favorites', 'mixPlatforms', 'avatarCache']);
  const favorites  = stored.favorites  || [];
  const avatarCache = stored.avatarCache || {};
  mixCheckbox.checked = stored.mixPlatforms || false;

  mixCheckbox.addEventListener('change', () => {
    chrome.storage.local.set({ mixPlatforms: mixCheckbox.checked });
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  function getPlat(f) {
    return f.platform || (f.url?.includes('kick.com') ? 'kick' : 'twitch');
  }

  function formatViewers(n) {
    n = parseInt(n);
    if (isNaN(n) || n <= 0) return chrome.i18n.getMessage('liveText');
    if (n < 1000)    return n.toString();
    if (n < 1000000) return (n / 1000).toFixed(1).replace('.0', '') + 'k';
    return (n / 1000000).toFixed(1).replace('.0', '') + 'M';
  }

  function svgAvatar(ch, sz) {
    const h = ch.split('').reduce((a, c) => c.charCodeAt(0) + ((a << 5) - a), 0);
    const cols = ['#6441a5','#e91e63','#2196f3','#4caf50','#ff9800','#f44336','#9c27b0','#00bcd4'];
    const c = cols[Math.abs(h) % cols.length];
    const i = (ch[0] || '?').toUpperCase();
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${sz} ${sz}'%3E%3Crect fill='${encodeURIComponent(c)}' width='${sz}' height='${sz}'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='${Math.floor(sz/2)}' fill='white' font-family='Arial' font-weight='bold'%3E${i}%3C/text%3E%3C/svg%3E`;
  }

  function svgThumb(ch) {
    const h = ch.split('').reduce((a, c) => c.charCodeAt(0) + ((a << 5) - a), 0);
    const cols = ['#6441a5','#e91e63','#2196f3','#4caf50','#ff9800','#f44336','#9c27b0','#00bcd4'];
    const c = cols[Math.abs(h) % cols.length];
    const i = (ch[0] || '?').toUpperCase();
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 180'%3E%3Crect fill='${encodeURIComponent(c)}' width='320' height='180'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='60' fill='white' font-family='Arial' font-weight='bold' opacity='0.5'%3E${i}%3C/text%3E%3C/svg%3E`;
  }

  function getTwitchThumb(ch) {
    const ts = Math.floor(Date.now() / 30000);
    return `https://static-cdn.jtvnw.net/previews-ttv/live_user_${ch.toLowerCase()}-320x180.jpg?t=${ts}`;
  }

  async function getKickThumb(ch) {
    try {
      const r = await fetch(`https://kick.com/api/v1/channels/${ch}`, {
        headers: { 'Accept': 'application/json' }
      });
      const data = await r.json();
      let url = data?.livestream?.thumbnail?.url;
      if (!url) return svgThumb(ch);
      const ts = Math.floor(Date.now() / 30000);
      return url + (url.includes('?') ? '&' : '?') + 't=' + ts;
    } catch { return svgThumb(ch); }
  }

  async function getTwitchTitle(ch) {
    try {
      const r = await fetch(`https://decapi.me/twitch/title/${ch}`);
      const t = (await r.text()).trim();
      return (!t || t.toLowerCase().includes('error')) ? '' : t;
    } catch { return ''; }
  }

  // ── Hover Preview ─────────────────────────────────────────────────────────
  const hoverPreview = document.createElement('div');
  Object.assign(hoverPreview.style, {
    position: 'fixed',
    width: '320px',
    border: 'none',
    borderRadius: '10px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.85)',
    display: 'none',
    pointerEvents: 'none',
    zIndex: '999999',
    background: '#0e0e10',
    overflow: 'hidden',
    flexDirection: 'column',
  });
  document.body.appendChild(hoverPreview);

  const hpImg = document.createElement('img');
  Object.assign(hpImg.style, {
    width: '320px', height: '180px', objectFit: 'cover',
    display: 'block', borderRadius: '10px 10px 0 0', transition: 'opacity 0.15s',
  });
  hoverPreview.appendChild(hpImg);

  const hpInfo = document.createElement('div');
  Object.assign(hpInfo.style, {
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '8px 10px', background: 'rgba(18,18,24,0.98)',
    borderRadius: '0 0 10px 10px',
  });
  hoverPreview.appendChild(hpInfo);

  const hpAvatar = document.createElement('img');
  Object.assign(hpAvatar.style, {
    width: '30px', height: '30px', borderRadius: '50%',
    objectFit: 'cover', flexShrink: '0',
    border: '2px solid rgba(255,255,255,0.15)',
  });
  hpInfo.appendChild(hpAvatar);

  const hpText = document.createElement('div');
  Object.assign(hpText.style, { display: 'flex', flexDirection: 'column', minWidth: '0', flex: '1' });
  hpInfo.appendChild(hpText);

  const hpName = document.createElement('span');
  Object.assign(hpName.style, {
    color: '#fff', fontWeight: '700', fontSize: '13px',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  });
  hpText.appendChild(hpName);

  const hpTitle = document.createElement('span');
  Object.assign(hpTitle.style, {
    color: '#efeff1', fontSize: '11px', marginTop: '1px',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  });
  hpText.appendChild(hpTitle);

  const hpSub = document.createElement('span');
  Object.assign(hpSub.style, { color: '#adadb8', fontSize: '11px', marginTop: '1px' });
  hpText.appendChild(hpSub);

  const hpBadge = document.createElement('span');
  Object.assign(hpBadge.style, {
    marginLeft: 'auto', background: '#eb0400', color: '#fff',
    fontSize: '10px', fontWeight: '700', padding: '2px 6px',
    borderRadius: '5px', letterSpacing: '0.5px', flexShrink: '0',
  });
  hpBadge.textContent = '🔴 LIVE';
  hpInfo.appendChild(hpBadge);

  let hpCurrentCh = null;
  let hpHideTimer = null;

  function showHoverPreview(item, ch, platform, info) {
    clearTimeout(hpHideTimer);
    hpCurrentCh = ch;

    // Thumbnail placeholder
    hpImg.style.opacity = '0.4';
    hpImg.src = svgThumb(ch);
    hpImg.onerror = () => { hpImg.src = svgThumb(ch); hpImg.style.opacity = '1'; };
    hpImg.onload  = () => { hpImg.style.opacity = '1'; };

    // Avatar
    hpAvatar.src = info.avatar || svgAvatar(ch, 30);
    hpAvatar.onerror = () => { hpAvatar.src = svgAvatar(ch, 30); };

    // Nome e viewers
    hpName.textContent  = ch;
    hpSub.textContent   = info.viewers ? `${formatViewers(info.viewers)} ${chrome.i18n.getMessage('viewersSuffix') || 'viewers'}` : '...';
    hpTitle.textContent = info.game || '...';

    // Buscar título real
    if (platform === 'twitch') {
      getTwitchTitle(ch).then(t => {
        if (hpCurrentCh === ch) hpTitle.textContent = t || info.game || '';
      });
    } else {
      // Para Kick, o título já vem nos dados
      fetch(`https://kick.com/api/v1/channels/${ch}`, { headers: { 'Accept': 'application/json' } })
        .then(r => r.json())
        .then(data => {
          if (hpCurrentCh !== ch) return;
          const t = data?.livestream?.session_title || '';
          hpTitle.textContent = t || info.game || '';
        }).catch(() => {});
    }

    // Thumbnail real
    if (platform === 'kick') {
      getKickThumb(ch).then(url => {
        if (hpCurrentCh === ch) hpImg.src = url;
      });
    } else {
      hpImg.src = getTwitchThumb(ch);
    }

    // Posicionamento: aparece acima do item, alinhado à esquerda do popup
    hoverPreview.style.display = 'flex';
    const rect = item.getBoundingClientRect();
    const previewH = 180 + 58; // img + info
    let top = rect.top - previewH - 8;
    if (top < 4) top = rect.bottom + 8; // se não cabe acima, vai abaixo
    let left = rect.left;
    // Garante que não sai da janela (popup tem 480px de largura, preview 320px)
    if (left + 320 > window.innerWidth) left = window.innerWidth - 324;
    if (left < 4) left = 4;

    hoverPreview.style.top  = top  + 'px';
    hoverPreview.style.left = left + 'px';
  }

  function hideHoverPreview() {
    hpHideTimer = setTimeout(() => {
      hoverPreview.style.display = 'none';
      hpCurrentCh = null;
    }, 100);
  }

  // ── API calls ─────────────────────────────────────────────────────────────
  async function getTwitchViewers(ch) {
    try {
      const r = await fetch(`https://decapi.me/twitch/viewercount/${ch}`);
      const t = (await r.text()).trim();
      return t;
    } catch { return '0'; }
  }

  async function getTwitchGame(ch) {
    try {
      const r = await fetch(`https://decapi.me/twitch/game/${ch}`);
      const t = (await r.text()).trim();
      return (!t || t.toLowerCase().includes('error')) ? '' : t;
    } catch { return ''; }
  }

  async function getTwitchAvatar(ch) {
    const key = `twitch:${ch}`;
    if (avatarCache[key]?.url) return avatarCache[key].url;
    try {
      const r = await fetch(`https://decapi.me/twitch/avatar/${ch}`);
      const t = (await r.text()).trim();
      return (t && t.startsWith('http')) ? t : null;
    } catch { return null; }
  }

  async function getKickData(ch) {
    try {
      const r = await fetch(`https://kick.com/api/v1/channels/${ch}`, {
        headers: { 'Accept': 'application/json' }
      });
      return await r.json();
    } catch { return null; }
  }

  // ── Check if live + get info ───────────────────────────────────────────────
  async function getTwitchInfo(ch) {
    const [viewers, game, avatar] = await Promise.all([
      getTwitchViewers(ch),
      getTwitchGame(ch),
      getTwitchAvatar(ch),
    ]);
    const n = parseInt(viewers, 10);
    const online = !isNaN(n) && n > 0;
    return { online, viewers, game, avatar };
  }

  async function getKickInfo(ch) {
    const data = await getKickData(ch);
    if (!data) return { online: false };
    const viewers = data?.livestream?.viewer_count ?? 0;
    const online  = viewers > 0;
    const game    = data?.recent_categories?.[0]?.name || '';
    const avatar  = data?.user?.profile_pic || avatarCache[`kick:${ch}`]?.url || null;
    return { online, viewers: viewers.toString(), game, avatar };
  }

  // ── Render a single channel item ─────────────────────────────────────────
  function renderItem(fav, info, platform) {
    const href = platform === 'kick'
      ? `https://kick.com/${fav.channel}`
      : `https://www.twitch.tv/${fav.channel}`;

    const item = document.createElement('a');
    item.href      = href;
    item.target    = '_blank';
    item.rel       = 'noopener noreferrer';
    item.className = 'channel-item';
    item.draggable = true;
    item.dataset.channel  = fav.channel;
    item.dataset.platform = platform;

    // Hover preview
    item.addEventListener('mouseenter', () => showHoverPreview(item, fav.channel, platform, info));
    item.addEventListener('mouseleave', hideHoverPreview);

    // Drag handle icon
    const handle = document.createElement('span');
    handle.className   = 'drag-handle';
    handle.textContent = '⠿';
    handle.title       = chrome.i18n.getMessage('dragToReorder');
    item.appendChild(handle);

    // Avatar
    const img = document.createElement('img');
    img.className = 'channel-avatar';
    img.src = info.avatar || svgAvatar(fav.channel, 26);
    img.onerror = () => { img.src = svgAvatar(fav.channel, 26); };
    item.appendChild(img);

    // Info
    const infoDiv = document.createElement('div');
    infoDiv.className = 'channel-info';

    const nameDiv = document.createElement('div');
    nameDiv.className   = 'channel-name';
    nameDiv.textContent = fav.channel;
    infoDiv.appendChild(nameDiv);

    if (info.game) {
      const metaDiv = document.createElement('div');
      metaDiv.className   = 'channel-meta';
      metaDiv.textContent = info.game;
      infoDiv.appendChild(metaDiv);
    }

    item.appendChild(infoDiv);

    // Live dot
    const dot = document.createElement('span');
    dot.className = 'live-dot';
    item.appendChild(dot);

    // Viewers
    const vSpan = document.createElement('span');
    vSpan.className   = 'viewers-text';
    vSpan.textContent = formatViewers(info.viewers);
    item.appendChild(vSpan);

    return item;
  }

  // ── Drag & drop reorder ───────────────────────────────────────────────────
  let dragSrc = null;

  function addDragEvents(listEl, platform) {
    listEl.addEventListener('dragstart', e => {
      const item = e.target.closest('.channel-item');
      if (!item) return;
      dragSrc = item;
      item.classList.add('dragging');
      item._didDrag = true;
      e.dataTransfer.effectAllowed = 'move';
    });

    listEl.addEventListener('dragend', e => {
      const item = e.target.closest('.channel-item');
      if (!item) return;
      item.classList.remove('dragging');
      listEl.querySelectorAll('.channel-item').forEach(el => {
        el.classList.remove('drag-over', 'kick-col');
      });
      dragSrc = null;
    });

    listEl.addEventListener('click', e => {
      const item = e.target.closest('.channel-item');
      if (item?._didDrag) { e.preventDefault(); item._didDrag = false; }
    }, true);

    listEl.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const item = e.target.closest('.channel-item');
      if (!item || item === dragSrc) return;
      listEl.querySelectorAll('.channel-item').forEach(el => el.classList.remove('drag-over', 'kick-col'));
      item.classList.add('drag-over');
      if (platform === 'kick') item.classList.add('kick-col');
    });

    listEl.addEventListener('dragleave', e => {
      const item = e.target.closest('.channel-item');
      if (item) item.classList.remove('drag-over', 'kick-col');
    });

    listEl.addEventListener('drop', e => {
      e.preventDefault();
      const target = e.target.closest('.channel-item');
      if (!target || !dragSrc || target === dragSrc) return;
      target.classList.remove('drag-over', 'kick-col');

      // Reorder in DOM
      const items = [...listEl.querySelectorAll('.channel-item')];
      const fromIdx = items.indexOf(dragSrc);
      const toIdx   = items.indexOf(target);
      if (fromIdx < toIdx) target.after(dragSrc);
      else target.before(dragSrc);

      // Reorder in favorites storage
      const newOrder = [...listEl.querySelectorAll('.channel-item')].map(el => el.dataset.channel);
      chrome.storage.local.get(['favorites'], r => {
        let favs = r.favorites || [];
        // Extract items of this platform in new order, keep other platform untouched
        const otherPlat = favs.filter(f => {
          const p = f.platform || (f.url?.includes('kick.com') ? 'kick' : 'twitch');
          return p !== platform;
        });
        const thisPlatSorted = newOrder.map(ch =>
          favs.find(f => {
            const p = f.platform || (f.url?.includes('kick.com') ? 'kick' : 'twitch');
            return f.channel === ch && p === platform;
          })
        ).filter(Boolean);
        // Rebuild: keep relative positions between platforms as before
        const result = [];
        let ti = 0, oi = 0;
        favs.forEach(f => {
          const p = f.platform || (f.url?.includes('kick.com') ? 'kick' : 'twitch');
          if (p === platform) result.push(thisPlatSorted[ti++]);
          else result.push(otherPlat[oi++]);
        });
        chrome.storage.local.set({ favorites: result });
      });
    });
  }

  // ── Load and render both columns ─────────────────────────────────────────
  const twitchFavs = favorites.filter(f => f?.channel && getPlat(f) === 'twitch');
  const kickFavs   = favorites.filter(f => f?.channel && getPlat(f) === 'kick');

  const viewersSuffix = chrome.i18n.getMessage('viewersSuffix');

  async function loadColumn(favs, platform, listEl, countEl, loadingEl) {
    if (favs.length === 0) {
      loadingEl.remove();
      const empty = document.createElement('div');
      empty.className = 'empty-col';
      empty.textContent = '—';
      listEl.appendChild(empty);
      countEl.textContent = '';
      return;
    }

    // Fetch all in parallel
    const results = await Promise.all(
      favs.map(async fav => {
        const info = platform === 'kick'
          ? await getKickInfo(fav.channel)
          : await getTwitchInfo(fav.channel);
        return { fav, info };
      })
    );

    const online = results.filter(r => r.info.online);

    loadingEl.remove();

    if (online.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-col';
      empty.textContent = chrome.i18n.getMessage('offlineText');
      listEl.appendChild(empty);
      countEl.textContent = '';
      return;
    }

    countEl.textContent = `${online.length} ao vivo`;

    online.forEach(({ fav, info }) => {
      listEl.appendChild(renderItem(fav, info, platform));
    });

    addDragEvents(listEl, platform);
  }

  // Load both columns in parallel
  await Promise.all([
    loadColumn(twitchFavs, 'twitch', twitchList, twitchCount, twitchLoading),
    loadColumn(kickFavs,   'kick',   kickList,   kickCount,   kickLoading),
  ]);

  // ── BTC copy ──────────────────────────────────────────────────────────────
  btcBox.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText('bc1qmzde7n8xm45c03wjsf4nwjsx4p67ynugem9dr4');
      const orig = btcBox.textContent;
      btcBox.textContent = chrome.i18n.getMessage('popupDevelopedBy') ? '✓ Copiado!' : '✓ Copied!';
      setTimeout(() => { btcBox.textContent = orig; }, 1500);
    } catch {}
  });

});
