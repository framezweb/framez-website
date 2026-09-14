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
  var items = Array.prototype.slice.call(container.children);
  if (!items.length) return;
  var gap = 8;
  var resizeTimer;

  function getColumnCount() {
    var w = window.innerWidth;
    if (w <= 480) return 1;
    if (w <= 760) return 2;
    return 3;
  }

  function run() {
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
      var x = shortest * (colWidth + gap);
      var y = colHeights[shortest];
      item.style.left = x + 'px';
      item.style.top = y + 'px';
      colHeights[shortest] += item.offsetHeight + gap;
    });

    container.style.position = 'relative';
    container.style.height = Math.max.apply(null, colHeights) + 'px';
  }

  var imgs = container.querySelectorAll('img');
  var total = imgs.length;
  var loaded = 0;

  if (total === 0) {
    run();
  } else {
    imgs.forEach(function (img) {
      if (img.complete) {
        loaded++;
      } else {
        img.addEventListener('load', check);
        img.addEventListener('error', check);
      }
    });
    if (loaded === total) run();
  }

  function check() {
    loaded++;
    if (loaded === total) run();
  }

  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(run, 150);
  });
}
window.layoutMasonry = layoutMasonry;
