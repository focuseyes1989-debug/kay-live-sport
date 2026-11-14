const themeKey = 'kay-download-theme';
const root = document.documentElement;
try {
  root.dataset.theme = localStorage.getItem(themeKey) === 'dark' ? 'dark' : 'light';
} catch {
  root.dataset.theme = 'light';
}

document.addEventListener('DOMContentLoaded', () => {
  const themeButton = document.getElementById('site-theme');
  const updateTheme = () => {
    const dark = root.dataset.theme === 'dark';
    themeButton.textContent = dark ? 'Light theme' : 'Dark theme';
    document.querySelector('meta[name="theme-color"]').content = dark ? '#1d1e2e' : '#ffffff';
  };
  updateTheme();
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
