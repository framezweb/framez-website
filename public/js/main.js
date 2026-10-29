document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.getElementById('navToggle');
  var links = document.getElementById('navLinks');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      links.classList.toggle('open');
    });
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        links.classList.remove('open');
      });
    });
  }
});

// True masonry layout: measures each photo and places it in the shortest
// column, so there are never leftover gaps like CSS columns/flex leave.
function layoutMasonry(container) {
  if (!container) return;

  // Set up once per container: one resize listener, one layout function.
  if (!container._ml) {
    var gap = 8, raf = 0, resizeTimer;
    var getColumnCount = function () {
      var w = window.innerWidth;
      if (w <= 480) return 1;
      if (w <= 760) return 2;
      return 3;
    };
    // Always reads the CURRENT children, so photos added by "Load more" are included.
    var run = function () {
      var items = Array.prototype.slice.call(container.children);
      if (!items.length) return;
      var cols = getColumnCount();
      var containerWidth = container.clientWidth;
      var colWidth = (containerWidth - gap * (cols - 1)) / cols;
      var colHeights = new Array(cols).fill(0);

      items.forEach(function (item) {
        item.style.position = 'absolute';
        item.style.width = colWidth + 'px';

        var shortest = 0;
        for (var i = 1; i < cols; i++) {
          if (colHeights[i] < colHeights[shortest]) shortest = i;
        }
        item.style.left = (shortest * (colWidth + gap)) + 'px';
        item.style.top = colHeights[shortest] + 'px';
        colHeights[shortest] += item.offsetHeight + gap;
      });

      container.style.position = 'relative';
      container.style.height = Math.max.apply(null, colHeights) + 'px';
    };
    container._ml = {
      run: run,
      // Re-layout (at most once per frame) every time a photo finishes loading
      schedule: function () {
        if (raf) return;
        raf = requestAnimationFrame(function () { raf = 0; run(); });
      }
    };
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(run, 150);
    });
  }

  var ml = container._ml;
  var imgs = container.querySelectorAll('img');
  for (var i = 0; i < imgs.length; i++) {
    var img = imgs[i];
    if (img._mlBound) continue;
    img._mlBound = true;
    if (!img.complete) {
      img.addEventListener('load', ml.schedule);
      img.addEventListener('error', ml.schedule);
    }
  }
  // Place everything right away; positions are corrected as photos load.
  ml.run();
}
window.layoutMasonry = layoutMasonry;


