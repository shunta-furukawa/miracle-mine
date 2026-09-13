let installEvent = null;
const appDisplayModes = ['standalone', 'fullscreen'].map(mode => window.matchMedia(`(display-mode: ${mode})`));
const installed = () => appDisplayModes.some(mode => mode.matches) || navigator.standalone === true;
function markInstalled() { document.documentElement.classList.toggle('installed', installed()); }
markInstalled();
for (const mode of appDisplayModes) mode.addEventListener('change', markInstalled);
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installEvent = event;
});
window.addEventListener('appinstalled', () => { installEvent = null; markInstalled(); });
export async function requestInstall() {
  if (installed()) return 'installed';
  if (!installEvent) return 'instructions';
  const event = installEvent;
  installEvent = null;
  try { await event.prompt(); await event.userChoice; return 'prompted'; }
  catch { return 'instructions'; }
}
if ('serviceWorker' in navigator && window.isSecureContext) {
  let acceptingUpdate = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (acceptingUpdate) window.location.reload();
  });
  navigator.serviceWorker.register('/sw.js', {scope: '/', updateViaCache: 'none'}).then(reg => {
    const showUpdate = () => {
      if (!reg.waiting || !navigator.serviceWorker.controller || document.querySelector('#app-update')) return;
      const button = document.createElement('button');
      button.id = 'app-update';
      button.textContent = '新しいバージョンに更新';
      button.addEventListener('click', () => {
        if (!reg.waiting) return;
        acceptingUpdate = true;
        button.disabled = true;
        button.textContent = '更新しています…';
        reg.waiting.postMessage({type: 'ACTIVATE_UPDATE'});
      });
      document.body.append(button);
    };
    showUpdate();
    reg.addEventListener('updatefound', () => {
      const worker = reg.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed') showUpdate();
      });
    });
    let lastUpdate = Date.now();
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && Date.now() - lastUpdate > 60000) {
        lastUpdate = Date.now();
        reg.update().catch(() => {});
      }
    });
  }).catch(() => {
    // Online play remains available if storage or service workers are restricted.
  });
}
