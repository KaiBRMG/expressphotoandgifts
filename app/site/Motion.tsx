"use client";

import { useEffect, useLayoutEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Runs before the browser paints the hydrated tree, so the cover's entrance
 * states are set instead of the headline painting in place and then jumping
 * back to re-enter. Falls back to useEffect on the server, where React warns
 * about useLayoutEffect and no layout exists to read anyway.
 */
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * The page's motion, orchestrated in one place rather than scattered.
 *
 * Everything animates from an already-visible default: the markup renders
 * complete, and if this never runs the page is intact, only still. Under
 * `prefers-reduced-motion` nothing here starts except the static layout.
 *
 * Six moments, in order of weight:
 *   1. the cover wall — three rows of real work travelling at three speeds,
 *      the whole wall drifting as the cover scrolls past
 *   2. the cover's own entrance
 *   3. the word strips woven through the wall
 *   4. section reveals, one grammar, once each
 *   5. the catalogue wheel, geared to the page's own scroll
 *   6. on a phone, the same wheel turned by hand
 *
 * One thing here is not motion: the dock's rest at the foot of the page runs
 * on the reduced-motion branch too, because it is what keeps the mark off the
 * wordmark rather than a flourish.
 */
/** The page's one reveal grammar: rise and fade in, once, as each arrives. */
function reveal(targets: string) {
  ScrollTrigger.batch(targets, {
    start: "top 88%",
    once: true,
    onEnter: (batch) =>
      gsap.from(batch, {
        y: 30,
        autoAlpha: 0,
        duration: 0.9,
        ease: "expo.out",
        stagger: 0.08,
        // While an element is mid-fade it lives on its own compositing
        // layer, and Windows renders the text on it with colour-fringed
        // antialiasing. Dropping the inline transform/opacity the moment
        // the tween lands hands the text back to the normal paint path.
        clearProps: "transform,opacity,visibility",
      }),
  });
}

export function Motion() {
  useIsomorphicLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const mm = gsap.matchMedia();

    mm.add(
      {
        motion: "(prefers-reduced-motion: no-preference)",
        reduced: "(prefers-reduced-motion: reduce)",
      },
      (context) => {
        const { motion } = context.conditions as { motion: boolean };

        /* Tweens and ScrollTriggers are reverted by matchMedia itself; plain
           DOM listeners are not, so anything added by hand hangs its own
           teardown here. */
        const cleanups: (() => void)[] = [];
        const teardown = () => cleanups.forEach((fn) => fn());

        /* 0. Where the dock comes to rest ----------------------------- */

        /* Not decoration, so it runs on both branches. The dock is visible
           from the first paint and stays visible; the only thing that ever
           moves it is the end of the page, where a mark left pinned to the
           viewport would land on top of the wordmark and cut the shop's name
           in half.

           So it unpins, at every width: from the moment the wordmark comes up
           under it, the dock is held a fixed gap above the wordmark's top
           edge — the ground just under the colophon — and rides the rest of
           the scroll with the page. The footer's own bottom padding is what
           guarantees that band is deep enough to hold it.

           It is read straight off layout each frame rather than tweened, so
           it tracks the scroll exactly and stops where the scroll stops. */
        const dock = document.querySelector<HTMLElement>(".dock");
        const inner = document.querySelector<HTMLElement>(".dock__inner");
        const wordmark = document.querySelector<HTMLElement>(
          ".footer__wordmark",
        );

        if (dock && inner && wordmark) {
          /* Clearance between the dock's underside and the top of the word,
             read off the token that also sets the footer's bottom padding, so
             the rest point and the room reserved for it cannot drift apart. */
          const GAP =
            parseFloat(
              getComputedStyle(document.documentElement).getPropertyValue(
                "--dock-gap",
              ),
            ) || 20;
          let y = 0;
          let queued = false;

          /* The measuring half. Reads layout, writes nothing. */
          const measure = () => {
            /* Measured on the inner row, not the dock: the dock's own bottom
               padding is the phone's safe-area inset, and counting it would
               open the gap by the height of a home indicator. The translate
               is ours, so it comes back out of the reading. */
            const rest = inner.getBoundingClientRect().bottom - y;
            const limit = wordmark.getBoundingClientRect().top - GAP;
            const next = Math.min(0, Math.round(limit - rest));
            if (next === y) return;
            y = next;
            gsap.set(dock, { y });
          };

          /* Scroll fires far more often than the screen refreshes, and reading
             a rect straight out of the handler forces layout on a frame the
             previous write had already dirtied. Coalescing into one rAF means
             at most one read-write pair per painted frame. */
          const place = () => {
            if (queued) return;
            queued = true;
            requestAnimationFrame(() => {
              queued = false;
              measure();
            });
          };

          measure();
          window.addEventListener("scroll", place, { passive: true });
          window.addEventListener("resize", place);
          /* The wordmark's place on the page settles only once the fonts and
             the product photographs above it have landed. ScrollTrigger
             already refreshes on both; this rides along rather than keeping a
             second set of load listeners. */
          ScrollTrigger.addEventListener("refresh", measure);

          cleanups.push(() => {
            window.removeEventListener("scroll", place);
            window.removeEventListener("resize", place);
            ScrollTrigger.removeEventListener("refresh", measure);
            gsap.set(dock, { y: 0 });
          });
        }

        if (!motion) return teardown;

        /* 1. The wall ------------------------------------------------- */

        /* The five endless travels — three rows and, further down, two word
           strips — are the only tweens on this page with no end of their own.
           Left ungated they keep five composited layers of product photographs
           repainting for as long as the tab is open, including the whole of the
           page below the cover, where nobody can see them. They are collected
           here and gated on the cover's own pass through the viewport. */
        const loops: gsap.core.Tween[] = [];

        // Each row holds its set twice, so -50% lands exactly on the seam.
        const rows = gsap.utils.toArray<HTMLElement>(".cover__row");
        const speeds = [58, 74, 46];

        rows.forEach((row, i) => {
          const reverse = i % 2 === 1;
          loops.push(
            gsap.fromTo(
              row,
              { xPercent: reverse ? -50 : 0 },
              {
                xPercent: reverse ? 0 : -50,
                duration: speeds[i % speeds.length],
                ease: "none",
                repeat: -1,
              },
            ),
          );
        });

        const wall = document.querySelector<HTMLElement>(".cover__wall");
        if (wall) {
          gsap.to(wall, {
            yPercent: 12,
            scale: 1.06,
            ease: "none",
            scrollTrigger: {
              trigger: ".cover",
              start: "top top",
              end: "bottom top",
              scrub: 0.6,
            },
          });
        }

        /* 2. The cover's entrance ------------------------------------- */

        gsap.from(
          [".cover__title", ".cover__lede", ".cover__cue"],
          {
            y: 26,
            autoAlpha: 0,
            duration: 1,
            ease: "expo.out",
            stagger: 0.09,
            delay: 0.12,
          },
        );

        const cueRing = document.querySelector(".cover__cueRing");
        if (cueRing) {
          gsap.to(cueRing, {
            y: 7,
            duration: 1.3,
            ease: "sine.inOut",
            repeat: -1,
            yoyo: true,
          });
        }

        /* 3. The word strips woven through the wall ------------------- */

        // Each strip travels against the row above it, on a duration that
        // shares no rhythm with the rows' 58 / 74 / 46, so the wall never
        // beats in time. Like the rows, each holds its set twice, so -50%
        // lands exactly on the seam.
        const strips = gsap.utils.toArray<HTMLElement>(".cover__band");
        const stripSpeeds = [66, 52];

        strips.forEach((strip, i) => {
          const reverse = i % 2 === 0;
          loops.push(
            gsap.fromTo(
              strip,
              { xPercent: reverse ? -50 : 0 },
              {
                xPercent: reverse ? 0 : -50,
                duration: stripSpeeds[i % stripSpeeds.length],
                ease: "none",
                repeat: -1,
              },
            ),
          );
        });

        /* The gate. While any part of the cover is on screen the wall travels;
           the moment it is fully past, all five stop where they are and the
           layer-promotion hint comes off with them. Scrolling back resumes from
           that position rather than restarting, so the wall has no seam of its
           own to give away. */
        const cover = document.querySelector<HTMLElement>(".cover");
        if (cover) {
          ScrollTrigger.create({
            trigger: cover,
            start: "top bottom",
            end: "bottom top",
            onToggle: (self) => {
              loops.forEach((loop) =>
                self.isActive ? loop.play() : loop.pause(),
              );
              cover.classList.toggle("cover--live", self.isActive);
            },
          });

          cover.classList.add("cover--live");
          cleanups.push(() => cover.classList.remove("cover--live"));
        }

        /* 4. Section reveals ------------------------------------------ */

        // The services section is left out here and revealed on its own
        // branch below, because on a phone it does not animate at all.
        reveal("[data-reveal]:not(.services [data-reveal])");

        /* 5. The catalogue wheel ------------------------------------- */

        // The wheel does not turn on its own — it is geared to the page. As the
        // catalogue travels through the viewport `--spin` runs from +SPIN to
        // -SPIN, which turns the arc left on the way down and back on the way
        // up, and stops the moment the visitor stops. Every frame's place on
        // the arc is derived from that one number in CSS, so this sets a single
        // custom property and the stylesheet re-seats twelve frames.
        //
        // Scrubbed rather than tweened: there is no duration here, only the
        // visitor's own scroll, with 0.6s of catch-up so a flick of the wheel
        // arrives smoothly instead of snapping.
        const carousel = document.querySelector<HTMLElement>(".carousel");

        if (carousel) {
          // How far the wheel turns each way. The ceiling is set by the row
          // running out: a wide screen shows about three steps either side of
          // the top, so with twelve frames and the top starting at 5.5, more
          // than about 2.2 steps would turn the last frame past the edge and
          // open a gap in the arc.
          const SPIN = 2.2;
          const wheel = { spin: SPIN };
          const write = () =>
            carousel.style.setProperty("--spin", wheel.spin.toFixed(4));

          gsap.to(wheel, {
            spin: -SPIN,
            ease: "none",
            onUpdate: write,
            scrollTrigger: {
              trigger: ".catalogue",
              start: "top bottom",
              end: "bottom top",
              scrub: 0.6,
            },
          });

          // The tween owns the property from here, so it also has to give it
          // back: left behind, an inline `--spin` would outlive the matchMedia
          // branch that set it.
          cleanups.push(() => carousel.style.removeProperty("--spin"));
        }

        // The marked line fills in as it arrives, like a highlighter stroke.
        const marked = gsap.utils.toArray<HTMLElement>(".marked");
        marked.forEach((el) => {
          gsap.from(el, {
            backgroundSize: "0% 100%",
            duration: 0.9,
            ease: "expo.out",
            scrollTrigger: { trigger: el, start: "top 86%", once: true },
          });
        });

        return teardown;
      },
    );

    /* 4b. The services section, revealed on wider screens only -------- */

    // On a phone the two-up cards arrive in staggered pairs that read as
    // jitter rather than an entrance, so there they simply sit in place.
    mm.add(
      "(min-width: 48rem) and (prefers-reduced-motion: no-preference)",
      () => {
        reveal(".services [data-reveal]");
      },
    );

    /* 6. Turning the wheel by hand, on a phone ------------------------ */

    // A row of prints travelling past a thumb invites a swipe, so on a phone a
    // sideways drag turns the wheel too. It writes `--drag`, which the CSS adds
    // to the scroll's `--spin`, so the two never fight over one number: the
    // page keeps turning the wheel as it scrolls, from wherever the hand left
    // it. Desktop never enters this branch.
    mm.add(
      "(max-width: 47.99rem) and (prefers-reduced-motion: no-preference)",
      () => {
        const carousel = document.querySelector<HTMLElement>(".carousel");
        const viewport = carousel?.querySelector<HTMLElement>(
          ".carousel__viewport",
        );
        const frames = carousel?.querySelectorAll<HTMLElement>(".frame");
        if (!carousel || !viewport || !frames || frames.length < 2) return;

        const hand = { drag: 0 };
        let reach = 0;

        // How far the wheel may turn before its last frame would leave a gap
        // at the screen's edge: the steps from the top to the end of the row,
        // less the steps half the screen shows, less half a frame.
        const measure = () => {
          const pitch = frames[1].offsetLeft - frames[0].offsetLeft;
          const mid = (frames.length - 1) / 2;
          reach = Math.max(0, mid - viewport.clientWidth / 2 / pitch - 0.5);
          carousel.style.setProperty("--reach", reach.toFixed(4));
          return pitch;
        };
        let pitch = measure();

        const write = () =>
          carousel.style.setProperty("--drag", hand.drag.toFixed(4));

        // The drag is held to what the wheel can actually show from where the
        // scroll has it now, so dragging past an end does not bank a turn the
        // hand then has to undo before anything moves.
        const bound = (drag: number) => {
          const spin =
            parseFloat(carousel.style.getPropertyValue("--spin")) || 0;
          return gsap.utils.clamp(-reach - spin, reach - spin, drag);
        };

        let id: number | null = null;
        let startX = 0;
        let startDrag = 0;
        let moved = false;
        let lastX = 0;
        let lastT = 0;
        let velocity = 0;

        const down = (e: PointerEvent) => {
          if (e.pointerType === "mouse") return;
          gsap.killTweensOf(hand);
          id = e.pointerId;
          startX = lastX = e.clientX;
          lastT = e.timeStamp;
          startDrag = hand.drag;
          velocity = 0;
          moved = false;
        };

        const move = (e: PointerEvent) => {
          if (e.pointerId !== id) return;
          const dx = e.clientX - startX;
          if (!moved && Math.abs(dx) < 6) return;
          moved = true;

          const dt = e.timeStamp - lastT;
          if (dt > 0) velocity = (e.clientX - lastX) / dt;
          lastX = e.clientX;
          lastT = e.timeStamp;

          hand.drag = bound(startDrag + dx / pitch);
          write();
        };

        // Let go mid-swipe and the wheel carries on a little and settles, the
        // way a real one would, rather than stopping dead under the finger.
        const up = (e: PointerEvent) => {
          if (e.pointerId !== id) return;
          id = null;
          if (!moved) return;
          gsap.to(hand, {
            drag: bound(hand.drag + (velocity * 280) / pitch),
            duration: 0.9,
            ease: "power3.out",
            onUpdate: write,
          });
        };

        // The browser claimed the gesture as a vertical scroll.
        const cancel = (e: PointerEvent) => {
          if (e.pointerId === id) id = null;
        };

        // A swipe that ends on a frame is not a tap on it.
        const click = (e: MouseEvent) => {
          if (!moved) return;
          e.preventDefault();
          e.stopPropagation();
          moved = false;
        };

        const resize = () => {
          pitch = measure();
          hand.drag = bound(hand.drag);
          write();
        };

        viewport.addEventListener("pointerdown", down);
        viewport.addEventListener("pointermove", move);
        viewport.addEventListener("pointerup", up);
        viewport.addEventListener("pointercancel", cancel);
        viewport.addEventListener("click", click, true);
        window.addEventListener("resize", resize);

        return () => {
          gsap.killTweensOf(hand);
          viewport.removeEventListener("pointerdown", down);
          viewport.removeEventListener("pointermove", move);
          viewport.removeEventListener("pointerup", up);
          viewport.removeEventListener("pointercancel", cancel);
          viewport.removeEventListener("click", click, true);
          window.removeEventListener("resize", resize);
          carousel.style.removeProperty("--drag");
          carousel.style.removeProperty("--reach");
        };
      },
    );

    return () => mm.revert();
  }, []);

  return null;
}
