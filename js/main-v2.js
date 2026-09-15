(function () {
  'use strict';

  // Script exclusivo da rota /saladas-v2 — não referencia js/main.js nem
  // as classes da página atual. Reaproveita só a config comercial
  // (js/config.js) e o mesmo padrão de analytics (console em dev + fbq).

  var CONFIG = window.SALADA_CONFIG || {};
  var isDev = location.protocol === 'file:' || /localhost|127\.0\.0\.1/.test(location.hostname);

  function trackEvent(name, data) {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.log('[v2:track]', name, data || {});
    }
    if (window.fbq) {
      if (name.indexOf('checkout_') === 0) {
        try { window.fbq('track', 'InitiateCheckout'); } catch (e) { /* pixel ainda não carregado */ }
      }
      try { window.fbq('trackCustom', name, data || {}); } catch (e) { /* pixel ainda não carregado */ }
    }
  }

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    trackEvent('page_view');
    applyPricing();
    setupScroll();
    setupFaq();
    setupGallerySwipeTrack();
    setupTestimonialSwipeTrack();
    setupPremiumOffer();
    setupUpgradeModal();
    setupLightbox();
    setupVideoScrollPlay();
  }

  function trapFocus(e, container) {
    var focusable = container.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])');
    var list = Array.prototype.filter.call(focusable, function (el) { return el.offsetParent !== null; });
    if (!list.length) return;
    var first = list[0];
    var last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  // ---------- Preços (vindos só do config.js) ----------
  function formatPriceParts(value) {
    var fixed = Number(value).toFixed(2).replace('.', ',');
    var parts = fixed.split(',');
    return { int: parts[0], dec: parts[1] };
  }
  function formatPrice(value) {
    var p = formatPriceParts(value);
    return p.dec === '00' ? 'R$' + p.int : 'R$' + p.int + ',' + p.dec;
  }

  function applyPricing() {
    var map = { basic: CONFIG.BASIC_PRICE, full: CONFIG.PREMIUM_PRICE, upgrade: CONFIG.UPGRADE_PRICE };

    Object.keys(map).forEach(function (key) {
      var value = map[key];
      document.querySelectorAll('[data-sv2-price="' + key + '"]').forEach(function (el) {
        el.textContent = formatPrice(value);
      });
      var parts = formatPriceParts(value);
      var isWhole = parts.dec === '00';
      document.querySelectorAll('[data-sv2-price-int="' + key + '"]').forEach(function (el) { el.textContent = parts.int; });
      document.querySelectorAll('[data-sv2-price-dec="' + key + '"]').forEach(function (el) {
        el.textContent = parts.dec;
        if (el.parentElement) el.parentElement.style.display = isWhole ? 'none' : '';
      });
    });

    var diff = CONFIG.UPGRADE_PRICE - CONFIG.BASIC_PRICE;
    var diffLabel = 'R$' + diff.toFixed(2).replace('.00', '').replace('.', ',');
    document.querySelectorAll('[data-sv2-price-diff]').forEach(function (el) { el.textContent = diffLabel; });

    document.querySelectorAll('[data-sv2-guarantee-days]').forEach(function (el) { el.textContent = CONFIG.GARANTIA_DIAS; });
  }

  // ---------- Scroll suave ----------
  function setupScroll() {
    document.querySelectorAll('[data-sv2-scroll]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var target = document.querySelector(btn.getAttribute('data-sv2-scroll'));
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        var evt = btn.getAttribute('data-sv2-track');
        if (evt) trackEvent(evt);
      });
    });
  }

  function debounce(fn, wait) {
    var t;
    return function () {
      var args = arguments;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(null, args); }, wait);
    };
  }

  function setupGallerySwipeTrack() {
    var row = document.querySelector('.sv2-gallery__grid');
    if (!row) return; // grid não rola — nada a rastrear aqui
  }

  function setupTestimonialSwipeTrack() {
    var row = document.querySelector('.sv2-testimonials__row');
    if (!row) return;
    var fired = false;
    row.addEventListener('scroll', debounce(function () {
      if (!fired) { trackEvent('testimonial_carousel_interaction'); fired = true; }
    }, 200));
  }

  // ---------- FAQ ----------
  function setupFaq() {
    document.querySelectorAll('.sv2-faq__item').forEach(function (details) {
      details.addEventListener('toggle', function () {
        if (details.open) trackEvent('faq_open', { question: details.dataset.question || '' });
      });
    });
  }

  // ---------- Oferta completa (direto ao checkout) ----------
  function setupPremiumOffer() {
    var btn = document.getElementById('sv2-offer-full-btn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      trackEvent('premium_offer_click');
      trackEvent('checkout_premium', { url: CONFIG.PREMIUM_CHECKOUT_URL });
      window.location.href = CONFIG.PREMIUM_CHECKOUT_URL;
    });
  }

  // ---------- Modal dos 3 potes ----------
  function setupUpgradeModal() {
    // Sem etapa de potes: o clique no Básico já abre o popup direto na
    // oferta de 50% OFF (a Coleção Completa por R$14,90 só existe aqui,
    // nunca na página principal).
    var openBtn = document.getElementById('sv2-offer-basic-btn');
    var modal = document.getElementById('sv2-upgrade-modal');
    if (!openBtn || !modal) return;

    var overlay = modal.querySelector('.sv2-modal__overlay');
    var closeBtn = modal.querySelector('.sv2-modal__close');
    var acceptBtn = document.getElementById('sv2-upgrade-accept-btn');
    var declineBtn = document.getElementById('sv2-upgrade-decline-btn');

    var lastFocusedEl = null;

    openBtn.addEventListener('click', function () {
      trackEvent('basic_offer_click');
      openModal();
    });
    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);

    document.addEventListener('keydown', function (e) {
      if (!modal.classList.contains('is-open')) return;
      if (e.key === 'Escape') closeModal();
      if (e.key === 'Tab') trapFocus(e, modal);
    });

    acceptBtn.addEventListener('click', function () {
      trackEvent('upgrade_offer_accept');
      trackEvent('checkout_upgrade', { url: CONFIG.UPGRADE_CHECKOUT_URL });
      window.location.href = CONFIG.UPGRADE_CHECKOUT_URL;
    });

    declineBtn.addEventListener('click', function () {
      trackEvent('upgrade_offer_decline');
      trackEvent('checkout_basic', { url: CONFIG.BASIC_CHECKOUT_URL });
      window.location.href = CONFIG.BASIC_CHECKOUT_URL;
    });

    function openModal() {
      lastFocusedEl = document.activeElement;
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('no-scroll');
      trackEvent('upgrade_modal_open');
      trackEvent('upgrade_offer_revealed');
      acceptBtn.focus();
    }

    function closeModal() {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('no-scroll');
      if (lastFocusedEl && typeof lastFocusedEl.focus === 'function') lastFocusedEl.focus();
    }
  }

  // ---------- Lightbox de depoimento ----------
  function setupLightbox() {
    var modal = document.getElementById('sv2-lightbox');
    var buttons = document.querySelectorAll('.sv2-testimonial');
    if (!modal || !buttons.length) return;

    var overlay = modal.querySelector('.sv2-modal__overlay');
    var closeBtn = modal.querySelector('.sv2-modal__close');
    var img = document.getElementById('sv2-lightbox-img');
    var lastFocusedEl = null;

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var source = btn.querySelector('img');
        if (!source) return;
        img.src = source.src;
        img.alt = source.alt;
        trackEvent('testimonial_open', { index: btn.getAttribute('data-index') });
        open();
      });
    });

    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', close);
    document.addEventListener('keydown', function (e) {
      if (!modal.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') trapFocus(e, modal);
    });

    function open() {
      lastFocusedEl = document.activeElement;
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('no-scroll');
      closeBtn.focus();
    }
    function close() {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('no-scroll');
      if (lastFocusedEl && typeof lastFocusedEl.focus === 'function') lastFocusedEl.focus();
    }
  }

  // ---------- Vídeo da praticidade: play/pause por scroll ----------
  // Começa mudo (política de autoplay dos navegadores não permite som sem
  // interação). Entra em reprodução perto de ~45% visível e pausa perto de
  // ~15%, com essa margem entre os dois limites evitando play/pause repetido
  // por pequenas oscilações de scroll perto do limite.
  function setupVideoScrollPlay() {
    var frame = document.querySelector('.sv2-practical__video-frame');
    var video = frame && frame.querySelector('video');
    if (!video) return;

    var hint = frame.querySelector('.sv2-practical__video-hint');
    var userInteracted = false;
    var wantsPlaying = false;

    // O atributo autoplay fica no HTML por compatibilidade, mas quem manda
    // no play/pause é o IntersectionObserver abaixo — sem isto, o navegador
    // tocaria o vídeo assim que a página carrega, mesmo fora da tela.
    video.pause();

    function dismissHint() {
      if (userInteracted) return;
      userInteracted = true;
      if (hint) hint.hidden = true;
    }

    video.addEventListener('click', dismissHint);
    video.addEventListener('touchstart', dismissHint, { passive: true });
    video.addEventListener('volumechange', function () {
      if (!video.muted) dismissHint();
    });
    video.addEventListener('play', function () {
      if (hint && video.muted && !userInteracted) hint.hidden = false;
    });

    if (!('IntersectionObserver' in window)) return; // sem suporte: controles manuais continuam funcionando

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var ratio = entry.intersectionRatio;
        if (ratio >= 0.45 && !wantsPlaying) {
          wantsPlaying = true;
          var p = video.play();
          if (p && p.catch) p.catch(function () { /* autoplay bloqueado pelo navegador; controles seguem disponíveis */ });
        } else if (ratio <= 0.15 && wantsPlaying) {
          wantsPlaying = false;
          video.pause();
        }
      });
    }, { threshold: [0, 0.15, 0.45, 1] });

    observer.observe(video);
  }
})();
