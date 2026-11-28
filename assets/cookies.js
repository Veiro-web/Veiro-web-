/*
 * MgrSprzatania — zarządzanie zgodami cookies (Google Consent Mode v2).
 *
 * Ten plik ładowany jest SYNCHRONICZNIE w <head>, po bloku `gtag('consent','default')`
 * i PRZED skryptem Google Tag Managera. Dzięki temu zapamiętana zgoda jest odtwarzana
 * (gtag('consent','update')) zanim GTM uruchomi tagi. Interfejs (baner i panel
 * ustawień) budowany jest dopiero po załadowaniu DOM.
 *
 * Wykorzystuje istniejące `window.dataLayer` i `window.gtag` (bez drugiej instancji).
 * Cloudflare Web Analytics działa niezależnie od tych ustawień.
 */
(function () {
  'use strict';

  // ===== Konfiguracja =====
  var STORAGE_KEY = 'ss_cookie_consent';
  var POLICY_VERSION = '1'; // zmiana wersji wymusza ponowne zapytanie o zgodę
  var VALID_MONTHS = 6;

  // ===== Narzędzia =====
  function gtagSafe() {
    // Używamy istniejącej funkcji gtag. Gdyby jej brakowało, dopisujemy do tego samego dataLayer.
    if (typeof window.gtag === 'function') {
      window.gtag.apply(null, arguments);
    } else {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(arguments);
    }
  }

  var memoryConsent = null; // gdy localStorage jest niedostępny — zgoda tylko na czas wizyty

  function readConsent() {
    var data = null;
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) data = JSON.parse(raw);
    } catch (e) {
      data = memoryConsent;
    }
    if (!data && memoryConsent) data = memoryConsent;
    if (!data || typeof data !== 'object') return null;
    if (data.version !== POLICY_VERSION) return null;
    if (typeof data.expires !== 'number' || Date.now() > data.expires) return null;
    if (!data.categories || typeof data.categories !== 'object') return null;
    return {
      version: data.version,
      timestamp: data.timestamp,
      expires: data.expires,
      categories: {
        necessary: true,
        analytics: data.categories.analytics === true,
        marketing: data.categories.marketing === true
      }
    };
  }

  function writeConsent(categories) {
    var expires = new Date();
    expires.setMonth(expires.getMonth() + VALID_MONTHS);
    var data = {
      version: POLICY_VERSION,
      timestamp: new Date().toISOString(),
      expires: expires.getTime(),
      expiresAt: expires.toISOString(),
      categories: {
        necessary: true,
        analytics: categories.analytics === true,
        marketing: categories.marketing === true
      }
    };
    memoryConsent = data;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      /* brak dostępu do localStorage — zgoda obowiązuje do końca wizyty */
    }
    return data;
  }

  function clearConsent() {
    memoryConsent = null;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (e) { /* ignoruj */ }
  }

  function toState(flag) {
    return flag ? 'granted' : 'denied';
  }

  // Każda kategoria aktualizowana niezależnie
  function applyConsent(categories) {
    gtagSafe('consent', 'update', {
      analytics_storage: toState(categories.analytics),
      ad_storage: toState(categories.marketing),
      ad_user_data: toState(categories.marketing),
      ad_personalization: toState(categories.marketing)
    });
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'cookie_consent_update',
      cookie_consent: {
        analytics: categories.analytics === true,
        marketing: categories.marketing === true
      }
    });
  }

  // Po wycofaniu zgody usuwamy cookies Google ustawione wcześniej (najlepsze możliwe starania)
  function deleteCookiesMatching(regex) {
    var host = window.location.hostname;
    var parts = host.split('.');
    var domains = ['', host, '.' + host];
    if (parts.length > 2) domains.push('.' + parts.slice(-2).join('.'));
    document.cookie.split(';').forEach(function (c) {
      var name = c.split('=')[0].trim();
      if (!name || !regex.test(name)) return;
      domains.forEach(function (d) {
        document.cookie =
          name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + (d ? '; domain=' + d : '');
      });
    });
  }

  function cleanupAfterWithdrawal(categories) {
    if (!categories.analytics) deleteCookiesMatching(/^(_ga|_gid|_gat)/);
    if (!categories.marketing) deleteCookiesMatching(/^(_gcl_|_fbp|IDE$|test_cookie$)/);
  }

  // ===== Wczesne odtworzenie zgody (zanim GTM uruchomi tagi) =====
  var current = readConsent();
  if (current) {
    applyConsent(current.categories);
  } else {
    // zgoda wygasła, jest w starej wersji lub jej nie ma
    try {
      if (window.localStorage.getItem(STORAGE_KEY)) clearConsent();
    } catch (e) { /* ignoruj */ }
  }

  // ===== Interfejs =====
  var banner = null;
  var overlay = null;
  var dialog = null;
  var lastFocus = null;
  var inputs = {};

  function el(tag, className, attrs) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (attrs) {
      Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    }
    return node;
  }

  function setActiveFlag() {
    var active =
      (banner && !banner.hidden) || (overlay && !overlay.hidden);
    document.documentElement.classList.toggle('cc-active', !!active);
  }

  function buildBanner() {
    banner = el('div', 'cc-banner', {
      id: 'cc-banner',
      role: 'region',
      'aria-label': 'Zgoda na pliki cookies'
    });
    banner.hidden = true;
    banner.innerHTML =
      '<div class="cc-banner-text">' +
        '<p class="cc-title">Szanujemy Twoją prywatność</p>' +
        '<p class="cc-text">Używamy plików cookies niezbędnych do działania strony oraz, za Twoją zgodą, analitycznych i marketingowych. Możesz zaakceptować wszystkie, odrzucić opcjonalne lub wybrać samodzielnie.</p>' +
      '</div>' +
      '<div class="cc-actions">' +
        '<button type="button" class="cc-btn cc-btn-primary" data-cc="accept">Akceptuj wszystkie</button>' +
        '<button type="button" class="cc-btn cc-btn-primary" data-cc="reject">Odrzuć opcjonalne</button>' +
        '<button type="button" class="cc-btn cc-btn-outline" data-cc="customize">Dostosuj ustawienia</button>' +
      '</div>';
    document.body.appendChild(banner);
  }

  function buildDialog() {
    overlay = el('div', 'cc-overlay');
    overlay.hidden = true;
    overlay.innerHTML =
      '<div class="cc-dialog" role="dialog" aria-modal="true" aria-labelledby="cc-dialog-title" tabindex="-1">' +
        '<div class="cc-dialog-head">' +
          '<h2 id="cc-dialog-title" class="cc-dialog-title">Ustawienia cookies</h2>' +
          '<button type="button" class="cc-close" data-cc="close" aria-label="Zamknij ustawienia cookies">' +
            '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
          '</button>' +
        '</div>' +
        '<p class="cc-dialog-intro">Wybierz, na jakie kategorie plików cookies się zgadzasz. Zgodę możesz zmienić lub wycofać w każdej chwili przez link „Ustawienia cookies” w stopce.</p>' +
        '<div class="cc-cats">' +
          category('necessary', 'Niezbędne', 'Wymagane do prawidłowego działania strony i zapamiętania Twojego wyboru dotyczącego cookies. Zawsze aktywne.', true) +
          category('analytics', 'Analityczne', 'Pozwalają zrozumieć, jak odwiedzający korzystają ze strony, i ulepszać jej działanie (Google: analytics_storage).', false) +
          category('marketing', 'Marketingowe', 'Umożliwiają mierzenie skuteczności reklam i ich personalizację (Google: ad_storage, ad_user_data, ad_personalization).', false) +
        '</div>' +
        '<p class="cc-note">Anonimowe statystyki odwiedzin Cloudflare Web Analytics nie wykorzystują cookies ani localStorage i działają niezależnie od powyższych ustawień.</p>' +
        '<div class="cc-actions cc-actions-dialog">' +
          '<button type="button" class="cc-btn cc-btn-primary" data-cc="accept">Akceptuj wszystkie</button>' +
          '<button type="button" class="cc-btn cc-btn-primary" data-cc="reject">Odrzuć opcjonalne</button>' +
          '<button type="button" class="cc-btn cc-btn-outline" data-cc="save">Zapisz wybór</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    dialog = overlay.querySelector('.cc-dialog');
    inputs.analytics = overlay.querySelector('#cc-analytics');
    inputs.marketing = overlay.querySelector('#cc-marketing');
  }

  function category(id, title, desc, locked) {
    return (
      '<div class="cc-cat">' +
        '<div class="cc-cat-text">' +
          '<label class="cc-cat-title" for="cc-' + id + '">' + title + '</label>' +
          '<p class="cc-cat-desc" id="cc-' + id + '-desc">' + desc + '</p>' +
        '</div>' +
        '<label class="cc-switch">' +
          '<input type="checkbox" id="cc-' + id + '" aria-describedby="cc-' + id + '-desc"' +
            (locked ? ' checked disabled' : '') + '>' +
          '<span class="cc-slider" aria-hidden="true"></span>' +
        '</label>' +
      '</div>'
    );
  }

  function showBanner() {
    if (!banner) return;
    banner.hidden = false;
    setActiveFlag();
  }

  function hideBanner() {
    if (!banner) return;
    banner.hidden = true;
    setActiveFlag();
  }

  function focusables() {
    return Array.prototype.slice.call(
      dialog.querySelectorAll('button:not([disabled]), input:not([disabled])')
    );
  }

  function openSettings() {
    lastFocus = document.activeElement;
    var saved = readConsent();
    inputs.analytics.checked = !!(saved && saved.categories.analytics);
    inputs.marketing.checked = !!(saved && saved.categories.marketing);
    hideBanner();
    overlay.hidden = false;
    setActiveFlag();
    dialog.focus();
  }

  function closeSettings(restoreBanner) {
    overlay.hidden = true;
    setActiveFlag();
    if (restoreBanner && !readConsent()) showBanner();
    if (lastFocus && typeof lastFocus.focus === 'function' && document.contains(lastFocus)) {
      lastFocus.focus();
    }
  }

  function decide(categories) {
    writeConsent(categories);
    applyConsent(categories);
    cleanupAfterWithdrawal({
      analytics: categories.analytics === true,
      marketing: categories.marketing === true
    });
    hideBanner();
    if (overlay && !overlay.hidden) closeSettings(false);
  }

  function handleAction(action) {
    if (action === 'accept') decide({ analytics: true, marketing: true });
    else if (action === 'reject') decide({ analytics: false, marketing: false });
    else if (action === 'customize') openSettings();
    else if (action === 'save') {
      decide({ analytics: inputs.analytics.checked, marketing: inputs.marketing.checked });
    } else if (action === 'close') closeSettings(true);
  }

  function init() {
    buildBanner();
    buildDialog();

    document.addEventListener('click', function (e) {
      var opener = e.target.closest && e.target.closest('[data-cc-open]');
      if (opener) {
        e.preventDefault();
        openSettings();
        return;
      }
      var btn = e.target.closest && e.target.closest('[data-cc]');
      if (btn && (banner.contains(btn) || overlay.contains(btn))) {
        handleAction(btn.getAttribute('data-cc'));
        return;
      }
      if (e.target === overlay) closeSettings(true);
    });

    document.addEventListener('keydown', function (e) {
      if (overlay.hidden) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        closeSettings(true);
      } else if (e.key === 'Tab') {
        var items = focusables();
        if (!items.length) return;
        var first = items[0];
        var last = items[items.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });

    if (!readConsent()) showBanner();
  }

  // Publiczne API (np. do przyszłej strony polityki prywatności)
  window.ssCookies = {
    open: function () { if (overlay) openSettings(); },
    get: readConsent
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
