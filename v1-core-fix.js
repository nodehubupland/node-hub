// Node Hub V1 lightweight bootstrap
// Keep public page startup independent from authentication/network calls.
(function () {
  window.setupLanguage = window.setupLanguage || function () {
    const selector = document.getElementById('language-selector');
    if (!selector || selector.dataset.nhBound === '1') return;
    selector.dataset.nhBound = '1';
    const saved = localStorage.getItem('nodehub-language') || 'en-US';
    selector.value = saved;
  };
})();