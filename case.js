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

    /* The foot of the page is the one place the middle cannot decide. A last
       section shorter than half a viewport never reaches the middle, because
       the scroll runs out before it gets there — so Close stayed unreachable
       even with its own anchor clicked. Being at the bottom is the answer:
       whatever else is on screen, the last section is what you are at. */
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (max > 0 && window.scrollY >= max - 2) current = tracked[tracked.length - 1];
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

/* ------------------------------------------------------------------
 * Lottie figures
 *
 * A Lottie is a 60fps animation, so it only runs while it is on screen, and it
 * holds its first frame rather than looping when the reader has asked for
 * reduced motion. If the player did not load, the figure keeps its ground and
 * its caption and nothing throws.
 * ------------------------------------------------------------------ */
(function () {
  var nodes = document.querySelectorAll("[data-lottie]");
  if (!nodes.length || !window.lottie) return;

  var still = window.matchMedia
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  Array.prototype.forEach.call(nodes, function (el) {
    var anim = window.lottie.loadAnimation({
      container: el,
      renderer: "svg",
      loop: !still,
      autoplay: false,
      path: el.getAttribute("data-lottie")
    });

    if (still) {
      anim.addEventListener("DOMLoaded", function () { anim.goToAndStop(0, true); });
      return;
    }

    if (!window.IntersectionObserver) { anim.play(); return; }

    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) anim.play(); else anim.pause();
      });
    }, { rootMargin: "100px" }).observe(el);
  });
})();

/* ------------------------------------------------------------------
 * Zoomable figures
 *
 * A figure marked --zoomable opens in the one dialog at the foot of the page.
 * <dialog> is doing the work that is easy to get wrong by hand: Escape, the
 * backdrop, trapping focus inside, making the rest of the page inert, and
 * handing focus back to the opener on close.
 *
 * The picture is the one the page already loaded, so opening costs nothing on
 * the network — the browser repaints what it has.
 * ------------------------------------------------------------------ */
