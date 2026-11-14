const themeKey = 'kay-shared-theme';
const root = document.documentElement;
try {
  const saved = localStorage.getItem(themeKey) ?? localStorage.getItem('kay-download-theme') ?? localStorage.getItem('kay-live-theme');
  root.dataset.theme = saved === 'dark' ? 'dark' : 'light';
} catch {
  root.dataset.theme = 'light';
}

document.addEventListener('DOMContentLoaded', () => {
  const themeButton = document.getElementById('site-theme');
  const updateTheme = () => {
    const dark = root.dataset.theme === 'dark';
    const label = dark ? 'Switch to light theme' : 'Switch to dark theme';
    themeButton.title = label;
    themeButton.setAttribute('aria-label', label);
    document.querySelector('meta[name="theme-color"]').content = dark ? '#1d1e2e' : '#ffffff';
  };
  updateTheme();
  window.addEventListener('storage', event => {
    if (event.key !== themeKey) return;
    root.dataset.theme = event.newValue === 'dark' ? 'dark' : 'light';
    updateTheme();
  });
  themeButton.hidden = false;
  themeButton.addEventListener('click', () => {
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    updateTheme();
    try { localStorage.setItem(themeKey, root.dataset.theme); } catch {}
  });

  // Native anchor downloads work without JavaScript. Keep FAQ navigation tidy.
  document.querySelectorAll('.faq-list details').forEach(item=>{
  item.addEventListener('toggle',()=>{
    if(item.open)document.querySelectorAll('.faq-list details').forEach(other=>{if(other!==item)other.open=false;});
  });
  });
});
