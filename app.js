/* Elaine Bayhon — portfolio
   Shared behaviour: the clock, the Extras carousel, and the
   scroll-driven transition. Each piece returns early when the
   elements it drives are absent, so a page that has no carousel
   or no hero simply runs less of this. */

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
   case.js, which has the same problem in the other direction. */
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

/* ---- Singapore time ---------------------------------------------- */
(function () {
  var nodes = document.querySelectorAll(".clock__time");
  if (!nodes.length) return;

  var zone = "Asia/Singapore";
  var formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: zone, hour: "numeric", minute: "2-digit", hour12: true
  });
  var isoFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone, hour: "2-digit", minute: "2-digit", hour12: false
  });
  var zoneFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: zone, timeZoneName: "shortOffset"
  });

  // Read the offset off the zone rather than hard-coding +8, so the label
  // stays true if that ever changes.
  function offset(now) {
    var part = zoneFormatter.formatToParts(now).find(function (bit) {
      return bit.type === "timeZoneName";
    });
    return part ? part.value.replace("GMT", "UTC") : "UTC+8";
  }

  function render() {
    var now = new Date();
    // Intl can emit U+202F / U+00A0 before AM/PM — normalise to a plain space.
    var clock = formatter.format(now).replace(/[  ]/g, " ");
    var label = clock + " (" + offset(now) + ")";
    var stamp = isoFormatter.format(now);
    Array.prototype.forEach.call(nodes, function (node) {
      if (node.textContent !== label) {
        node.textContent = label;
        node.setAttribute("datetime", stamp);
      }
    });
  }

  render();
  setInterval(render, 1000);
})();

/* ---- Extras carousel ---------------------------------------------
   The set authored in the markup is duplicated until it covers the viewport
   plus one whole set, and the cycle distance is exactly one set — so the
   wrap is seamless at any tile count or window width, and travel speed
   stays constant instead of scaling with either. */
(function () {
  var carousel = document.querySelector(".extras__carousel");
  if (!carousel) return;

  var track = carousel.querySelector(".extras__track");
  var originals = Array.prototype.slice.call(track.children);
  if (!originals.length) return;

  var queued = false;

  function build() {
    queued = false;

    Array.prototype.slice.call(track.children).forEach(function (tile) {
      if (tile.hasAttribute("data-clone")) track.removeChild(tile);
    });

    var setWidth = originals.reduce(function (total, tile) {
      var gap = parseFloat(getComputedStyle(tile).marginRight) || 0;
      return total + tile.getBoundingClientRect().width + gap;
    }, 0);
    if (!setWidth) return;

    var copies = Math.min(Math.ceil((carousel.clientWidth + setWidth) / setWidth), 12);
    for (var i = 1; i < copies; i++) {
      originals.forEach(function (tile) {
        var clone = tile.cloneNode(true);
        clone.setAttribute("data-clone", "");
        clone.setAttribute("aria-hidden", "true");
        track.appendChild(clone);
      });
    }

    // Read per build rather than once at start-up, so --extras-speed can be
    // changed at runtime and the duration follows. The cycle distance is one
    // whole set either way, so the wrap stays seamless whatever the speed.
    var speed = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--extras-speed")
    ) || 45;
    track.style.setProperty("--extras-shift", setWidth.toFixed(2) + "px");
    track.style.animationDuration = (setWidth / speed).toFixed(2) + "s";
  }

  function onResize() {
    if (!queued) {
      queued = true;
      requestAnimationFrame(build);
    }
  }

  build();
  window.addEventListener("resize", onResize);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(build);
})();

/* ---- Hero -> Work transition -------------------------------------
   One normalised scroll value drives every moving part, so the pieces stay
   in step with each other and with the scrollbar at any frame rate. */
