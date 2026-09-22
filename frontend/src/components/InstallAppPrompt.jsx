import { useEffect, useState } from 'react';

const DISMISS_KEY = 'wc-install-dismissed-at';
const DISMISS_DAYS = 14;

function isDismissedRecently() {
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const elapsedDays = (Date.now() - Number(raw)) / (1000 * 60 * 60 * 24);
  return elapsedDays < DISMISS_DAYS;
}

function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS Safari's own flag for "already added to home screen"
    window.navigator.standalone === true
  );
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

// Shows a small dismissible bar offering to install the app:
// - Android/desktop Chrome & Edge fire `beforeinstallprompt`. index.html
//   captures that event as early as possible (before React even loads) and
//   stashes it on `window.__wcDeferredInstallPrompt`, because Chrome can
//   fire it before this component mounts and the event can't be replayed.
//   We read that captured event here and trigger the native install flow
//   from our own "Install" button.
// - iOS Safari never fires that event at all, so instead we show a one-line
//   hint pointing at Share -> Add to Home Screen (the only way to install
//   there).
// - Once installed, `appinstalled` fires and we hide immediately — no
//   refresh needed. Nothing here is set to "never show again" on install,
//   so if the person later uninstalls the app, the browser will naturally
//   fire `beforeinstallprompt` again on their next visit and this banner
//   comes back on its own.
export default function InstallAppPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(() => window.__wcDeferredInstallPrompt || null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [installed, setInstalled] = useState(() => window.__wcJustInstalled || false);
  const [dismissed, setDismissed] = useState(isDismissedRecently());

  useEffect(() => {
    if (isStandalone() || dismissed) return;

    // Covers the case where beforeinstallprompt already fired (and was
    // captured by index.html) before this component mounted.
    if (window.__wcDeferredInstallPrompt) {
      setDeferredPrompt(window.__wcDeferredInstallPrompt);
    }

    function onPromptReady() {
      setDeferredPrompt(window.__wcDeferredInstallPrompt);
    }
    function onInstalled() {
      setInstalled(true);
      setDeferredPrompt(null);
    }
    // True fallback for the native event: in case index.html's early script
    // is somehow missing, capture + preventDefault here too so install still
    // works (just with the same early-race risk this component normally
    // avoids).
    function onNativeBeforeInstallPrompt(event) {
      event.preventDefault();
      window.__wcDeferredInstallPrompt = event;
      setDeferredPrompt(event);
    }

    window.addEventListener('wc-install-prompt-ready', onPromptReady);
    window.addEventListener('wc-app-installed', onInstalled);
    window.addEventListener('beforeinstallprompt', onNativeBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);

    if (isIos()) setShowIosHint(true);

    return () => {
      window.removeEventListener('wc-install-prompt-ready', onPromptReady);
      window.removeEventListener('wc-app-installed', onInstalled);
      window.removeEventListener('beforeinstallprompt', onNativeBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [dismissed]);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  }

  async function handleInstall() {
    const promptEvent = deferredPrompt || window.__wcDeferredInstallPrompt;
    if (!promptEvent) return;
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    window.__wcDeferredInstallPrompt = null;
    setDeferredPrompt(null);
    if (outcome === 'accepted') setInstalled(true);
  }

  if (installed || dismissed || isStandalone() || (!deferredPrompt && !showIosHint)) return null;

  return (
    <div className="install-banner">
      <span className="install-banner-text">
        {deferredPrompt
          ? 'Install White-Clover for faster, app-like access.'
          : 'Add White-Clover to your Home Screen: tap Share, then "Add to Home Screen".'}
      </span>
      <div className="install-banner-actions">
        {deferredPrompt && (
          <button type="button" className="install-banner-btn" onClick={handleInstall}>
            Install
          </button>
        )}
        <button type="button" className="install-banner-dismiss" onClick={dismiss} aria-label="Dismiss">
          &times;
        </button>
      </div>
    </div>
  );
}
