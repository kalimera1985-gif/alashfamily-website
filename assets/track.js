/*
 * Alash Family — единый скрипт аналитики для всех страниц сайта.
 * Подключается одной строкой в <head>:  <script src="/assets/track.js" defer></script>
 *
 * НАСТРОЙКА: впишите ID счётчиков ниже. Пустое значение = счётчик не загружается.
 *   GA4_ID  — Google Analytics 4, вида 'G-XXXXXXXXXX'
 *   YM_ID   — Яндекс Метрика, только цифры, например 98765432
 */
(function () {
  'use strict';

  var CONFIG = {
    ADS_ID: 'AW-1021068699',                              // Google Ads (уже работает)
    ADS_CONVERSION: 'AW-1021068699/pbj9CMjPzdAcEJuL8eYD', // конверсия «клик WhatsApp / телефон»
    GA4_ID: 'G-XWTZM5MVG6',                               // Google Analytics 4
    YM_ID: '112938875'                                    // Яндекс Метрика alashfamily.kz
  };

  var WA_PHONE = '77786510556';

  /* ---------- 1. Google tag (Ads + GA4) ---------- */
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + (CONFIG.GA4_ID || CONFIG.ADS_ID);
  document.head.appendChild(s);
  gtag('js', new Date());
  gtag('config', CONFIG.ADS_ID);
  if (CONFIG.GA4_ID) gtag('config', CONFIG.GA4_ID);

  /* ---------- 2. Яндекс Метрика (с Вебвизором) ---------- */
  if (CONFIG.YM_ID) {
    (function (m, e, t, r, i, k, a) {
      m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
      m[i].l = 1 * new Date();
      k = e.createElement(t); a = e.getElementsByTagName(t)[0];
      k.async = 1; k.src = r; a.parentNode.insertBefore(k, a);
    })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym');
    ym(Number(CONFIG.YM_ID), 'init', {
      clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: true
    });
  }

  function ymGoal(name) {
    if (CONFIG.YM_ID && window.ym) { try { ym(Number(CONFIG.YM_ID), 'reachGoal', name); } catch (e) {} }
  }

  /* ---------- 3. Определяем источник визита ---------- */
  // Код источника попадает в текст сообщения WhatsApp — по нему видно, какая реклама привела заказ.
  function detectSource() {
    var q = location.search.toLowerCase();
    var ref = (document.referrer || '').toLowerCase();
    var src = '';
    if (/[?&]gclid=|[?&]gbraid=|[?&]wbraid=|utm_source=google/.test(q)) src = 'G';
    else if (/[?&]yclid=|utm_source=yandex/.test(q)) src = 'Y';
    else if (/[?&]fbclid=|utm_source=(instagram|facebook|ig|fb|meta)/.test(q)) src = 'I';
    else if (/utm_source=2gis/.test(q) || ref.indexOf('2gis') > -1) src = '2GIS';
    else if (/utm_source=tiktok|[?&]ttclid=/.test(q)) src = 'T';
    else if (ref.indexOf('google.') > -1) src = 'g';
    else if (ref.indexOf('yandex.') > -1) src = 'y';
    else if (/chatgpt|openai|perplexity|claude\.ai|gemini|copilot|bing\./.test(ref)) src = 'AI';
    else if (/instagram|facebook/.test(ref)) src = 'i';
    return src;
  }

  var source = '';
  try { source = sessionStorage.getItem('af_src') || ''; } catch (e) {}
  if (!source) {
    source = detectSource();
    try { if (source) sessionStorage.setItem('af_src', source); } catch (e) {}
  }

  /* ---------- 4. Ссылки WhatsApp: готовый текст + код источника ---------- */
  function buildWaText(link) {
    var text = 'Здравствуйте! Хочу сделать заказ';
    var card = link.closest && link.closest('[data-product], .card');
    if (card) {
      var name = card.getAttribute('data-product');
      if (!name) { var h = card.querySelector('h3'); if (h) name = h.textContent.trim(); }
      if (name) text += ': ' + name;
    } else if (document.body && document.body.getAttribute('data-wa-text')) {
      text = document.body.getAttribute('data-wa-text');
    }
    text += '.';
    if (source) text += ' [' + source + ']';
    return text;
  }

  function prepareWaLinks() {
    var links = document.querySelectorAll('a[href*="wa.me/"], a[href*="api.whatsapp.com"]');
    Array.prototype.forEach.call(links, function (a) {
      // Ссылки, где текст уже задан вручную, не трогаем — только добавляем код источника
      var href = a.getAttribute('href');
      if (/[?&]text=/.test(href)) {
        if (source && href.indexOf('%5B' + source + '%5D') === -1) {
          a.setAttribute('href', href + encodeURIComponent(' [' + source + ']'));
        }
        return;
      }
      a.setAttribute('href', 'https://wa.me/' + WA_PHONE + '?text=' + encodeURIComponent(buildWaText(a)));
    });
  }

  /* ---------- 5. Цели: WhatsApp, телефон, прайс ---------- */
  function onClick(e) {
    var a = e.target.closest ? e.target.closest('a') : null;
    if (!a) return;
    var href = a.getAttribute('href') || '';
    var page = location.pathname;

    if (/wa\.me|api\.whatsapp\.com/.test(href)) {
      gtag('event', 'conversion', { send_to: CONFIG.ADS_CONVERSION });
      gtag('event', 'whatsapp_click', { page_path: page, source_code: source || 'direct' });
      ymGoal('whatsapp_click');
    } else if (href.indexOf('tel:') === 0) {
      gtag('event', 'conversion', { send_to: CONFIG.ADS_CONVERSION });
      gtag('event', 'phone_click', { page_path: page });
      ymGoal('phone_click');
    } else if (/\.pdf($|\?)/i.test(href)) {
      gtag('event', 'price_download', { page_path: page });
      ymGoal('price_download');
    } else if (/t\.me\//.test(href)) {
      gtag('event', 'telegram_click', { page_path: page });
      ymGoal('telegram_click');
    }
  }

  function init() {
    prepareWaLinks();
    document.addEventListener('click', onClick, true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
