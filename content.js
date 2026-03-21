/* =========================================
   TWITCH + KICK FAVORITES + PREVIEW + DRAG
   MULTI-PLATFORM SUPPORT - FINAL 2025/2026
   - Remove offline channels from favorites bar
   - No star in customized list
   - Pre-loaded viewers
========================================= */

let favorites = [];
let kickFavorites = [];
let viewerCache = {};
let kickViewerCache = {};
let favBox = null;
let kickFavBox = null;
let templateItem = null;
let kickTemplateItem = null;
let dragChannel = null;
let dragPlatform = null;
let dataLoaded = false;

// ====================== INITIALIZATION ======================
chrome.storage.local.get(["favorites", "kickFavorites"], async (r) => {
    favorites = r.favorites || [];
    kickFavorites = r.kickFavorites || [];
    dataLoaded = true;

    // Pre-load viewers + status
    await preloadViewers();

    const tryRender = () => {
        if (document.readyState === "loading") {
            setTimeout(tryRender, 100);
            return;
        }
        setTimeout(() => {
            renderFavorites("twitch");
            renderFavorites("kick");
            updateAllStars();
        }, 900);
    };
    tryRender();
});

// Pre-load viewers from all favorited channels
async function preloadViewers() {
    const twitchPromises = favorites.map(f => getViewer(f.channel, "twitch"));
    const kickPromises = kickFavorites.map(f => getViewer(f.channel, "kick"));
    await Promise.all([...twitchPromises, ...kickPromises]);
}

// Check if the channel is actually streaming (online)
async function isChannelLive(channel, platform) {
    const viewers = await getViewer(channel, platform);

    // Conservative logic: considers online only if it has real viewers
    if (viewers === "LIVE") return false;     // decapi returns "LIVE" when offline
    if (viewers === "0" || viewers === "OFFLINE") return false;
    
    const num = parseInt(viewers, 10);
    return !isNaN(num) && num > 0;
}

function saveFav() {
    chrome.storage.local.set({ favorites, kickFavorites });
}

function formatViewer(n) {
    n = parseInt(n);
    if (isNaN(n)) return "LIVE";
    if (n < 1000) return n.toString();
    if (n < 1000000) return (n / 1000).toFixed(1).replace(".0", "") + "k";
    return (n / 1000000).toFixed(1).replace(".0", "") + "M";
}

function getList(platform) {
    return platform === "twitch" ? favorites : kickFavorites;
}

function getTemplate(platform) {
    return platform === "twitch" ? templateItem : kickTemplateItem;
}

function setTemplate(platform, value) {
    if (platform === "twitch") templateItem = value;
    else kickTemplateItem = value;
}

function getBox(platform) {
    return platform === "twitch" ? favBox : kickFavBox;
}

function setBox(platform, value) {
    if (platform === "twitch") favBox = value;
    else kickFavBox = value;
}

function updateAllStars() {
    document.querySelectorAll('span[data-star]').forEach(star => {
        const ch = star.dataset.star?.toLowerCase();
        const platform = star.dataset.platform;
        if (!ch || !platform) return;
        const list = getList(platform);
        star.innerText = list.some(f => f.channel.toLowerCase() === ch) ? "⭐" : "☆";
    });
    detect();
}

// ====================== PREVIEW ======================
const preview = document.createElement("div");
Object.assign(preview.style, {
    position: "fixed", width: "640px", height: "360px", border: "none",
    borderRadius: "14px", boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
    display: "none", pointerEvents: "none", zIndex: "999999",
    background: "#000", overflow: "hidden"
});
document.body.appendChild(preview);

let previewIframe = null;
let previewChannel = null;
let previewPlatform = null;

