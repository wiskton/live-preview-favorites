document.addEventListener('DOMContentLoaded', () => {
    // Traduz todos os elementos marcados com data-i18n usando o idioma do navegador
    // (chrome.i18n escolhe automaticamente o locale em _locales/, com fallback para "en")
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const msg = chrome.i18n.getMessage(el.dataset.i18n);
        if (msg) el.textContent = msg;
    });

    const mixCheckbox = document.getElementById('mixPlatforms');
    if (!mixCheckbox) return;

    // Carrega o estado inicial do storage
    chrome.storage.local.get(['mixPlatforms'], (r) => {
        mixCheckbox.checked = r.mixPlatforms || false;
    });

    // Salva a alteração quando o usuário clica no checkbox
    mixCheckbox.addEventListener('change', () => {
        chrome.storage.local.set({ mixPlatforms: mixCheckbox.checked });
    });
});