(function () {
  var root = document.documentElement;
  var hero = document.querySelector(".hero");
  var about = document.querySelector(".about");
  var extras = document.querySelector(".extras");
  var contact = document.querySelector(".contact");
  var bio = document.querySelector(".bio");
  var bioTitle = document.querySelector(".bio__title");
  var nav = document.querySelector(".nav");
  var eyebrow = document.querySelector(".eyebrow");
  var stage = document.querySelector(".hero__stage");
  var heroHeight = 1;
  var queued = false;

  // The hero's three phases, as fractions of the runway. Written by measure()
  // rather than fixed, because where they can fall depends on how long the
  // sticky stage stays pinned.
  var outEnd = 0.45;
  var handEnd = 0.5;
  var inEnd = 0.9;

  // One {from, span} per changeover, in document pixels. Written by measure().
  var toAboutAt = null;
  var toExtrasAt = null;
  var toContactAt = null;
  var releaseAt = null;
  var blurbAt = null;

  // The blurb waits this long after the heading has locked, then fades in
  // over this much — so the heading lands by itself and the subtitle follows.
  var BLURB_DELAY = 160;
  var BLURB_FADE = 160;

  // The blurb lets go over the last RELEASE_LEAD px before the carousel's top
  // would reach its foot, and is gone with RELEASE_CLEAR px still between
  // them — so no tile is ever behind the text, at any scroll speed.
  var RELEASE_LEAD = 160;
  var RELEASE_CLEAR = 8;

  // The longest a changeover is allowed to take, as a fraction of a viewport.
  // Where the gap between two sections is shorter than this the changeover
  // takes the gap instead.
  var RAMP = 0.5;

  function clamp01(n) { return n < 0 ? 0 : n > 1 ? 1 : n; }

  // The foot of what a section last shows, and the head of what the next one
  // shows first. Not the section boxes: those carry the leads and the padding,
  // so their edges say nothing about when the reader can see anything.
  function foot(sel) {
    var el = document.querySelector(sel);
    return el ? el.getBoundingClientRect().bottom + window.scrollY : 0;
  }

  function head(sel) {
    var el = document.querySelector(sel);
    return el ? el.getBoundingClientRect().top + window.scrollY : 0;
  }

  // A changeover runs across the stretch where neither section is on screen:
  // it opens as the outgoing content clears the top of the viewport and shuts
  // as the incoming content reaches the bottom. So the heading has finished
  // naming the new section before any of it is visible, and it changes over on
  // an empty screen rather than over something the reader is still reading.
  //
  // Where no such stretch exists — tablet and mobile, laid out to their frames
  // rather than to this, where the sections meet with no gap — the old measure
  // stands: half a viewport ending as the section's top reaches the top.
  function changeover(prevFoot, nextHead, sectionTop) {
    var vh = window.innerHeight;
    var open = prevFoot;
    var shut = nextHead - vh;
    var gap = shut - open;
    if (gap < 1) return { from: sectionTop - (vh * RAMP), span: vh * RAMP };
    var span = Math.min(gap, vh * RAMP);
    return { from: open + ((gap - span) / 2), span: span };
  }

  // Two curves for the travel, both symmetrical, differing in how much of the
  // motion they pack into the middle. The midpoint slope is what reads as
  // hurried: cubic runs 3x the average speed there, sine about 1.57x. Which
  // one is in force is switchable while we decide.
  // Four treatments for the nav, all of them still see-through. Measured over
  // the worst backdrop the pill actually crosses — the near-black wall in the
  // Ohmyhome cover, luminance 25 of 255 — and over the plain ground.
  //
  //   now    what is there. Fails on dark: the pill lands on #818080.
  //   mid    a 70% ground with the backdrop brightened first, and type dark
  //          enough to carry it. The most backdrop still visible of the three
  //          that hold up.
  //   dense  an 86% ground. The backdrop still moves behind it, muted; the
  //          type can stay closer to the greys the design asks for.
  //   dark   the pill goes dark instead of light, type goes pale. The only
  //          one that is comfortable at both ends, because a dark ground is
  //          already close to the dark backdrop and merely dims the light one.
  //
  // Brightening the backdrop barely helps at 50%: half the pill is tint
  // whatever happens underneath, so alpha is the lever, not the filter.
  var NAV_OPTIONS = [
    {
      "--nav-surface": "rgba(245, 243, 242, 0.5)",
      "--nav-blur": "blur(4px)",
      "--nav-item": "#aeaeae",
      "--nav-item-on": "#666666"
    },
    {
      "--nav-surface": "rgba(249, 248, 247, 0.7)",
      "--nav-blur": "blur(14px) brightness(1.5) saturate(1.2)",
      "--nav-item": "#6e6e6e",
      "--nav-item-on": "#111111"
    },
    {
      "--nav-surface": "rgba(249, 248, 247, 0.86)",
      "--nav-blur": "blur(14px) saturate(1.2)",
      "--nav-item": "#767676",
      "--nav-item-on": "#1a1a1a"
    },
    {
      "--nav-surface": "rgba(20, 20, 20, 0.68)",
      "--nav-blur": "blur(14px) saturate(1.1)",
      "--nav-item": "#dcdcdc",
      "--nav-item-on": "#ffffff"
    }
  ];

  var EASINGS = {
    cubic: function (t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    },
    sine: function (t) {
      return -(Math.cos(Math.PI * t) - 1) / 2;
    }
  };
  var ease = EASINGS.sine;

  // Which value drives the left rail. "fade" hands the logo and the bio over
  // on --hand, inside the window where both are transparent, so they change
  // place without being watched; "travel" is the old behaviour, where they
  // cross the screen on --p alongside the nav. Kept switchable on the bench.
  var railMode = "fade";

  // Layout-dependent values are read here rather than per frame, so scrolling
  // never forces a reflow.
  function measure() {
    heroHeight = Math.max(hero.offsetHeight, 1);

    // How much of the runway the stage stays pinned for. The hero's content
    // has to have faded out inside that, and the blind window where the rail
    // changes place has to shut on its end — so both are cut from the measured
    // pin rather than written down, and any runway above 1 holds. At a runway
    // of 2 this reproduces the 0.45 / 0.5 / 0.9 the fractions used to be.
    //
    // Below a runway of about 1.05 there is no pin worth cutting to — tablet,
    // where the hero is one viewport and its content simply scrolls away — and
    // the old fractions stand.
    var pin = stage ? (heroHeight - stage.offsetHeight) / heroHeight : 0;
    if (pin > 0.05) {
      outEnd = pin * 0.9;
      handEnd = pin;
    } else {
      outEnd = 0.45;
      handEnd = 0.5;
    }
    inEnd = handEnd + ((1 - handEnd) * 0.8);

    var cards = document.querySelectorAll(".card");
    var lastCard = cards.length
      ? cards[cards.length - 1].querySelector(".card__meta")
      : null;
    var workFoot = lastCard
      ? lastCard.getBoundingClientRect().bottom + window.scrollY
      : 0;

    toAboutAt = changeover(workFoot, head(".about__content"), about.offsetTop);
    // The blurb is fixed to the heading now, so it never rises into view from
    // the bottom — the carousel is the first Extras content that does, and the
    // changeover shuts on that instead.
    toExtrasAt = changeover(foot(".about__content"), head(".extras__carousel"), extras.offsetTop);
    toContactAt = changeover(foot(".extras__carousel"), head(".contact__portrait"), contact.offsetTop);

    // The blurb is fixed, so its foot is a viewport position, not a document
    // one: the eyebrow's own top plus however tall the copy sets. offsetHeight
    // rather than the rect, which carries the 20px the fade-in rides in on.
    var intro = document.querySelector(".extras__intro");
    if (intro) {
      var introTop = parseFloat(
        getComputedStyle(root).getPropertyValue("--eyebrow-top")
      ) || 0;
      var meets = head(".extras__carousel") - (introTop + intro.offsetHeight);
      releaseAt = { from: meets - RELEASE_LEAD, span: RELEASE_LEAD - RELEASE_CLEAR };

      // Arriving and letting go have to share the stretch between the heading
      // locking and the carousel coming up. Where that stretch is short — a
      // small window, or a short viewport — the wait and the fade are scaled
      // into it rather than overrunning, and at least a third of it is kept
      // as a hold at full strength so the blurb is never merely passing
      // through on its way back out.
      var shut = toExtrasAt.from + toExtrasAt.span;
      var room = Math.max(releaseAt.from - shut, 1);
      var budget = room * 0.6;
      var wait = Math.min(BLURB_DELAY, budget / 2);
      blurbAt = {
        from: shut + wait,
        span: Math.max(Math.min(BLURB_FADE, budget - wait), 1)
      };
    }

    measureBio();
    measureNav();
    apply();
  }

  // In Contact the nav comes up to the top of the viewport, where the section
  // heading already is. Whether the two fit side by side depends on how wide
  // the heading's word and the nav's four are — so it is measured rather than
  // pinned to a breakpoint, and the nav drops below the heading when they
  // would collide. The 16 is the clearance between them.
  function measureNav() {
    if (!nav || !eyebrow) return;
    var clear = eyebrow.getBoundingClientRect().right + 16;
    var navLeft = (document.documentElement.clientWidth - nav.offsetWidth) / 2;
    root.style.setProperty("--nav-drop", navLeft < clear ? "1" : "0");
  }

  // How tall the bio ends up at its Work size, and how far the first line has
  // to clear the label, both depend on how the copy happens to set. Rather
  // than write those numbers down — they go stale the moment the copy or the
  // measure changes — hold the bio at its Work size for one read and take
  // them. apply() puts the progress value back before anything paints.
  function measureBio() {
    if (!bio || !bioTitle) return;
    var gap = parseFloat(
      getComputedStyle(root).getPropertyValue("--bio-label-gap")
    ) || 0;
    root.style.setProperty("--bio-indent-base", (bioTitle.offsetWidth + gap) + "px");
    // The Work breaks have to be in force for this read, or the height comes
    // back as the freely-wrapped one and the bio misses its footing.
    var wasWork = bio.classList.contains("is-work");
    bio.classList.add("is-work");
    // Both, because --rail is one or the other and the measure has to be
    // taken with the bio at its Work width and size either way.
    root.style.setProperty("--p", "1");
    root.style.setProperty("--hand", "1");
    root.style.setProperty("--bio-work-height", bio.offsetHeight + "px");
    if (!wasWork) bio.classList.remove("is-work");
  }

  function apply() {
    queued = false;
    var y = window.scrollY;

    var toWork = clamp01(y / heroHeight);
    var eased = ease(toWork);
    root.style.setProperty("--p", eased.toFixed(4));
    // Hero-only elements lead out; the eyebrow trails in behind them, so the
    // bottom-left slot is empty before the bio arrives in it.
    root.style.setProperty("--out", clamp01(1 - toWork / outEnd).toFixed(4));
    root.style.setProperty(
      "--in",
      clamp01((toWork - handEnd) / (inEnd - handEnd)).toFixed(4)
    );
    // The window between those two, where nothing hero and nothing Work is on
    // screen. Anything that changes place rather than travelling moves here.
    var hand = clamp01((toWork - outEnd) / (handEnd - outEnd));
    root.style.setProperty("--hand", hand.toFixed(4));
    // Swap the Work line breaks in while the change is unwatched: halfway
    // through the blind window when the rail fades, and late in the travel
    // when it does not, where the bio is already at its Work measure.
    if (bio) {
      bio.classList.toggle(
        "is-work",
        railMode === "fade" ? hand >= 0.5 : eased >= 0.9
      );
    }

    root.style.setProperty("--q", ease(at(toAboutAt, y)).toFixed(4));
    root.style.setProperty("--r", ease(at(toExtrasAt, y)).toFixed(4));
    var easedT = ease(at(toContactAt, y));
    root.style.setProperty("--t", easedT.toFixed(4));

    // The nav's dip follows where the nav actually is, not where the hero is:
    // it travels on --p down and back up on --t, so the net of the two is its
    // position, and a half sine over that is 0 at both resting places and 1 at
    // the furthest point between them. Taken from the eased values, so the dip
    // tracks the pill rather than the scroll.
    var navPos = clamp01(eased - easedT);
    root.style.setProperty("--nav-dip", Math.sin(Math.PI * navPos).toFixed(4));
    root.style.setProperty("--blurb", ease(at(blurbAt, y)).toFixed(4));
    root.style.setProperty("--release", ease(at(releaseAt, y)).toFixed(4));
  }

  function at(window_, y) {
    if (!window_) return 0;
    return clamp01((y - window_.from) / Math.max(window_.span, 1));
  }

  function onScroll() {
    if (!queued) {
      queued = true;
      requestAnimationFrame(apply);
    }
  }

  // TEMPORARY. A bench for feeling the two smoothing levers against each
  // other — the curve, and how many viewports the hero holds for. It is not
  // part of the design and comes out once they are settled.
  (function bench() {
    var panel = document.querySelector(".bench");
    if (!panel) return;
    panel.addEventListener("click", function (event) {
      var button = event.target.closest("button");
      if (!button) return;
      var group = button.parentNode;
      Array.prototype.forEach.call(group.querySelectorAll("button"), function (b) {
        b.classList.toggle("is-on", b === button);
      });
      if (button.dataset.ease) {
        ease = EASINGS[button.dataset.ease];
        apply();
      } else if (button.dataset.navfade) {
        root.style.setProperty("--nav-fade", button.dataset.navfade);
      } else if (button.dataset.speed) {
        root.style.setProperty("--extras-speed", button.dataset.speed);
        window.dispatchEvent(new Event("resize"));
      } else if (button.dataset.tile) {
        root.style.setProperty("--extras-tile-vh", button.dataset.tile);
        window.dispatchEvent(new Event("resize"));
      } else if (button.dataset.navopt) {
        var opt = NAV_OPTIONS[+button.dataset.navopt];
        for (var k in opt) root.style.setProperty(k, opt[k]);
      } else if (button.dataset.gaps) {
        root.style.setProperty("--section-lead", button.dataset.gaps);
        measure();
      } else if (button.dataset.rail) {
        railMode = button.dataset.rail;
        var fading = railMode === "fade";
        root.style.setProperty("--rail", fading ? "var(--hand)" : "var(--p)");
        root.style.setProperty(
          "--rail-fade",
          fading ? "max(var(--out), var(--in))" : "1"
        );
        measure();
      } else {
        root.style.setProperty("--hero-scroll", button.dataset.runway);
        measure();
      }
    });
  })();

  measure();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", measure);
  // Switzer and Schoolbell change the section offsets when they swap in.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(measure);
  }
})();