(function () {
  var dialog = document.querySelector(".case__zoom");
  if (!dialog || !dialog.showModal) return;

  /* Every figure holding a real picture becomes openable. Done here rather
     than in the markup so that a picture dropped into a stand-in is openable
     the moment it lands, with no second step to remember — and so the figures
     stay plain <figure><img> if the script never runs.

     A stand-in is skipped: there is nothing to enlarge in a grey box. So is
     the Lottie, which is a div rather than an img. */
  var openers = [];
  /* querySelectorAll, not querySelector: Figure 4.1 is a deck of four boards
     in one figure, and every one of them opens. */
  [].forEach.call(document.querySelectorAll(".case__figure img"), function (img) {
    if (img.closest(".case__zoom-open")) return;
    var button = document.createElement("button");
    button.type = "button";
    button.className = "case__zoom-open";
    img.parentNode.insertBefore(button, img);
    button.appendChild(img);
    openers.push(button);
  });
  if (!openers.length) return;

  var stage = dialog.querySelector(".case__zoom-stage");
  var img = dialog.querySelector(".case__zoom-img");
  var caption = dialog.querySelector(".case__zoom-caption");
  var closer = dialog.querySelector(".case__zoom-close");
  var ex = dialog.querySelector(".case__zoom-x");
  var prev = dialog.querySelector(".case__zoom-prev");
  var next = dialog.querySelector(".case__zoom-next");

  /* The number the caption shows is a CSS counter, so it is not in the DOM to
     read. Derived here the same way the counter is: the overview is 01, so the
     first .case__section is 02, and figures count from one inside each. */
  function figureNumber(figure) {
    var section = figure.closest(".case__section");
    if (!section) return "";
    var sections = [].slice.call(document.querySelectorAll(".case__section"));
    var figures = [].slice.call(section.querySelectorAll(".case__figure"));
    return (sections.indexOf(section) + 2) + "." + (figures.indexOf(figure) + 1);
  }

  function fit() {
    dialog.classList.remove("is-zoomed");
    dialog.style.removeProperty("--case-zoom-w");
  }

  /* Twice the width it is resting at, or the picture's own width if that is
     smaller. Proportional to the screen rather than a fixed number, so a
     phone is not asked to paint 7200px of image. */
  function zoom() {
    var resting = img.getBoundingClientRect().width;
    var w = Math.min(img.naturalWidth, Math.round(resting * 2));
    dialog.style.setProperty("--case-zoom-w", w + "px");
    dialog.classList.add("is-zoomed");
  }

  /* The pictures the overlay can step between without closing: the ones in
     the figure it was opened from. One for most figures, four for the deck. */
  var group = [];
  var at = 0;

  function show(i) {
    at = i;
    var opener = group[i];
    var figure = opener.closest(".case__figure");
    var source = opener.querySelector("img");
    var cap = figure && figure.querySelector("figcaption");
    var n = figure ? figureNumber(figure) : "";

    img.src = source.currentSrc || source.src;
    img.alt = source.alt;
    /* Trimmed: a few figures are still waiting on their caption, and
       "Figure 2.2." reads better than "Figure 2.2. " with a space hanging
       off the end of it.
       innerText rather than textContent: two captions carry a <br> between
       the path to the page and the sentence, and textContent drops it,
       running the two together. The bar keeps the break with pre-line. */
    caption.textContent =
      ((n ? "Figure " + n + ". " : "") + (cap ? cap.innerText : "")).trim();

    /* Only a figure holding more than one picture needs stepping through. */
    var many = group.length > 1;
    prev.hidden = next.hidden = !many;
    prev.disabled = i === 0;
    next.disabled = i === group.length - 1;

    fit();
  }

  function step(by) {
    var to = at + by;
    if (to < 0 || to > group.length - 1) return;
    show(to);
    /* Leave the deck on the board the reader ended on, so closing the
       overlay does not land them back where they started. */
    var slide = group[to].closest(".case__deck-slide");
    if (slide) {
      var deck = slide.parentNode;
      deck.scrollTo({ left: slide.offsetLeft - deck.firstElementChild.offsetLeft,
                      behavior: "auto" });
    }
  }

  openers.forEach(function (opener) {
    opener.addEventListener("click", function () {
      var figure = opener.closest(".case__figure");
      group = figure
        ? [].slice.call(figure.querySelectorAll(".case__zoom-open"))
        : [opener];
      show(group.indexOf(opener));
      dialog.showModal();
    });
  });

  prev.addEventListener("click", function (e) { e.stopPropagation(); step(-1); });
  next.addEventListener("click", function (e) { e.stopPropagation(); step(1); });

  /* Left and right step between the pictures of a figure that has several.
     Nothing else in the overlay uses them: panning is by drag. */
  dialog.addEventListener("keydown", function (e) {
    if (group.length < 2) return;
    if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
    if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
  });

  /* Clicking the picture toggles between fit and zoomed; clicking the ground
     around it closes, which is what a reader expects of an overlay. */
  img.addEventListener("click", function (e) {
    e.stopPropagation();
    if (dialog.classList.contains("is-zoomed")) fit(); else zoom();
  });

  stage.addEventListener("click", function () { dialog.close(); });
  closer.addEventListener("click", function () { dialog.close(); });
  if (ex) ex.addEventListener("click", function () { dialog.close(); });

  /* Drag to pan while zoomed.

     Two things make this fiddly. A pointerdown on an <img> starts the
     browser's own image drag, which swallows every pointermove after the
     first, so the drag has to be prevented outright. And a pointer that
     leaves the picture mid-drag stops sending it events, so the move and up
     are listened for on the document rather than the image. */
  var from = null;

  function onMove(e) {
    if (!from) return;
    stage.scrollLeft = from.left - (e.clientX - from.x);
    stage.scrollTop = from.top - (e.clientY - from.y);
    if (Math.abs(e.clientX - from.x) > 3 || Math.abs(e.clientY - from.y) > 3) {
      from.moved = true;
    }
  }

  function onUp() {
    img.classList.remove("is-panning");
    document.removeEventListener("pointermove", onMove);
    // Left set until after the click that follows, so a drag is not read as
    // a click toggling the zoom; cleared on the next tick.
    setTimeout(function () { from = null; }, 0);
  }

  img.addEventListener("pointerdown", function (e) {
    if (!dialog.classList.contains("is-zoomed")) return;
    e.preventDefault();
    from = {
      x: e.clientX, y: e.clientY,
      left: stage.scrollLeft, top: stage.scrollTop,
      moved: false
    };
    img.classList.add("is-panning");
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp, { once: true });
  });

  /* A drag that actually moved should not also toggle the zoom. */
  img.addEventListener("click", function (e) {
    if (from && from.moved) e.stopImmediatePropagation();
  }, true);

  dialog.addEventListener("close", fit);
})();

