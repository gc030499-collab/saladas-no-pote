(function () {
  'use strict';

  var CONFIG = window.SALADA_CONFIG || {};
  var isDev = location.protocol === 'file:' || /localhost|127\.0\.0\.1/.test(location.hostname);

  function trackEvent(name, data) {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.log('[track]', name, data || {});
    }
    if (window.fbq) {
      // Os 3 pontos reais de ida ao checkout (checkout_basic/premium/upgrade)
      // disparam o evento padrão InitiateCheckout, além do custom abaixo.
      if (name.indexOf('checkout_') === 0) {
        try { window.fbq('track', 'InitiateCheckout'); } catch (e) { /* pixel ainda não carregado */ }
      }
      try { window.fbq('trackCustom', name, data || {}); } catch (e) { /* pixel ainda não carregado */ }
    }
  }
  window.trackEvent = trackEvent;

  // handleMediaError já é definida inline no <head> (ver index.html), antes de qualquer <img>.

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    trackEvent('page_view');
    applyDynamicPricing();
    setupSmoothScroll();
    setupCarousels();
    setupFaq();
    setupPremiumOffer();
    setupModal();
    setupHeroVideo();
    setupTestimonialLightbox();
  }

  function trapFocus(e, container) {
    var focusable = container.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])');
    var list = Array.prototype.filter.call(focusable, function (el) { return el.offsetParent !== null; });
    if (!list.length) return;
    var first = list[0];
    var last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  // O vídeo real fica sempre visível; o fallback só aparece se o arquivo
  // realmente falhar (evita depender de 'loadeddata', que em muitos
  // navegadores mobile não dispara sem toque do usuário).
  function setupHeroVideo() {
    var wrap = document.querySelector('.hero-video');
    if (!wrap) return;
    var video = wrap.querySelector('video');
    if (!video) return;
    video.addEventListener('error', function () { wrap.classList.add('is-missing'); });
  }

  // ---------- Preços vindos só do config.js ----------
  function formatPriceParts(value) {
    var fixed = Number(value).toFixed(2).replace('.', ',');
    var parts = fixed.split(',');
    return { int: parts[0], dec: parts[1] };
  }
  function formatPrice(value) {
    var p = formatPriceParts(value);
    if (p.dec === '00') return 'R$' + p.int;
    return 'R$' + p.int + ',' + p.dec;
  }

  function applyDynamicPricing() {
    var map = { basic: CONFIG.BASIC_PRICE, premium: CONFIG.PREMIUM_PRICE, upgrade: CONFIG.UPGRADE_PRICE };

    Object.keys(map).forEach(function (key) {
      var value = map[key];
      document.querySelectorAll('[data-price="' + key + '"]').forEach(function (el) {
        el.textContent = formatPrice(value);
      });
      var parts = formatPriceParts(value);
      var isWhole = parts.dec === '00';
      document.querySelectorAll('[data-price-int="' + key + '"]').forEach(function (el) {
        el.textContent = parts.int;
      });
      document.querySelectorAll('[data-price-dec="' + key + '"]').forEach(function (el) {
        el.textContent = parts.dec;
        if (el.parentElement) el.parentElement.style.display = isWhole ? 'none' : '';
      });
    });

    var diff = (CONFIG.UPGRADE_PRICE - CONFIG.BASIC_PRICE);
    var diffLabel = 'R$' + diff.toFixed(2).replace('.00', '').replace('.', ',');
    document.querySelectorAll('[data-price-diff]').forEach(function (el) {
      el.textContent = diffLabel;
    });

    document.querySelectorAll('[data-guarantee-days]').forEach(function (el) {
      el.textContent = CONFIG.GARANTIA_DIAS;
    });
  }

  // ---------- Scroll suave (CTAs) ----------
  function setupSmoothScroll() {
    document.querySelectorAll('[data-scroll-target]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var target = document.querySelector(btn.getAttribute('data-scroll-target'));
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        var evt = btn.getAttribute('data-track');
        if (evt) trackEvent(evt);
      });
    });
  }

  // ---------- Carrosséis (scroll-snap + teclado) ----------
  function debounce(fn, wait) {
    var t;
    return function () {
      var args = arguments;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(null, args); }, wait);
    };
  }

  function setupCarousels() {
    document.querySelectorAll('.carousel').forEach(function (carousel) {
      var track = carousel.querySelector('.carousel__track');
      if (!track) return;
      var trackName = carousel.getAttribute('data-track-name');
      var fired = false;

      track.addEventListener('scroll', debounce(function () {
        if (!fired && trackName) {
          trackEvent(trackName);
          fired = true;
        }
      }, 200));

      track.addEventListener('keydown', function (e) {
        var items = track.querySelectorAll('.carousel__item');
        if (!items.length) return;
        var step = items[0].getBoundingClientRect().width + 12;
        if (e.key === 'ArrowRight') { track.scrollBy({ left: step, behavior: 'smooth' }); e.preventDefault(); }
        if (e.key === 'ArrowLeft') { track.scrollBy({ left: -step, behavior: 'smooth' }); e.preventDefault(); }
      });
    });
  }

  // ---------- FAQ ----------
  function setupFaq() {
    document.querySelectorAll('.faq__item').forEach(function (details) {
      details.addEventListener('toggle', function () {
        if (details.open) trackEvent('faq_open', { question: details.dataset.question || '' });
      });
    });
  }

  // ---------- Oferta Premium (direto, sem modal) ----------
  function setupPremiumOffer() {
    var premiumBtn = document.getElementById('premium-offer-btn');
    if (!premiumBtn) return;
    premiumBtn.addEventListener('click', function () {
      trackEvent('premium_offer_click');
      trackEvent('checkout_premium', { url: CONFIG.PREMIUM_CHECKOUT_URL });
      window.location.href = CONFIG.PREMIUM_CHECKOUT_URL;
    });
  }

  // ---------- Modal dos 3 potes ----------
  function setupModal() {
    var openBtn = document.getElementById('basic-offer-btn');
    var modal = document.getElementById('modal-upgrade');
    if (!openBtn || !modal) return;

    var overlay = modal.querySelector('.modal__overlay');
    var closeBtn = modal.querySelector('.modal__close');
    var pots = Array.prototype.slice.call(modal.querySelectorAll('.pot'));
    var acceptBtn = document.getElementById('upgrade-accept-btn');
    var declineBtn = document.getElementById('upgrade-decline-btn');
    var pickScreen = modal.querySelector('.modal__screen--pick');
    var offerScreen = modal.querySelector('.modal__screen--offer');

    var lastFocusedEl = null;
    var chosenPot = null;

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

    pots.forEach(function (pot) {
      pot.addEventListener('click', function () {
        if (chosenPot !== null) return;
        selectPot(pot);
      });
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
      resetModal();
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('no-scroll');
      trackEvent('upgrade_modal_open');
      var firstPot = modal.querySelector('.pot');
      if (firstPot) firstPot.focus();
    }

    function closeModal() {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('no-scroll');
      if (lastFocusedEl && typeof lastFocusedEl.focus === 'function') lastFocusedEl.focus();
    }

    function resetModal() {
      chosenPot = null;
      pots.forEach(function (p) {
        p.classList.remove('pot--chosen', 'pot--locked', 'pot--revealed');
        p.disabled = false;
        p.setAttribute('aria-pressed', 'false');
      });
      pickScreen.hidden = false;
      offerScreen.hidden = true;
    }

    function selectPot(pot) {
      chosenPot = pot;
      trackEvent('upgrade_pot_selected', { pot: pot.dataset.pot });

      pots.forEach(function (p) {
        if (p === pot) {
          p.classList.add('pot--chosen');
        } else {
          p.classList.add('pot--locked');
          p.disabled = true;
        }
      });

      setTimeout(function () {
        pot.classList.add('pot--revealed');
        pot.setAttribute('aria-pressed', 'true');
      }, 450);

      setTimeout(revealOffer, 900);
    }

    function revealOffer() {
      pickScreen.hidden = true;
      offerScreen.hidden = false;
      trackEvent('upgrade_offer_revealed');
      var focusTarget = offerScreen.querySelector('.btn');
      if (focusTarget) focusTarget.focus();
    }
  }

  // ---------- Lightbox de depoimento ----------
  function setupTestimonialLightbox() {
    var modal = document.getElementById('modal-lightbox');
    var buttons = document.querySelectorAll('.testimonial');
    if (!modal || !buttons.length) return;

    var overlay = modal.querySelector('.modal__overlay');
    var closeBtn = modal.querySelector('.modal__close');
    var img = document.getElementById('lightbox-img');
    var lastFocusedEl = null;

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var sourceImg = btn.querySelector('img');
        if (!sourceImg) return;
        img.src = sourceImg.src;
        img.alt = sourceImg.alt;
        trackEvent('testimonial_open', { index: btn.getAttribute('data-index') });
        openLightbox();
      });
    });

    closeBtn.addEventListener('click', closeLightbox);
    overlay.addEventListener('click', closeLightbox);
    document.addEventListener('keydown', function (e) {
      if (!modal.classList.contains('is-open')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'Tab') trapFocus(e, modal);
    });

    function openLightbox() {
      lastFocusedEl = document.activeElement;
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('no-scroll');
      closeBtn.focus();
    }

    function closeLightbox() {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('no-scroll');
      if (lastFocusedEl && typeof lastFocusedEl.focus === 'function') lastFocusedEl.focus();
    }
  }
})();
