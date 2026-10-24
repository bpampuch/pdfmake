// Apply the saved preference before styles paint; CSS handles System without JavaScript too.
(() => {
  const key = 'pdfmake-docs-theme';
  const valid = value => ['light', 'dark'].includes(value) ? value : 'system';
  function read() { try { return valid(localStorage.getItem(key)); } catch { return 'system'; } }
  function apply(value) {
    document.documentElement.dataset.theme = valid(value);
    const select = document.querySelector('#theme');
    if (select) select.value = valid(value);
  }
  document.documentElement.classList.add('js');
  apply(read());
  document.addEventListener('DOMContentLoaded', () => {
    const select = document.querySelector('#theme');
    if (!select) return;
    select.value = document.documentElement.dataset.theme;
    select.closest('.theme-control').hidden = false;
    select.addEventListener('change', () => {
      apply(select.value);
      try { if (select.value === 'system') localStorage.removeItem(key); else localStorage.setItem(key, select.value); } catch {}
    });
  });
  window.addEventListener('storage', event => { if (event.key === key || event.key === null) apply(read()); });
})();
