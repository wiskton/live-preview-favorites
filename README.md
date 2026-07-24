# <img src="icons/icon128.png" align="center" width="40"> Live Preview + Favorites

[![Version](https://img.shields.io/badge/version-4.2-blueviolet.svg)](#)
[![Manifest](https://img.shields.io/badge/manifest-v3-green.svg)](#)
[![Platforms](https://img.shields.io/badge/platforms-Twitch%20%7C%20Kick-black.svg)](#)
[![Languages](https://img.shields.io/badge/languages-7-informational.svg)](#)

A powerful extension for Chromium browsers that combines the best of **Twitch** and **Kick**. Favorite your streamers and visualize what's happening on live streams just by hovering your mouse, without switching tabs.

---

## 📸 Logo Preview
<p align="center">
  <img src="icons/icon128.png" width="300" alt="Twitch & Kick Hybrid Logo">
</p>

---

## ✨ Features

* **⚡ Live Hover Preview:** Hover over a streamer's link to see a real-time preview of the broadcast.
* **⭐ Favorites System:** Save your favorite channels for quick access within the popup.
* **🔄 Dual Platform:** Native integration with Twitch and Kick APIs simultaneously.
*   **🎨 Minimalist UI:** A clean, non-intrusive design that blends perfectly with the platform's original look.
*   **🌍 Multi-language:** Automatically matches your browser's language (English, Portuguese-BR, Spanish, French, German, Russian, Japanese), falling back to English.

---

## 🛠️ Technologies Used

* **JavaScript (ES6+):** Core logic and DOM manipulation.
* **Chrome Extension API (V3):** The most modern and secure standard for extensions.
* **chrome.i18n API:** Automatic UI translation based on the browser's language.
* **Decapi.me:** Twitch metadata and avatar fetching (no API key required).
* **Inline CSS-in-JS:** The preview tooltip and sidebar are styled directly in `content.js` (no separate stylesheet).

---

## 🚀 How to Install (Developer Mode)

1. **Download** or **Clone** this repository.
2. In your browser (Chrome, Edge, Brave), go to: `chrome://extensions/`.
3. Enable **"Developer mode"** in the top right corner.
4. Click on **"Load unpacked"**.
5. Select the folder where the extension files are saved.

---

## 📂 Project Structure

| File | Description |
| :--- | :--- |
| `manifest.json` | Configurations, permissions, and metadata. |
| `content.js` | Script that runs inside Twitch/Kick pages. |
| `popup.html` | The interface that appears when clicking the icon. |
| `popup.js` | Handles storage and logic for the popup interface. |
| `icons/` | Folder containing logos in different sizes. |
| `_locales/` | Translations (`messages.json`) per language, used by `chrome.i18n`. |

> Note: `style.css` was removed — it was leftover from an earlier iframe-based preview and was never referenced by `manifest.json` or any page; the current hover preview is built entirely with inline styles in `content.js`.

---

## 🗺️ Roadmap / Checklist
### 🟢 Global
- [x] Fix Kick favorites sidebar insertion

---

## 📝 Changelog

### 4.2
* **Fix:** Avatars in the favorites sidebar and hover preview were silently failing for every channel — `unavatar.io` now requires an API key for anonymous requests (429 rate limit). Kick avatars now come from `user.profile_pic` on the channel API (already fetched for viewers/category/title); Twitch avatars come from `decapi.me/twitch/avatar`. Resolved avatar URLs are cached in `chrome.storage.local` for 1h to avoid hammering either API.
* **Rename:** Store listing name updated to "Live Preview + Favorites (Twitch/Kick)" for clarity/discoverability.

### 4.1
* **Fix:** Kick's sidebar markup changed (now a `<div id="sidebar-wrapper">` instead of `<aside>`/`<nav>`), so the favorites box was never being inserted there. Detection and insertion logic were rewritten against Kick's current DOM.
* **Fix:** Favoriting, removing, and reordering channels now key off channel **+ platform**, instead of channel name alone — previously, having the same handle favorited on both Twitch and Kick could remove or reorder the wrong one.
* **New:** Multi-language UI (English, Portuguese-BR, Spanish, French, German, Russian, Japanese), automatically matched to the browser's language via `chrome.i18n`.
* **Cleanup:** Removed the unused `style.css` (leftover from an old iframe-based preview).

---

## 🧡 Support the Project (Donations)

If this extension is useful to you and you wish to support its continuous development, please consider making a **Bitcoin** donation. Any help is greatly appreciated!

**Bitcoin Address (BTC):** `bc1qrluvyjkatg9lezrxewe2vqh4ew6z9vl7xw0s6k`

<p align="left">
  <img src="https://img.shields.io/badge/Donate-Bitcoin-orange?style=for-the-badge&logo=bitcoin" alt="Donate Bitcoin">
</p>

---

## 🤝 Contributing

Feel free to open an **Issue** or submit a **Pull Request** for improvements in preview speed or new features!

---
<p align="center">
  Developed by wiskton
</p>