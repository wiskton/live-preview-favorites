/* =========================================
   TWITCH FAVORITES — ONLY TWITCH
   - Sidebar de favoritos acima dos Followed Channels
   - Preview com thumbnail da live
   - Botão favoritar na tela do streamer
   - Categoria real por canal (sem piscar)
   
   FIXES:
   - Bug duplicação da barra corrigido (busca por data-attr no DOM sempre)
   - Bug sidebar direita corrigido (selector mais específico + fallback seguro)
   - Atualização a cada 5 minutos (antes 30s só invalidava viewers)
========================================= */

let favorites   = [];
let viewerCache = {};
let gameCacheTwitch = {};
let titleCache  = {};
let dragChannel  = null;
let dataLoaded   = false;
let renderBusy   = false;
let favCollapsed = false; // estado do toggle expandir/recolher

// ====================== INIT ======================
chrome.storage.local.get(["favorites", "favCollapsed"], async (r) => {
    favorites    = r.favorites || [];
    favCollapsed = r.favCollapsed || false;
    dataLoaded   = true;
    await preloadAll();
    waitAndRender();
});

watchNativeSidebarToggle();

async function preloadAll() {
    await Promise.all([
        ...favorites.map(f => getViewer(f.channel)),
        ...favorites.map(f => getGame(f.channel)),
        ...favorites.map(f => getTitle(f.channel)),
    ]);
}

function waitAndRender() {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => setTimeout(renderFavorites, 1200));
    } else {
        setTimeout(renderFavorites, 1200);
    }
}

function saveFav() {
    chrome.storage.local.set({ favorites });
}

function formatViewers(n) {
    n = parseInt(n);
    if (isNaN(n) || n <= 0) return "LIVE";
    if (n < 1000)    return n.toString();
    if (n < 1000000) return (n / 1000).toFixed(1).replace(".0","") + "k";
    return (n / 1000000).toFixed(1).replace(".0","") + "M";
}

// ====================== API ======================
async function getViewer(ch) {
    if (viewerCache[ch] !== undefined) return viewerCache[ch];
    try {
        const r = await fetch(`https://decapi.me/twitch/viewercount/${ch}`);
        const t = (await r.text()).trim();
        viewerCache[ch] = t;
        return t;
    } catch { return "0"; }
}

async function getGame(ch) {
    if (gameCacheTwitch[ch]) return gameCacheTwitch[ch];
    try {
        const r = await fetch(`https://decapi.me/twitch/game/${ch}`);
        const t = (await r.text()).trim();
        if (t && !t.toLowerCase().includes("error")) {
            gameCacheTwitch[ch] = t;
            return t;
        }
    } catch {}
    return "";
}

async function getTitle(ch) {
    if (titleCache[ch] !== undefined) return titleCache[ch];
    try {
        const r = await fetch(`https://decapi.me/twitch/title/${ch}`);
        const t = (await r.text()).trim();
        titleCache[ch] = (!t || t.toLowerCase().includes("error")) ? "" : t;
        return titleCache[ch];
    } catch { return ""; }
}

function isRerun(ch) {
    const title = (titleCache[ch] || "").toUpperCase();
    return title.includes("RERUN");
}

async function isLive(ch) {
    const v = await getViewer(ch);
    if (v === "LIVE" || v === "0" || v === "OFFLINE") return false;
    const n = parseInt(v, 10);
    return !isNaN(n) && n > 0;
}

// ====================== HELPERS SVG ======================
function svgAvatar(ch, sz) {
    const h = ch.split("").reduce((a,c) => c.charCodeAt(0)+((a<<5)-a), 0);
    const cols = ["#6441a5","#e91e63","#2196f3","#4caf50","#ff9800","#f44336","#9c27b0","#00bcd4"];
    const c = cols[Math.abs(h) % cols.length];
    const i = (ch[0]||"?").toUpperCase();
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${sz} ${sz}'%3E%3Crect fill='${encodeURIComponent(c)}' width='${sz}' height='${sz}'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='${Math.floor(sz/2)}' fill='white' font-family='Arial' font-weight='bold'%3E${i}%3C/text%3E%3C/svg%3E`;
}
function svgThumb(ch) {
    const h = ch.split("").reduce((a,c) => c.charCodeAt(0)+((a<<5)-a), 0);
    const cols = ["#6441a5","#e91e63","#2196f3","#4caf50","#ff9800","#f44336","#9c27b0","#00bcd4"];
    const c = cols[Math.abs(h) % cols.length];
    const i = (ch[0]||"?").toUpperCase();
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 360'%3E%3Crect fill='${encodeURIComponent(c)}' width='640' height='360'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='120' fill='white' font-family='Arial' font-weight='bold' opacity='0.5'%3E${i}%3C/text%3E%3C/svg%3E`;
}
function getTwitchThumb(ch) {
    const ts = Math.floor(Date.now() / 30000);
    return `https://static-cdn.jtvnw.net/previews-ttv/live_user_${ch.toLowerCase()}-640x360.jpg?t=${ts}`;
}