/* ===== Framez pop-ups ===== */
(function () {
  var WA_NUMBER = '94769644887';
  var WA_ICON = '<svg viewBox="0 0 24 24"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 1.8c2.17 0 4.2.84 5.73 2.38a8.07 8.07 0 0 1 2.37 5.73c0 4.47-3.64 8.11-8.11 8.11-1.45 0-2.87-.39-4.1-1.12l-.29-.17-3.03.8.81-2.96-.19-.3a8.06 8.06 0 0 1-1.24-4.28c0-4.47 3.64-8.19 8.09-8.19zM8.63 7.2c-.17 0-.45.06-.69.32-.24.26-.9.88-.9 2.15s.92 2.49 1.05 2.66c.13.17 1.8 2.86 4.45 3.9 2.2.87 2.65.7 3.13.65.48-.04 1.55-.63 1.77-1.24.22-.61.22-1.13.15-1.24-.06-.11-.24-.17-.5-.3-.26-.13-1.55-.77-1.79-.85-.24-.09-.41-.13-.59.13-.17.26-.68.85-.83 1.03-.15.17-.3.2-.57.07-.26-.13-1.1-.4-2.1-1.29-.77-.69-1.3-1.55-1.45-1.81-.15-.26-.02-.4.11-.53.12-.12.26-.3.39-.46.13-.15.17-.26.26-.44.09-.17.04-.33-.02-.46-.07-.13-.59-1.42-.81-1.94-.21-.51-.43-.44-.59-.45h-.5z"/></svg>';

  // Each pop-up shows only once per visit (per album)
  function seen(key) { try { return sessionStorage.getItem(key) === '1'; } catch (e) { return false; } }
  function mark(key) { try { sessionStorage.setItem(key, '1'); } catch (e) {} }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }
  function waButton(message) {
    var a = el('a', 'btn btn-solid fz-wa');
    a.href = 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(message);
    a.target = '_blank';
    a.rel = 'noopener';
    a.innerHTML = WA_ICON;
    a.appendChild(document.createTextNode('Chat on WhatsApp'));
    return a;
  }
  function closeButton(onClose) {
    var b = el('button', 'fz-x', '\u00d7');
    b.type = 'button';
    b.setAttribute('aria-label', 'Close');
    b.addEventListener('click', onClose);
    return b;
  }
  function removeLater(node) {
    node.classList.remove('show');
    setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 350);
  }
  function reveal(node) {
    document.body.appendChild(node);
    requestAnimationFrame(function () { requestAnimationFrame(function () { node.classList.add('show'); }); });
  }

  // BIG pop-up: after a download
  function showDownload(opts) {
    var title = opts.title || 'this';
    var key = 'fz_dl_' + title;
    if (seen(key) || document.querySelector('.fz-overlay')) return;
    mark(key);

    var overlay = el('div', 'fz-overlay');
    var card = el('div', 'fz-card');
    function close() { removeLater(overlay); }

    if (opts.cover) {
      var img = el('img', 'fz-img');
      img.src = opts.cover;
      img.alt = '';
      card.appendChild(img);
    }
    card.appendChild(closeButton(close));

    var body = el('div', 'fz-body');
    body.appendChild(el('h3', '', 'Thanks for downloading! \uD83D\uDCF8'));
    body.appendChild(el('p', '', 'We cover events, school events, birthdays, graduations and more.'));

    var offer = el('div', 'fz-offer');
    offer.appendChild(document.createTextNode('Mention the '));
    offer.appendChild(el('b', '', title));
    offer.appendChild(document.createTextNode(' album and get '));
    offer.appendChild(el('b', '', '5% off'));
    offer.appendChild(document.createTextNode(' your next event.'));
    body.appendChild(offer);
    body.appendChild(el('p', 'fz-note', 'Offer valid for 30 days.'));

    body.appendChild(el('p', 'fz-video', 'Need videography too? \uD83C\uDFA5 We do both.'));
    body.appendChild(waButton('Hi Framez! I downloaded the ' + title + ' album and I\u2019d like to claim the 5% offer.'));
    card.appendChild(body);

    overlay.appendChild(card);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function onKey(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); }
    });
    reveal(overlay);
  }

  // BIG pop-up: when a video finishes playing
  function showVideoEnd(opts) {
    var title = opts.title || 'this';
    var key = 'fz_vend_' + title;
    if (seen(key) || document.querySelector('.fz-overlay')) return;
    mark(key);

    // If the small "enjoyed the video?" box is still open, the big one replaces it
    var smallOpen = document.querySelector('.fz-small');
    if (smallOpen) removeLater(smallOpen);

    var overlay = el('div', 'fz-overlay');
    var card = el('div', 'fz-card');
    function close() { removeLater(overlay); }

    if (opts.cover) {
      var img = el('img', 'fz-img');
      img.src = opts.cover;
      img.alt = '';
      card.appendChild(img);
    }
    card.appendChild(closeButton(close));

    var body = el('div', 'fz-body');
    body.appendChild(el('h3', '', 'Thanks for watching! \uD83C\uDFAC'));
    body.appendChild(el('p', '', 'We make highlight videos for events, school events, birthdays and more.'));

    var offer = el('div', 'fz-offer');
    offer.appendChild(document.createTextNode('Mention the '));
    offer.appendChild(el('b', '', title));
    offer.appendChild(document.createTextNode(' video and get '));
    offer.appendChild(el('b', '', '5% off'));
    offer.appendChild(document.createTextNode(' your next event.'));
    body.appendChild(offer);
    body.appendChild(el('p', 'fz-note', 'Offer valid for 30 days.'));

    body.appendChild(waButton('Hi Framez! I watched the ' + title + ' video and I\u2019d like to claim the 5% offer.'));
    card.appendChild(body);

    overlay.appendChild(card);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function onKey(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); }
    });
    reveal(overlay);
  }

  // SMALL pop-up (slides up from the bottom)
  function smallBox(heading, buttonMessage) {
    var box = el('div', 'fz-small');
    box.setAttribute('role', 'dialog');
    box.appendChild(closeButton(function () { removeLater(box); }));
    box.appendChild(el('h4', '', heading));
    box.appendChild(waButton(buttonMessage));
    reveal(box);
  }

  // After the visitor has opened 12 photos
  function showAlbumNudge(opts) {
    var title = opts.title || 'this';
    var key = 'fz_view_' + title;
    if (seen(key) || document.querySelector('.fz-overlay') || document.querySelector('.fz-small')) return;
    mark(key);
    smallBox('Have an event? Let\u2019s capture it. \uD83D\uDCF8',
      'Hi Framez! I saw the ' + title + ' album. I\u2019m planning an event.');
  }

  // After 60 seconds of watching a video
  function showVideoNudge(opts) {
    var title = opts.title || 'this';
    var key = 'fz_vid_' + title;
    if (seen(key) || document.querySelector('.fz-small')) return;
    mark(key);
    smallBox('Enjoyed the video? \uD83C\uDFAC We can make one for your event too.',
      'Hi Framez! I watched the ' + title + ' video. I\u2019d like videography for my event.');
  }

  window.framezPopups = {
    showDownload: showDownload,
    showAlbumNudge: showAlbumNudge,
    showVideoNudge: showVideoNudge,
    showVideoEnd: showVideoEnd
  };
})();

