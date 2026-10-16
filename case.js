/* Elaine Bayhon — case study pages
   One job: keep the section index pointing at the section you are actually
   in. It returns early if the index is absent.

   The banner used to be measured here too, back when it was centred on the
   fold and everything hung off the details block. The cover anchors it now,
   top-aligned with the back link, so the stack needs no arithmetic. */
/* ---- Landing where you left off, not where the last page left off ----
   Going between these two pages lands you at the foot of the one you
   arrive on. The cause is not this page: the homepage is 9247 tall and the
   case study 2472, and a shell that keeps the scroll offset across the
   navigation — a preview frame whose own document does the scrolling,
   rather than the page's — hands the offset it had to a much shorter
   document, where it clamps to the maximum. The maximum is the bottom. It
   happens every time rather than now and then because you have to scroll
   past 2200 to reach the project card at all.

   Putting it back at the top costs nothing and is right whenever this
   page's own window is the one that scrolls. A back or forward step is
   left alone, so returning to a page still returns you to your place in
   it, and so is an arrival on an anchor. The same block is at the top of
   app.js, which has the same problem in the other direction. */
(function () {
  if (location.hash) return;

  var entries = window.performance && performance.getEntriesByType
    ? performance.getEntriesByType("navigation") : null;
  if (entries && entries[0] && entries[0].type === "back_forward") return;

  function top() {
    /* html sets scroll-behavior: smooth, which would otherwise animate the
       correction into view instead of simply not being wrong. */
    try { window.scrollTo({ top: 0, left: 0, behavior: "instant" }); }
    catch (e) { window.scrollTo(0, 0); }
  }

  top();
  window.addEventListener("load", top);
})();

(function () {
  "use strict";

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

  mark();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", mark);
  /* The fonts change how the writeup wraps, which moves every section below
     it, so the offsets are worth reading again once they land. */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(mark);
})();