document.addEventListener("mouseover", e => {
    const a = e.target.closest("a");
    if (!a) return;

    const twitchMatch = a.href?.match(/twitch\.tv\/([^\/?]+)/i);
    const kickMatch = a.href?.match(/kick\.com\/([^\/?#]+)/i);
    if (!twitchMatch && !kickMatch) return;

    const ch = twitchMatch ? twitchMatch[1] : kickMatch[1];
    const platform = twitchMatch ? "twitch" : "kick";

    if (ch === previewChannel && platform === previewPlatform) return;
    previewChannel = ch;
    previewPlatform = platform;

    const rect = a.getBoundingClientRect();
    preview.innerHTML = "";

    previewIframe = document.createElement("iframe");
    Object.assign(previewIframe.style, { width: "100%", height: "100%", border: "none" });
    previewIframe.allowFullscreen = true;
    previewIframe.allow = "autoplay; fullscreen; encrypted-media";
    previewIframe.title = "Stream Preview";

    previewIframe.src = platform === "twitch"
        ? `https://player.twitch.tv/?channel=${ch}&parent=${location.hostname}&muted=true&quality=160p`
        : `https://player.kick.com/${ch}?muted=true`;

    preview.appendChild(previewIframe);

    let left = rect.right + 16;
    let top = rect.top - 40;
    if (left + 640 > window.innerWidth) left = rect.left - 656;
    if (top + 360 > window.innerHeight) top = window.innerHeight - 380;
    if (top < 20) top = 20;

    preview.style.left = left + "px";
    preview.style.top = top + "px";
    preview.style.display = "block";
});

document.addEventListener("mouseout", e => {
    if (!e.relatedTarget || !e.relatedTarget.closest("a")) {
        preview.style.display = "none";
        preview.innerHTML = "";
        previewChannel = null;
        previewPlatform = null;
    }
});

// ====================== VIEWERS ======================
async function getViewer(ch, platform = "twitch") {
    const cache = platform === "twitch" ? viewerCache : kickViewerCache;
    if (cache[ch]) return cache[ch];

    try {
        const url = platform === "twitch"
            ? `https://decapi.me/twitch/viewercount/${ch}`
            : `https://kick.com/api/v2/channels/${ch}`;
        const r = await fetch(url);
        const t = platform === "twitch"
            ? await r.text()
            : (await r.json())?.viewer_count?.toString() || "0";
        cache[ch] = t;
        return t;
    } catch {
        return "0";
    }
}

// ====================== TEMPLATE ======================
function initTemplate(platform = "twitch") {
    if ((platform === "twitch" && templateItem) || (platform === "kick" && kickTemplateItem)) return true;

    let sidebar = null;
    if (platform === "twitch") {
        sidebar = document.querySelector('[aria-label="Followed Channels"]') ||
                  document.querySelector('[class*="sidebar"]') ||
                  document.querySelector('aside');
    } else {
        sidebar = document.querySelector('aside') ||
                  document.querySelector('[class*="sidebar"]') ||
                  document.querySelector('nav');
        if (!sidebar) {
            const candidates = document.querySelectorAll('div, section, nav, aside');
            for (const el of candidates) {
                if (el.textContent.toLowerCase().includes('following') &&
                    el.querySelectorAll('a[href^="/"]').length > 3) {
                    sidebar = el;
                    break;
                }
            }
        }
    }

    if (!sidebar) return false;
    const first = sidebar.querySelector('a[href^="/"]');
    if (!first) return false;

    const template = first.cloneNode(true);
    template.querySelectorAll("span").forEach(s => {
        if (s.textContent.includes("⭐") || s.textContent.includes("✕")) s.remove();
    });

    setTemplate(platform, template);
    return true;
}

// ====================== RENDER FAVORITES (ONLY SHOWS ONLINE CHANNELS) ======================
async function renderFavorites(platform = "twitch") {
    if (!initTemplate(platform)) return;

    const list = getList(platform);
    let sidebar = null;
    let insertBefore = null;

    if (platform === "twitch") {
        sidebar = document.querySelector('[aria-label="Followed Channels"]') || document.querySelector('aside');
    } else {
        sidebar = document.querySelector('aside') || document.querySelector('[class*="sidebar"]') || document.querySelector('nav');
        if (sidebar) {
            const els = sidebar.querySelectorAll('*');
            for (const el of els) {
                const txt = el.textContent?.toLowerCase().trim();
                if (txt === 'following' || txt?.includes('following')) {
                    insertBefore = el;
                    break;
                }
            }
        }
    }

    if (!sidebar) return;

    let currentBox = getBox(platform);
    if (!currentBox) {
        currentBox = document.createElement("div");
        const label = document.createElement("div");
        label.textContent = platform === "twitch" ? "FAVORITES" : "KICK FAVORITES";
        Object.assign(label.style, { color: "white", fontWeight: "700", fontSize: "15px", padding: "12px" });
        currentBox.appendChild(label);

        if (platform === "twitch") {
            sidebar.prepend(currentBox);
        } else if (insertBefore) {
            sidebar.insertBefore(currentBox, insertBefore);
        } else {
            sidebar.prepend(currentBox);
        }
        setBox(platform, currentBox);
    }

    currentBox.querySelectorAll("[data-fav]").forEach(e => e.remove());

    // Check which channels are online (in parallel)
    const onlineChecks = await Promise.all(
        list.map(async fav => ({
            fav,
            online: await isChannelLive(fav.channel, platform)
        }))
    );

    const onlineList = onlineChecks.filter(r => r.online).map(r => r.fav);

    // If no one is online, hide the box
    if (onlineList.length === 0) {
        currentBox.style.display = "none";
        return;
    }
    currentBox.style.display = "block";

    onlineList.forEach(fav => {
        const template = getTemplate(platform);
        const item = template.cloneNode(true);
        item.dataset.fav = fav.channel;
        item.href = fav.url;
        item.draggable = true;

        item.dataset.isCustomFavorite = "true"; // no star

        // Remove any existing stars or buttons
        item.querySelectorAll("span").forEach(s => {
            if (s.textContent.includes("⭐") || s.textContent.includes("☆") || s.textContent.includes("✕") || s.dataset.star) {
                s.remove();
            }
        });

        // Guarantees that the item is a flex container
        Object.assign(item.style, {
            display: "flex",
            alignItems: "center",
            gap: "4px"
        });

        item.ondragstart = () => { dragChannel = fav.channel; dragPlatform = platform; };
        item.ondragover = e => e.preventDefault();
        item.ondrop = e => {
            e.preventDefault();
            if (dragPlatform === platform) moveFav(dragChannel, fav.channel, platform);
        };

        const name = item.querySelector('[data-a-target="side-nav-title"]') || item.querySelector('span');
        if (name) name.textContent = fav.channel;

        const img = item.querySelector("img");
        if (img) {
            Object.assign(img.style, {
                flexShrink: 0,
                width: "auto",
                height: "100%"
            });
            const p = platform === "twitch" ? "twitch" : "kick";
            img.src = `https://unavatar.io/${p}/${fav.channel}`;
            img.onerror = () => {
                const hash = fav.channel.split('').reduce((h, c) => c.charCodeAt(0) + ((h << 5) - h), 0);
                const colors = ['#6441a5','#e91e63','#2196f3','#4caf50','#ff9800','#f44336','#9c27b0','#00bcd4'];
                const color = colors[Math.abs(hash) % colors.length];
                const initial = fav.channel[0]?.toUpperCase() || '?';
                img.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'%3E%3Crect fill='${encodeURIComponent(color)}' width='128' height='128'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='64' fill='white' font-family='Arial' font-weight='bold'%3E${initial}%3C/text%3E%3C/svg%3E`;
            };
        }

        const live = item.querySelector('[data-a-target="side-nav-live-status"]');
        if (live) {
            const viewers = (platform === "twitch" ? viewerCache : kickViewerCache)[fav.channel] || "LIVE";
            live.textContent = formatViewer(viewers);
            Object.assign(live.style, {
                color: "white",
                marginLeft: "auto",
                marginRight: "4px",
                whiteSpace: "nowrap",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                minHeight: "28px"
            });
            const dot = document.createElement("span");
            Object.assign(dot.style, {width:"6px", height:"6px", background:"red", borderRadius:"50%", display:"inline-block", marginRight:"6px"});
            live.prepend(dot);
        }

        const remove = document.createElement("span");
        remove.textContent = "✕";
        Object.assign(remove.style, {
            padding:"6px 12px", borderRadius:"8px",
            border:"1px solid rgba(255,59,48,0.3)", fontSize:"14px", fontWeight:"600",
            background:"linear-gradient(135deg, rgba(255,59,48,0.08), rgba(255,87,34,0.06))",
            cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
            width:"28px", height:"28px", color:"rgba(255,59,48,0.6)", flexShrink: 0
        });

        remove.onmouseenter = () => Object.assign(remove.style, {
            background:"linear-gradient(135deg, rgba(255,59,48,0.25), rgba(255,87,34,0.2))",
            borderColor:"rgba(255,59,48,0.8)", color:"rgba(255,59,48,0.95)", transform:"scale(1.1)"
        });

        remove.onmouseleave = () => Object.assign(remove.style, {
            background:"linear-gradient(135deg, rgba(255,59,48,0.08), rgba(255,87,34,0.06))",
            borderColor:"rgba(255,59,48,0.3)", color:"rgba(255,59,48,0.6)", transform:"scale(1)"
        });

        remove.onclick = e => {
            e.preventDefault(); e.stopPropagation();
            remove.style.transform = "scale(0.85)"; remove.style.opacity = "0";
            setTimeout(() => {
                if (platform === "twitch") favorites = favorites.filter(f => f.channel !== fav.channel);
                else kickFavorites = kickFavorites.filter(f => f.channel !== fav.channel);
                saveFav();
                updateAllStars();
                renderFavorites(platform);
                setTimeout(updateAllStars, 300);
            }, 150);
        };

        item.appendChild(remove);
        currentBox.appendChild(item);
    });

    setTimeout(updateAllStars, 100);
}

function moveFav(drag, to, platform = "twitch") {
    const list = getList(platform);
    const fromIndex = list.findIndex(f => f.channel === drag);
    const toIndex = list.findIndex(f => f.channel === to);
    if (fromIndex < 0 || toIndex < 0) return;
    const item = list.splice(fromIndex, 1)[0];
    list.splice(toIndex, 0, item);
    saveFav();
    renderFavorites(platform);
    updateAllStars();
}

// ====================== STARS ======================
function attachStar(a) {
    if (a.dataset.starReady || a.dataset.isCustomFavorite === "true") return;

    try {
        const url = new URL(a.href);
        const isTwitch = url.hostname.includes("twitch.tv") || url.hostname.includes("twitch");
        const isKick = url.hostname.includes("kick.com") || url.hostname.includes("kick");
        if (!isTwitch && !isKick) return;

        const platform = isTwitch ? "twitch" : "kick";
        const ch = url.pathname.split("/").filter(p => p)[0]?.toLowerCase();
        if (!ch) return;

        a.dataset.starReady = "1";

        const star = document.createElement("span");
        star.dataset.star = ch;
        star.dataset.platform = platform;
        star.dataset.starReady = "1";
        star.textContent = getList(platform).some(f => f.channel.toLowerCase() === ch) ? "⭐" : "☆";
        Object.assign(star.style, { marginLeft: "8px", cursor: "pointer", fontSize: "14px", alignSelf: "flex-start" });

        star.onclick = e => {
            e.preventDefault(); e.stopPropagation();
            const list = getList(platform);
            const exists = list.some(f => f.channel.toLowerCase() === ch);

            if (exists) {
                if (platform === "twitch") favorites = favorites.filter(f => f.channel.toLowerCase() !== ch);
                else kickFavorites = kickFavorites.filter(f => f.channel.toLowerCase() !== ch);
            } else {
                list.unshift({ channel: ch, url: a.href });
            }
            saveFav();
            updateAllStars();
            renderFavorites(platform);
            renderFavorites(platform === "twitch" ? "kick" : "twitch");
            setTimeout(updateAllStars, 300);
        };

        star.onmouseenter = () => Object.assign(star.style, { transform: "scale(1.2)", filter: "brightness(1.3)" });
        star.onmouseleave = () => Object.assign(star.style, { transform: "scale(1)", filter: "brightness(1)" });

        a.appendChild(star);
    } catch {}
}

function attachStarToChannelPage() {
    // Add star on channel page
    try {
        // Search for element with data-a-target="stream-info-card" or similar
        const channelHeader = document.querySelector('[data-a-target="stream-info-card"]') || 
                             document.querySelector('[class*="channel"]') ||
                             document.querySelector('h1');
        if (!channelHeader) return;

        // Check if already added
        if (document.querySelector("[data-channel-star]")) return;

        const star = document.createElement("span");
        star.dataset.channelStar = "true";
        star.textContent = "☆";
        star.style.fontSize = "20px";
        star.style.cursor = "pointer";
        star.style.marginLeft = "12px";

        // Initialize star listeners
        detect();
    } catch {}
}

function detect() {
    document.querySelectorAll("a").forEach(a => {
        if (a.dataset.liveReady) return;
        if (a.href && a.offsetHeight > 20 && (a.href.includes("twitch.tv") || a.href.includes("kick.com"))) {
            a.dataset.liveReady = "1";
            attachStar(a);
        }
    });
}

// ====================== INTERVALS ======================
setInterval(() => {
    detect();
    if (dataLoaded) {
        renderFavorites("twitch");
        renderFavorites("kick");
        updateAllStars();
    }
    attachStarToChannelPage();
}, 1500);

document.addEventListener("DOMContentLoaded", attachStarToChannelPage);
window.addEventListener("load", attachStarToChannelPage);

let lastUrl = location.href;
setInterval(() => {
    if (location.href !== lastUrl) {
        lastUrl = location.href;
        const old = document.querySelector("[data-channel-star]");
        if (old) old.parentElement?.removeChild(old);
        setTimeout(attachStarToChannelPage, 500);
    }
}, 1000);