/* ---- the deck under Figure 4.1 ----
   The scrolling is the browser's; this only keeps the marks in step with it
   and moves it when one is clicked. Built here rather than written into the
   markup so the deck still reads as four pictures with the script off,
   rather than four pictures and four buttons that do nothing. */
(function () {
  [].forEach.call(document.querySelectorAll(".case__deck"), function (deck) {
    var slides = [].slice.call(deck.querySelectorAll(".case__deck-slide"));
    if (slides.length < 2) return;

    var still = window.matchMedia
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var marks = document.createElement("div");
    marks.className = "case__deck-marks";

    /* An arrow at either edge of the picture itself. The marks say how many
       boards there are and which one is showing; the arrows say the thing a
       mark cannot, which is that this is something you move, and they say it
       where the reader is already looking. */
    function arrow(label, path, by) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "case__deck-arrow case__deck-arrow--"
        + (by < 0 ? "prev" : "next");
      b.setAttribute("aria-label", label);
      b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"'
        + ' stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"'
        + ' aria-hidden="true"><path d="' + path + '"/></svg>';
      b.addEventListener("click", function () {
        var now = buttons.findIndex(function (x) {
          return x.getAttribute("aria-current") === "true";
        });
        var to = Math.min(slides.length - 1, Math.max(0, now + by));
        buttons[to].click();
      });
      return b;
    }

    var back = arrow("Previous board", "M15 5 8 12l7 7", -1);
    var on = arrow("Next board", "M9 5l7 7-7 7", 1);

    var buttons = slides.map(function (slide, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "case__deck-mark";
      b.setAttribute("aria-label", "Board " + (i + 1) + " of " + slides.length);
      b.addEventListener("click", function () {
        /* scrollIntoView would scroll the page to the deck as well; setting
           scrollLeft moves only the deck, which is all that was asked for. */
        deck.scrollTo({ left: slide.offsetLeft - slides[0].offsetLeft,
                        behavior: still ? "auto" : "smooth" });
      });
      marks.appendChild(b);
      return b;
    });

    var frame = deck.parentNode;
    frame.appendChild(back);
    frame.appendChild(on);
    frame.parentNode.insertBefore(marks, frame.nextSibling);

    function paint() {
      /* Whichever board covers the middle of the frame is the one showing. */
      var middle = deck.scrollLeft + deck.clientWidth / 2;
      var at = 0;
      for (var i = 0; i < slides.length; i++) {
        var left = slides[i].offsetLeft - slides[0].offsetLeft;
        if (middle >= left) at = i;
      }
      buttons.forEach(function (b, i) {
        b.setAttribute("aria-current", i === at ? "true" : "false");
      });
      back.disabled = at === 0;
      on.disabled = at === slides.length - 1;
    }

    var queued = false;
    deck.addEventListener("scroll", function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; paint(); });
    }, { passive: true });

    /* Left and right step through the boards once the deck has focus. */
    deck.tabIndex = 0;
    deck.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      var current = buttons.findIndex ? buttons.findIndex(function (b) {
        return b.getAttribute("aria-current") === "true";
      }) : 0;
      var next = Math.min(slides.length - 1,
                          Math.max(0, current + (e.key === "ArrowRight" ? 1 : -1)));
      buttons[next].click();
    });

    window.addEventListener("resize", paint);
    paint();
  });
})();
