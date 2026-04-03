document.addEventListener('DOMContentLoaded', () => {
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