// ====================== PREVIEW ======================
const preview = document.createElement("div");
Object.assign(preview.style, {
    position:"fixed", width:"640px", height:"auto", border:"none",
    borderRadius:"14px", boxShadow:"0 10px 30px rgba(0,0,0,0.75)",
    display:"none", pointerEvents:"none", zIndex:"999999",
    background:"#0e0e10", overflow:"hidden", flexDirection:"column"
});
document.body.appendChild(preview);

const previewImg = document.createElement("img");
Object.assign(previewImg.style, {
    width:"640px", height:"360px", objectFit:"cover",
    display:"block", borderRadius:"14px 14px 0 0", transition:"opacity 0.2s"
});
preview.appendChild(previewImg);

const previewInfo = document.createElement("div");
Object.assign(previewInfo.style, {
    display:"flex", alignItems:"center", gap:"10px",
    padding:"10px 14px", background:"rgba(18,18,24,0.98)",
    borderRadius:"0 0 14px 14px"
});
preview.appendChild(previewInfo);

const previewAvatar = document.createElement("img");
Object.assign(previewAvatar.style, {
    width:"36px", height:"36px", borderRadius:"50%",
    objectFit:"cover", flexShrink:"0",
    border:"2px solid rgba(255,255,255,0.15)"
});
previewInfo.appendChild(previewAvatar);

const previewText = document.createElement("div");
Object.assign(previewText.style, { display:"flex", flexDirection:"column", minWidth:"0", flex:"1" });
previewInfo.appendChild(previewText);

const previewName = document.createElement("span");
Object.assign(previewName.style, {
    color:"#fff", fontWeight:"700", fontSize:"14px",
    whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"
});
previewText.appendChild(previewName);

const previewSub = document.createElement("span");
Object.assign(previewSub.style, { color:"#adadb8", fontSize:"12px", marginTop:"2px" });
previewText.appendChild(previewSub);

const previewBadge = document.createElement("span");
Object.assign(previewBadge.style, {
    marginLeft:"auto", background:"#eb0400", color:"#fff",
    fontSize:"11px", fontWeight:"700", padding:"3px 8px",
    borderRadius:"6px", letterSpacing:"0.5px", flexShrink:"0"
});
previewBadge.textContent = "🔴 LIVE";
previewInfo.appendChild(previewBadge);

let previewCh = null, previewHide = null;

