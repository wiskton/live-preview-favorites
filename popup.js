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
    item.href   = href;
    item.target = '_blank';
    item.rel    = 'noopener noreferrer';
    item.className = 'channel-item';

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
    nameDiv.className = 'channel-name';
    nameDiv.textContent = fav.channel;
    infoDiv.appendChild(nameDiv);

    if (info.game) {
      const metaDiv = document.createElement('div');
      metaDiv.className = 'channel-meta';
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
    vSpan.className = 'viewers-text';
    vSpan.textContent = formatViewers(info.viewers);
    item.appendChild(vSpan);

    return item;
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
