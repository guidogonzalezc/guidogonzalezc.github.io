// Guido Gonzalez site — theme switching, scroll reveals, blog filters.

(function () {
  // ===== Theme =====
  var KEY = 'gg-theme';
  var ORDER = ['black', 'white', 'mixed'];
  var LABELS = { black: '\u25CF BLACK', white: '\u25CB WHITE', mixed: '\u25D0 MIX' };

  function getTheme() {
    try {
      var t = localStorage.getItem(KEY);
      return ORDER.indexOf(t) >= 0 ? t : 'black';
    } catch (e) { return 'black'; }
  }

  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    document.querySelectorAll('.theme-toggle').forEach(function (b) {
      b.textContent = LABELS[t];
    });
  }

  function cycleTheme() {
    var next = ORDER[(ORDER.indexOf(getTheme()) + 1) % ORDER.length];
    try { localStorage.setItem(KEY, next); } catch (e) {}
    applyTheme(next);
  }

  applyTheme(getTheme());

  document.addEventListener('DOMContentLoaded', function () {
    applyTheme(getTheme());
    document.querySelectorAll('.theme-toggle').forEach(function (b) {
      b.addEventListener('click', cycleTheme);
    });

    // ===== Scroll reveals =====
    var els = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
    els.forEach(function (el) {
      el.style.transitionDelay = (el.getAttribute('data-delay') || '0') + 'ms';
    });
    function check() {
      var vh = window.innerHeight;
      els.forEach(function (el) {
        if (el.classList.contains('shown')) return;
        var r = el.getBoundingClientRect();
        if (r.top < vh - 30 && r.bottom > 0) el.classList.add('shown');
      });
    }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('shown'); io.unobserve(e.target); }
        });
      }, { threshold: 0.08 });
      els.forEach(function (el) { io.observe(el); });
    }
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check, { passive: true });
    requestAnimationFrame(function () { requestAnimationFrame(check); });
    setInterval(check, 800);

    // ===== Blog filters =====
    var filterBtns = document.querySelectorAll('.filters button');
    if (filterBtns.length) {
      filterBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
          filterBtns.forEach(function (b) { b.classList.remove('active'); });
          btn.classList.add('active');
          var f = btn.getAttribute('data-filter');
          document.querySelectorAll('[data-tag]').forEach(function (row) {
            row.style.display = (f === 'ALL' || row.getAttribute('data-tag') === f) ? '' : 'none';
          });
        });
      });
    }
  });
})();
