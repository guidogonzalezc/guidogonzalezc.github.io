// Shared navigation, featured backgrounds, scroll reveals and note filters.
(function () {
  'use strict';
  var root = document.documentElement;
  root.setAttribute('data-theme', 'black');
  var motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  function syncMotion() {
    root.classList.toggle('motion-enabled', !motionPreference.matches);
  }
  syncMotion();
  motionPreference.addEventListener('change', syncMotion);

  // Collapse only after the menu button is available, keeping no-JS navigation usable.
  document.querySelectorAll('.nav').forEach(function (nav, index) {
    var links = nav.querySelector('.nav-links');
    if (!links) return;
    links.id = links.id || 'navigation-' + index;
    var button = document.createElement('button');
    button.className = 'nav-menu';
    button.type = 'button';
    button.textContent = 'Menu +';
    button.setAttribute('aria-controls', links.id);
    button.setAttribute('aria-expanded', 'false');
    nav.insertBefore(button, links);
    nav.setAttribute('aria-label', 'Main navigation');
    function closeMenu() {
      links.classList.remove('is-open');
      button.setAttribute('aria-expanded', 'false');
      button.textContent = 'Menu +';
    }
    button.addEventListener('click', function () {
      var open = button.getAttribute('aria-expanded') !== 'true';
      links.classList.toggle('is-open', open);
      button.setAttribute('aria-expanded', String(open));
      button.textContent = open ? 'Close −' : 'Menu +';
    });
    links.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });
    nav.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && button.getAttribute('aria-expanded') === 'true') {
        closeMenu();
        button.focus();
      }
    });
  });
  root.classList.add('menu-ready');

  // Keep the background layers rendered for a crossfade.
  document.querySelectorAll('[data-scene]').forEach(function (scene) {
    scene.hidden = false;
  });
  root.classList.add('scenes-ready');

  // Rotate every 15 seconds; manual selection restarts the full interval.
  var scenes = [
    { category: 'RIGGING & ADONIS CFX / FROM THE REEL', title: 'Here Be Dragons ↗', url: 'https://www.youtube.com/watch?v=x8iOWTcs6yY&t=5s' },
    { category: 'CHARACTER RIGGING / FROM THE REEL', title: 'Out Cold ↗', url: 'https://www.youtube.com/watch?v=x8iOWTcs6yY&t=21s' },
    { category: 'FACIAL RIGGING / FROM THE REEL', title: 'Sprouts ↗', url: 'https://www.youtube.com/watch?v=x8iOWTcs6yY&t=80s' }
  ];
  var currentScene = 0;
  var sceneTimer = 0;
  var scenePaused = motionPreference.matches;
  var rotationControl = document.querySelector('.scene-autoplay');
  function showScene(selected) {
    currentScene = selected;
    document.querySelectorAll('[data-scene]').forEach(function (scene) {
      scene.classList.toggle('is-active', Number(scene.dataset.scene) === selected);
    });
    document.querySelectorAll('[data-slide]').forEach(function (control) {
      control.setAttribute('aria-pressed', String(Number(control.dataset.slide) === selected));
    });
    document.getElementById('scene-category').textContent = scenes[selected].category;
    document.getElementById('scene-title').textContent = scenes[selected].title;
    document.querySelector('.scene-credit').href = scenes[selected].url;
  }
  function scheduleScene() {
    clearTimeout(sceneTimer);
    if (!rotationControl || scenePaused || document.hidden) return;
    sceneTimer = setTimeout(function () {
      showScene((currentScene + 1) % scenes.length);
      scheduleScene();
    }, 15000);
  }
  function updateRotationControl() {
    if (!rotationControl) return;
    var label = scenePaused ? 'Resume background rotation' : 'Pause background rotation';
    rotationControl.textContent = scenePaused ? '▷' : 'Ⅱ';
    rotationControl.setAttribute('aria-label', label);
    rotationControl.setAttribute('title', label);
    rotationControl.setAttribute('aria-pressed', String(scenePaused));
    scheduleScene();
  }
  if (rotationControl) {
    rotationControl.hidden = false;
    rotationControl.addEventListener('click', function () {
      scenePaused = !scenePaused;
      updateRotationControl();
    });
    document.addEventListener('visibilitychange', scheduleScene);
    motionPreference.addEventListener('change', function () {
      scenePaused = motionPreference.matches;
      updateRotationControl();
    });
    updateRotationControl();
  }
  document.querySelectorAll('[data-slide]').forEach(function (button) {
    button.addEventListener('click', function () {
      showScene(Number(button.dataset.slide));
      scheduleScene();
    });
  });

  // One frame per scroll update; no continuously running animation loop.
  var hero = document.querySelector('.cinema-hero, .case-hero');
  var homeNav = document.querySelector('.home-nav');
  var chapterLinks = Array.from(document.querySelectorAll('.case-toc nav a'));
  var chapters = chapterLinks.map(function (link) { return document.querySelector(link.getAttribute('href')); });
  var scrollFrame = 0;
  function updateScroll() {
    scrollFrame = 0;
    if (homeNav) {
      var distance = root.scrollHeight - window.innerHeight;
      homeNav.style.setProperty('--read-progress', distance > 0 ? Math.min(1, window.scrollY / distance) : 0);
      homeNav.classList.toggle('is-scrolled', window.scrollY > 40);
    }
    if (hero) {
      var offset = !motionPreference.matches && finePointer.matches && window.innerWidth > 700 ? Math.min(window.scrollY, hero.offsetHeight) * 0.075 : 0;
      hero.style.setProperty('--hero-offset', offset + 'px');
    }
    if (chapters.length) {
      var current = -1;
      chapters.forEach(function (chapter, index) {
        if (chapter && chapter.getBoundingClientRect().top <= 180) current = index;
      });
      chapterLinks.forEach(function (link, index) {
        if (index === current) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }
  }
  function requestScrollUpdate() {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll);
  }
  if (hero || homeNav) {
    window.addEventListener('scroll', requestScrollUpdate, { passive: true });
    window.addEventListener('resize', requestScrollUpdate, { passive: true });
    motionPreference.addEventListener('change', requestScrollUpdate);
    finePointer.addEventListener('change', requestScrollUpdate);
    updateScroll();
  }

  // A restrained light follows the pointer within project images on desktop.
  document.querySelectorAll('.project-image').forEach(function (image) {
    var pointerFrame = 0;
    var pointerX = 0;
    var pointerY = 0;
    image.addEventListener('pointermove', function (event) {
      if (motionPreference.matches || !finePointer.matches) return;
      var bounds = image.getBoundingClientRect();
      pointerX = (event.clientX - bounds.left) / bounds.width * 100;
      pointerY = (event.clientY - bounds.top) / bounds.height * 100;
      if (!pointerFrame) {
        pointerFrame = requestAnimationFrame(function () {
          pointerFrame = 0;
          image.style.setProperty('--light-x', pointerX + '%');
          image.style.setProperty('--light-y', pointerY + '%');
        });
      }
    });
    image.addEventListener('pointerleave', function () {
      cancelAnimationFrame(pointerFrame);
      pointerFrame = 0;
    });
  });

  document.querySelectorAll('.discipline-grid, .project-grid, .experience-list, .notes-section, .case-summary-grid').forEach(function (group) {
    group.querySelectorAll('.reveal').forEach(function (element, index) {
      element.style.setProperty('--reveal-delay', Math.min(index * 90, 270) + 'ms');
    });
  });
  var reducedMotion = motionPreference.matches;
  if ('IntersectionObserver' in window && !reducedMotion) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('shown');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.04 });
    document.querySelectorAll('.reveal').forEach(function (element) {
      // Very tall article blocks must also reveal on small screens.
      observer.observe(element);
    });
    root.classList.add('motion-ready');
  }

  var filters = document.querySelectorAll('.filters button');
  filters.forEach(function (button) {
    button.setAttribute('aria-pressed', String(button.classList.contains('active')));
    button.addEventListener('click', function () {
      filters.forEach(function (control) {
        var active = control === button;
        control.classList.toggle('active', active);
        control.setAttribute('aria-pressed', String(active));
      });
      var filter = button.dataset.filter;
      document.querySelectorAll('[data-tag]').forEach(function (row) {
        row.hidden = filter !== 'ALL' && row.dataset.tag !== filter;
      });
    });
  });
})();