// Turns text into safe HTML so album titles can never run as code.
function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
window.escapeHtml = escapeHtml;

/* =========================================================
   MOTION (added Oct 2026): hero reveal, scroll fade-ups,
   card wave, header shrink, heart pop.
   ========================================================= */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 10: header shrink (works even with reduced motion, it's not an animation of content)
  var header = document.querySelector('header.site');
  if (header) {
    var onScroll = function () { header.classList.toggle('fz-scrolled', window.scrollY > 40); };
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }

  // 11: heart pop (any heart button, including ones added later)
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.heart-btn');
    if (!b || reduce) return;
    b.classList.remove('fz-pop'); void b.offsetWidth; b.classList.add('fz-pop');
    setTimeout(function () { b.classList.remove('fz-pop'); }, 500);
  }, true);

  if (reduce || !('IntersectionObserver' in window)) return;
  window.__fzReady = true;
  document.documentElement.classList.add('fz-motion');

  // 1 + 2: split the page headline into words and reveal
  var hero = document.querySelector('.hero');
  if (hero) {
    var h1 = hero.querySelector('h1');
    var count = 0;
    if (h1) {
      (function split(node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (n) {
          if (n.nodeType === 3) {
            var parts = n.textContent.split(/(\s+)/), frag = document.createDocumentFragment();
            parts.forEach(function (p) {
              if (!p) return;
              if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
              var s = document.createElement('span'); s.className = 'fz-w'; s.textContent = p;
              s.style.transitionDelay = (0.15 + count * 0.07) + 's'; count++;
              frag.appendChild(s);
            });
            node.replaceChild(frag, n);
          } else if (n.nodeType === 1) split(n);
        });
      })(h1);
    }
    var after = 0.15 + count * 0.07 + 0.25;
    hero.style.setProperty('--fz-d2', after + 's');
    hero.style.setProperty('--fz-d3', (after + 0.2) + 's');
    void hero.offsetWidth; getComputedStyle(hero.querySelector('.eyebrow') || hero).opacity;
    setTimeout(function () { hero.classList.add('fz-in'); }, 80);
  }

  // 4 + 5: fade-up on scroll; cards in the same grid come in as a wave
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add('fz-show'); io.unobserve(en.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

  var SEL = 'section:not(.hero) h2, section:not(.hero) .kicker, .section-head > .btn, ' +
            'section:not(.hero) .wrap > p, .shoot-card, .card, .album-tile, form, .contact-info, footer.site';
  function prep(root) {
    var list = (root.matches && root.matches(SEL)) ? [root] : [];
    list = list.concat(Array.prototype.slice.call(root.querySelectorAll ? root.querySelectorAll(SEL) : []));
    list.forEach(function (el) {
      if (el.classList.contains('fz-r') || el.closest('.hero') || el.closest('.photo-grid')) return;
      if (el.classList.contains('album-tile') || el.classList.contains('shoot-card') || el.classList.contains('card')) {
        var sibs = Array.prototype.filter.call(el.parentNode.children, function (c) { return c.tagName === el.tagName; });
        var cols = Math.max(1, Math.round(el.parentNode.clientWidth / Math.max(1, el.clientWidth || 1)));
        el.style.setProperty('--fz-delay', ((sibs.indexOf(el) % Math.min(cols, 4)) * 0.1) + 's');
      }
      el.classList.add('fz-r');
      io.observe(el);
    });
  }
  prep(document.body);
  // album/video cards are loaded later from Drive, so watch for them
  new MutationObserver(function (muts) {
    muts.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) prep(n); }); });
  }).observe(document.body, { childList: true, subtree: true });
})();
