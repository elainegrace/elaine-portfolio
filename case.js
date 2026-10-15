/* Elaine Bayhon — case study pages
   Two jobs: keep the details block centred whatever height it sets to, and
   keep the section index pointing at the section you are actually in. Both
   return early if their elements are absent. */
(function () {
  "use strict";

  /* ---- the anchor ------------------------------------------------
     Everything in the banner hangs off the details block: its middle sits on
     the middle of the viewport, the credits 60 below its foot, the cover 24
     below theirs. Only its height has to be measured — how tall it sets
     depends on where the description wraps, which depends on the width. */
  var details = document.querySelector(".case__details");

  function measure() {
    if (!details) return;
    document.documentElement.style.setProperty(
      "--case-details-h", details.offsetHeight + "px"
    );
  }

  /* ---- the index -------------------------------------------------
     The item for whichever section currently owns the middle of the screen is
     the current one. Reading from the middle rather than the top means the
     index changes over when a section is actually being looked at, instead of
     the moment its first pixel appears.

     Only sections that exist are tracked; the index lists the ones still to
     be written as plain text, so there is never a link to nowhere. */
  var index = document.querySelector(".case__index");
  var items = index ? Array.prototype.slice.call(index.querySelectorAll("[data-section]")) : [];
  var tracked = items
    .map(function (li) {
      return { li: li, section: document.getElementById(li.dataset.section) };
    })
    .filter(function (p) { return p.section; });

  var queued = false;

  function mark() {
    queued = false;
    if (!tracked.length) return;
    var middle = window.scrollY + (window.innerHeight / 2);
    var current = tracked[0];
    for (var i = 0; i < tracked.length; i++) {
      if (tracked[i].section.offsetTop <= middle) current = tracked[i];
    }
    for (var j = 0; j < items.length; j++) {
      items[j].classList.toggle("is-current", items[j] === current.li);
    }
  }

  function onScroll() {
    if (!queued) {
      queued = true;
      requestAnimationFrame(mark);
    }
  }

  function refresh() { measure(); mark(); }

  refresh();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", refresh);
  /* Switzer and Schoolbell change how the description wraps when they land. */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
})();