document.addEventListener("mouseover", e => {
    const a = e.target.closest("a");
    if (!a) return;

    // Restringe o preview para a sidebar nativa (container, seguidos, recomendados) e nosso box de favoritos.
    const isSidebarLink = a.closest('[data-a-target="side-nav-container"]') || 
                          a.closest('[data-favorites-box="twitch"]') ||
                          a.closest('[data-test-selector="followed-channel"]') ||
                          a.closest('[data-test-selector="recommended-channel"]');

    if (!isSidebarLink) return;

    const m = a.href?.match(/twitch\.tv\/([^\/?#]+)/i);
    if (!m) return;

    // Garante que é um link de canal e não de uma página de sistema (como busca ou categorias)
    const reserved = ["directory", "videos", "clips", "search", "settings", "u", "moderator", "about", "schedule", "squad"];
    if (reserved.includes(m[1].toLowerCase())) return;

    const ch = m[1].toLowerCase();
    if (ch === previewCh) return;
    previewCh = ch;
    clearTimeout(previewHide);

    previewName.textContent = ch;
    previewAvatar.src = `https://unavatar.io/twitch/${ch}`;
    previewAvatar.onerror = () => { previewAvatar.src = svgAvatar(ch, 36); };

    const v = viewerCache[ch];
    previewSub.textContent = (v && !isNaN(parseInt(v))) ? `${formatViewers(v)} viewers` : "...";
    if (!v) getViewer(ch).then(vv => {
        if (previewCh === ch) previewSub.textContent = !isNaN(parseInt(vv)) ? `${formatViewers(vv)} viewers` : "LIVE";
    });

    previewImg.style.opacity = "0.4";
    previewImg.onerror = () => { previewImg.src = svgThumb(ch); previewImg.style.opacity = "1"; };
    previewImg.onload  = () => { previewImg.style.opacity = "1"; };
    previewImg.src = getTwitchThumb(ch);

    const rect = a.getBoundingClientRect();
    let left = rect.right + 16, top = rect.top - 40;
    if (left + 640 > window.innerWidth)  left = rect.left - 656;
    if (top  + 420 > window.innerHeight) top  = window.innerHeight - 440;
    if (top < 20) top = 20;
    preview.style.left = left + "px";
    preview.style.top  = top  + "px";
    preview.style.display = "flex";
});

document.addEventListener("mouseout", e => {
    if (!e.relatedTarget || !e.relatedTarget.closest("a")) {
        previewHide = setTimeout(() => { preview.style.display = "none"; previewCh = null; }, 120);
    }
});

// ====================== ENCONTRAR SIDEBAR ESQUERDA ======================
// FIX: Evita pegar a sidebar direita (chat, raid, etc.)
// A sidebar esquerda do Twitch tem aria-label="Followed Channels" ou
// é o primeiro <nav> / primeiro <aside> à esquerda da tela (x < 200px)
function getLeftSidebar() {
    // Tentativa 1: nav com aria-label específico
    const followedNav = document.querySelector('[aria-label="Followed Channels"]');
    if (followedNav) {
        // Sobe até o container scrollável da sidebar esquerda
        return followedNav.closest("nav") || followedNav.closest("aside") || followedNav.parentElement;
    }

    // Tentativa 2: nav que contém "Followed Channels" por texto
    const allNavs = document.querySelectorAll("nav");
    for (const nav of allNavs) {
        if (nav.textContent.includes("Followed Channels") || nav.textContent.includes("Canais seguidos")) {
            return nav;
        }
    }

    // Tentativa 3: aside/nav posicionado na esquerda da tela (x < 300px)
    const candidates = [...document.querySelectorAll("aside, nav")];
    for (const el of candidates) {
        const rect = el.getBoundingClientRect();
        if (rect.left < 300 && rect.width > 50 && rect.width < 400 && rect.height > 300) {
            return el;
        }
    }

    return null;
}

// ====================== OBTER OU CRIAR favBox (sem duplicar) ======================
function getOrCreateFavBox(sidebar) {
    const all = document.querySelectorAll("[data-favorites-box='twitch']");
    if (all.length > 1) {
        for (let i = 1; i < all.length; i++) all[i].remove();
    }
    if (all.length === 1 && sidebar.contains(all[0])) {
        return all[0];
    }
    if (all.length === 1) all[0].remove();

    const box = document.createElement("div");
    box.dataset.favoritesBox = "twitch";

    const header = document.createElement("div");
    header.dataset.favHeader = "true";
    Object.assign(header.style, { padding:"16px 16px 8px" });

    const headerLabel = document.createElement("span");
    headerLabel.textContent = "FAVORITES";
    Object.assign(headerLabel.style, {
        color:"#bf94ff", fontWeight:"700", fontSize:"11px",
        letterSpacing:"1.5px", textTransform:"uppercase"
    });

    header.appendChild(headerLabel);
    box.appendChild(header);
    sidebar.prepend(box);
    return box;
}

// ====================== DETECTAR BOTÃO NATIVO DO TWITCH ======================
function watchNativeSidebarToggle() {
    const COLLAPSE_LABELS = ["recolher", "collapse", "fechar", "close nav", "hide"];
    const EXPAND_LABELS   = ["expandir", "expand",   "abrir",  "open nav",  "show"];

    document.addEventListener("click", e => {
        const btn = e.target.closest("button");
        if (!btn) return;
        const label = (btn.getAttribute("aria-label") || btn.title || "").toLowerCase().trim();

        const isCollapse = COLLAPSE_LABELS.some(l => label.includes(l));
        const isExpand   = EXPAND_LABELS.some(l => label.includes(l));
        if (!isCollapse && !isExpand) return;

        // Aguarda animação do Twitch terminar para medir a largura real
        setTimeout(() => {
            const box = document.querySelector("[data-favorites-box='twitch']");
            if (!box) return;
            const sidebar = box.closest("nav, aside");
            const collapsed = sidebar ? sidebar.getBoundingClientRect().width < 100 : isCollapse;
            if (favCollapsed !== collapsed) {
                favCollapsed = collapsed;
                chrome.storage.local.set({ favCollapsed });
                applyCollapsedMode(box);
            }
        }, 350);
    }, true);
}

// ====================== COLLAPSED MODE ======================
function applyCollapsedMode(box) {
    const header = box.querySelector("[data-fav-header]") || box.firstElementChild;

    if (favCollapsed) {
        if (header) header.style.display = "none";

        box.querySelectorAll("[data-fav]").forEach(item => {
            item.draggable = false;
            item.style.padding        = "3px 4px";
            item.style.justifyContent = "center";
            item.style.cursor         = "pointer";
            item.style.minHeight      = "36px";

            item.querySelectorAll("[data-handle]").forEach(el  => { el.style.display = "none"; });
            item.querySelectorAll("[data-info]").forEach(el    => { el.style.display = "none"; });
            item.querySelectorAll("[data-livewrap]").forEach(el => { el.style.display = "none"; });
            item.querySelectorAll("[data-rm]").forEach(el      => { el.style.display = "none"; });

            const img = item.querySelector("img");
            if (img) img.style.margin = "0";
        });

    } else {
        if (header) header.style.display = "";

        box.querySelectorAll("[data-fav]").forEach(item => {
            item.draggable = true;
            item.style.padding        = "5px 8px 5px 4px";
            item.style.justifyContent = "";
            item.style.cursor         = "grab";
            item.style.minHeight      = "42px";

            // Restaura display correto de cada elemento (inline, flex, etc.)
            item.querySelectorAll("[data-handle]").forEach(el   => { el.style.display = ""; });        // inline (span)
            item.querySelectorAll("[data-info]").forEach(el     => { el.style.display = "flex"; });    // flex (div)
            item.querySelectorAll("[data-livewrap]").forEach(el => { el.style.display = "flex"; });    // flex (div)
            item.querySelectorAll("[data-rm]").forEach(el       => { el.style.display = "flex"; });    // flex (span)

            const img = item.querySelector("img");
            if (img) img.style.margin = "0 10px 0 0";
        });
    }
}

// ====================== RENDER SIDEBAR ======================
async function renderFavorites() {
    if (renderBusy) return;
    renderBusy = true;
    try { await _render(); } finally { renderBusy = false; }
}

async function _render() {
    // FIX: Aguarda a sidebar esquerda aparecer — com timeout máximo de 8s
    const sidebar = await waitForSidebar(8000);
    if (!sidebar) return;

    const favBox = getOrCreateFavBox(sidebar);

    // Remover itens antigos (preservar header)
    favBox.querySelectorAll("[data-fav]").forEach(el => el.remove());

    // Checar quem está online (invalida viewers para re-fetch)
    const checks = await Promise.all(favorites.map(async fav => ({
        fav,
        online: await isLive(fav.channel)
    })));
    const onlineList = checks.filter(c => c.online).map(c => c.fav);

    if (onlineList.length === 0) { favBox.style.display = "none"; return; }
    favBox.style.display = "block";

    // Buscar categorias e títulos em paralelo antes de renderizar (evita piscar)
    const games = {};
    const titles = {};
    await Promise.all(onlineList.map(async fav => {
        games[fav.channel]  = await getGame(fav.channel);
        titles[fav.channel] = await getTitle(fav.channel);
    }));

    onlineList.forEach(fav => {
        const v     = viewerCache[fav.channel] || "";
        const game  = games[fav.channel] || "";
        const rerun = (titles[fav.channel] || "").toUpperCase().includes("RERUN");

        const item = document.createElement("a");
        item.dataset.fav = fav.channel;
        item.href = `https://www.twitch.tv/${fav.channel}`;
        item.draggable = true;
        item.dataset.isCustomFavorite = "true";
        Object.assign(item.style, {
            display:"flex", alignItems:"center",
            padding:"5px 8px 5px 4px", textDecoration:"none",
            borderRadius:"6px", cursor:"grab",
            transition:"background 0.15s, box-shadow 0.15s, transform 0.15s",
            gap:"0", minHeight:"42px", boxSizing:"border-box",
            width:"100%", position:"relative",
            userSelect:"none"
        });

        item.onmouseenter = () => {
            item.style.background  = "rgba(255,255,255,0.07)";
            handle.style.opacity   = "1";
        };
        item.onmouseleave = () => {
            item.style.background  = "transparent";
            handle.style.opacity   = "0";
        };

        item.ondragstart = e => {
            dragChannel = fav.channel;
            item.style.opacity   = "0.45";
            item.style.transform = "scale(0.97)";
            item.style.cursor    = "grabbing";
            e.dataTransfer.effectAllowed = "move";
        };
        item.ondragend = () => {
            item.style.opacity   = "1";
            item.style.transform = "scale(1)";
            item.style.cursor    = "grab";
            favBox.querySelectorAll("[data-fav]").forEach(el => {
                el.style.boxShadow = "none";
                el.style.background = "transparent";
            });
        };
        item.ondragover = e => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            if (dragChannel !== fav.channel) {
                item.style.boxShadow = "inset 0 2px 0 0 #9147ff";
                item.style.background = "rgba(145,71,255,0.10)";
            }
        };
        item.ondragleave = () => {
            item.style.boxShadow = "none";
            item.style.background = "transparent";
        };
        item.ondrop = e => {
            e.preventDefault();
            item.style.boxShadow = "none";
            item.style.background = "transparent";
            if (dragChannel !== fav.channel) moveFav(dragChannel, fav.channel);
        };

        const handle = document.createElement("span");
        handle.dataset.handle = "true";
        handle.textContent = "⠿";
        handle.title = "Arrastar para reordenar";
        Object.assign(handle.style, {
            fontSize:"14px", color:"rgba(255,255,255,0.3)",
            flexShrink:"0", width:"14px", textAlign:"center",
            opacity:"0", transition:"opacity 0.15s",
            marginRight:"6px", cursor:"grab", lineHeight:"1"
        });
        item.appendChild(handle);

        const img = document.createElement("img");
        img.src = `https://unavatar.io/twitch/${fav.channel}`;
        img.onerror = () => { img.src = svgAvatar(fav.channel, 30); };
        Object.assign(img.style, {
            width:"30px", height:"30px", borderRadius:"50%",
            objectFit:"cover", flexShrink:"0", marginRight:"10px"
        });
        item.appendChild(img);

        const info = document.createElement("div");
        info.dataset.info = "true";
        Object.assign(info.style, {
            display:"flex", flexDirection:"column", justifyContent:"center",
            flex:"1", minWidth:"0", overflow:"hidden"
        });

        const nameDiv = document.createElement("div");
        nameDiv.textContent = fav.channel;
        Object.assign(nameDiv.style, {
            color: rerun ? "#ff4444" : "#efeff1",
            fontSize:"13px", fontWeight:"600",
            whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
            lineHeight:"1.3"
        });
        if (rerun) {
            nameDiv.title = "Reprise (RERUN)";
            const badge = document.createElement("span");
            badge.textContent = " RERUN";
            Object.assign(badge.style, {
                fontSize:"9px", fontWeight:"700", color:"#ff4444",
                background:"rgba(255,68,68,0.15)", borderRadius:"3px",
                padding:"1px 4px", marginLeft:"4px",
                verticalAlign:"middle", letterSpacing:"0.5px",
                border:"1px solid rgba(255,68,68,0.3)"
            });
            nameDiv.appendChild(badge);
        }
        info.appendChild(nameDiv);

        if (game) {
            const gameDiv = document.createElement("div");
            gameDiv.textContent = game;
            Object.assign(gameDiv.style, {
                color:"#adadb8", fontSize:"12px", fontWeight:"400",
                whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
                lineHeight:"1.3"
            });
            info.appendChild(gameDiv);
        }

        item.appendChild(info);

        const liveWrap = document.createElement("div");
        liveWrap.dataset.livewrap = "true";
        Object.assign(liveWrap.style, {
            display:"flex", alignItems:"center", gap:"4px",
            flexShrink:"0", marginLeft:"6px"
        });

        const dot = document.createElement("span");
        Object.assign(dot.style, {
            width:"6px", height:"6px", background:"#ff0000",
            borderRadius:"50%", display:"inline-block", flexShrink:"0"
        });

        const viewersSpan = document.createElement("span");
        viewersSpan.textContent = formatViewers(v);
        Object.assign(viewersSpan.style, {
            color:"#adadb8", fontSize:"12px", whiteSpace:"nowrap"
        });

        liveWrap.appendChild(dot);
        liveWrap.appendChild(viewersSpan);
        item.appendChild(liveWrap);

        const rm = document.createElement("span");
        rm.dataset.rm = "true";
        rm.textContent = "✕";
        Object.assign(rm.style, {
            borderRadius:"4px", fontSize:"11px", fontWeight:"700",
            border:"1px solid rgba(255,59,48,0.3)", cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
            width:"20px", height:"20px", minWidth:"20px",
            color:"rgba(255,59,48,0.55)", flexShrink:"0",
            background:"transparent", transition:"all 0.15s",
            marginLeft:"6px"
        });
        rm.onmouseenter = () => Object.assign(rm.style, {
            background:"rgba(255,59,48,0.2)", borderColor:"rgba(255,59,48,0.9)",
            color:"#ff3b30", transform:"scale(1.1)"
        });
        rm.onmouseleave = () => Object.assign(rm.style, {
            background:"transparent", borderColor:"rgba(255,59,48,0.3)",
            color:"rgba(255,59,48,0.55)", transform:"scale(1)"
        });
        rm.onclick = e => {
            e.preventDefault(); e.stopPropagation();
            item.style.opacity = "0";
            item.style.transition = "opacity 0.15s";
            setTimeout(() => {
                favorites = favorites.filter(f => f.channel !== fav.channel);
                saveFav();
                renderFavorites();
            }, 150);
        };
        item.appendChild(rm);

        favBox.appendChild(item);
    });

    // Aplica o modo correto (expandido/recolhido) após renderizar
    applyCollapsedMode(favBox);
}

// FIX: Espera a sidebar esquerda aparecer no DOM (SPAs carregam async)
function waitForSidebar(timeout = 8000) {
    return new Promise(resolve => {
        const found = getLeftSidebar();
        if (found) { resolve(found); return; }

        const deadline = Date.now() + timeout;
        const obs = new MutationObserver(() => {
            const s = getLeftSidebar();
            if (s) { obs.disconnect(); resolve(s); return; }
            if (Date.now() > deadline) { obs.disconnect(); resolve(null); }
        });
        obs.observe(document.body, { childList: true, subtree: true });
        // Timeout de segurança
        setTimeout(() => { obs.disconnect(); resolve(getLeftSidebar()); }, timeout);
    });
}

function moveFav(from, to) {
    const fi = favorites.findIndex(f => f.channel === from);
    const ti = favorites.findIndex(f => f.channel === to);
    if (fi < 0 || ti < 0) return;
    const [item] = favorites.splice(fi, 1);
    favorites.splice(ti, 0, item);
    saveFav();
    renderFavorites();
}

// ====================== BOTÃO FAVORITAR NA LIVE ======================
function attachFavButton() {
    try {
        if (!location.href.includes("twitch.tv")) return;
        if (document.querySelector("[data-channel-fav-btn]")) return;

        const ch = location.pathname.split("/").filter(p => p &&
            !["videos","clips","about","schedule","squad","moderator","u","directory","search"].includes(p.toLowerCase())
        )[0]?.toLowerCase();
        if (!ch) return;

        const allBtns = [
            ...document.querySelectorAll('[data-a-target="unfollow-button"]'),
            ...document.querySelectorAll('[data-a-target="follow-button"]'),
            ...document.querySelectorAll('button[data-a-target*="follow"]'),
        ];
        const anchor = allBtns.find(b =>
            b.closest('[class*="channel-header"]') ||
            b.closest('[class*="ChannelHeader"]')  ||
            b.closest('[class*="channel-info"]')   ||
            b.closest('[class*="StreamInfo"]')     ||
            b.closest('[class*="action-bar"]')     ||
            b.closest('[class*="bottom-bar"]')
        ) || allBtns[0];
        if (!anchor) return;

        const sz = anchor.offsetHeight || 36;
        const btn = document.createElement("button");
        btn.dataset.channelFavBtn = "true";

        const icon  = document.createElement("span");
        icon.style.cssText = "font-size:16px; line-height:0; display:flex; align-items:center;";
        const label = document.createElement("span");
        btn.appendChild(icon);
        btn.appendChild(label);

        const applyStyle = (fav) => {
            Object.assign(btn.style, {
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                height: "32px",
                width: "52px",
                padding: "0",
                border: "none",
                borderRadius: "20px",
                background: fav ? "rgba(255, 255, 255, 0.15)" : "#9147ff",
                color: "#fff",
                cursor: "pointer", flexShrink: "0",
                marginRight: "10px", 
                outline:"none", whiteSpace:"nowrap",
                transition: "background-color 200ms ease, transform 100ms ease",
                fontFamily: "Inter, Roobert, 'Helvetica Neue', Helvetica, Arial, sans-serif"
            });
            icon.innerHTML = fav
                ? `<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2l2.5 6.5H19l-5 4 2 7.5-6-4.5-6 4.5 2-7.5-5-4h6.5L10 2z"/></svg>`
                : `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 2l2.5 6.5H19l-5 4 2 7.5-6-4.5-6 4.5 2-7.5-5-4h6.5L10 2z"/></svg>`;
            label.style.display = "none";
            label.textContent = fav ? "Favorito" : "Favoritar";
            btn.title         = fav ? "Remover dos favoritos" : "Adicionar aos favoritos";
        };

        applyStyle(favorites.some(f => f.channel.toLowerCase() === ch));

        btn.onmouseenter = () => {
            btn.style.transform = "scale(1.04)";
            const isFav = favorites.some(f=>f.channel.toLowerCase()===ch);
            btn.style.background = isFav ? "rgba(255, 255, 255, 0.25)" : "#772ce8";
        };
        btn.onmouseleave = () => {
            btn.style.transform = "scale(1)";
            const isFav = favorites.some(f=>f.channel.toLowerCase()===ch);
            btn.style.background = isFav ? "rgba(255, 255, 255, 0.15)" : "#9147ff";
        };

        btn.onclick = e => {
            e.preventDefault(); e.stopPropagation();
            const on = favorites.some(f=>f.channel.toLowerCase()===ch);
            if (on) { favorites = favorites.filter(f=>f.channel.toLowerCase()!==ch); }
            else    { favorites.unshift({ channel:ch, url:`https://www.twitch.tv/${ch}` }); }
            saveFav(); renderFavorites();
            applyStyle(!on);
            btn.style.transform = "scale(0.92)";
            setTimeout(()=>{ btn.style.transform="scale(1)"; }, 150);
        };

        // Cria um wrapper seguindo o sistema de design (ScCore) da Twitch
        const wrapper = document.createElement("div");
        wrapper.className = "Layout-sc-1xcs6mc-0 gWaIYG";
        wrapper.appendChild(btn);

        // Localiza o container do botão de seguir para inserir o nosso wrapper antes dele
        const target = anchor.closest('.Layout-sc-1xcs6mc-0') || anchor;
        target.insertAdjacentElement("beforebegin", wrapper);
    } catch {}
}

// ====================== INTERVALS ======================

// FIX: Atualização completa a cada 5 minutos
// Invalida TODOS os caches (viewers + games) para refletir lives que encerraram
setInterval(() => {
    if (!dataLoaded) return;
    viewerCache     = {};  // força re-fetch de viewers
    gameCacheTwitch = {}; // força re-fetch de categorias (podem ter mudado)
    titleCache      = {}; // força re-fetch de títulos (rerun pode ter mudado)
    renderFavorites();
}, 5 * 60 * 1000); // 5 minutos

// Attach do botão a cada 2s (só quando ainda não existe)
setInterval(() => { attachFavButton(); }, 2000);

// Navegação SPA — re-renderiza após mudança de URL
let lastUrl = location.href;
setInterval(() => {
    if (location.href === lastUrl) return;
    lastUrl = location.href;

    // Remove botão da live anterior
    document.querySelector("[data-channel-fav-btn]")?.remove();

    // FIX: Remove o favBox existente do DOM para forçar recriação
    // na sidebar correta da nova página (não apenas nullifica a variável)
    document.querySelectorAll("[data-favorites-box='twitch']").forEach(el => el.remove());

    setTimeout(() => {
        if (dataLoaded) renderFavorites();
        attachFavButton();
    }, 1200); // aguarda SPA carregar a nova sidebar
}, 500);