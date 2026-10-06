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
 *   2. the cover's own entrance: the headline band coming to rest
 *   3. the word strips woven through the wall
 *   4. section reveals, one grammar, once each
 *   5. the catalogue wheel, geared to the page's own scroll
 *   6. the same wheel turned by hand: a swipe on a phone, arrows on desktop
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

/**
 * Shows the carousel's two arrows and hands their presses to `step` (+1 is
 * next, -1 previous). `ends` reports whether the row is at either end, and the
 * returned `sync` re-reads it: an arrow with nowhere to go stays in place and
 * stays focusable, but says so with `aria-disabled` and does nothing.
 */
function wireArrows(
  carousel: HTMLElement,
  step: (dir: number) => void,
  ends: () => { atStart: boolean; atEnd: boolean },
) {
  const arrows = carousel.querySelectorAll<HTMLButtonElement>(
    ".carousel__arrow",
  );
  const click = (e: MouseEvent) => {
    const button = e.currentTarget as HTMLButtonElement;
    if (button.getAttribute("aria-disabled") === "true") return;
    step(button.dataset.dir === "next" ? 1 : -1);
  };

  let last = "";
  const sync = () => {
    const { atStart, atEnd } = ends();
    const key = `${atStart}${atEnd}`;
    if (key === last) return;
    last = key;
    arrows.forEach((button) => {
      const off = button.dataset.dir === "next" ? atEnd : atStart;
      button.setAttribute("aria-disabled", String(off));
    });
  };

  arrows.forEach((button) => {
    button.hidden = false;
    button.addEventListener("click", click);
  });
  sync();

  const unwire = () =>
    arrows.forEach((button) => {
      button.hidden = true;
      button.removeEventListener("click", click);
      button.removeAttribute("aria-disabled");
    });
  return Object.assign(unwire, { sync });
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

        if (!motion) return teardown;

        /* 1. The wall ------------------------------------------------- */

        /* The five endless travels — three rows and, further down, two word
           strips — are the only tweens on this page with no end of their own.
           Left ungated they keep five composited layers of product photographs
           repainting for as long as the tab is open, including the whole of the
           page below the cover, where nobody can see them. They are collected
           here and gated on the cover's own pass through the viewport. */
        const loops: gsap.core.Tween[] = [];

        // Each row holds its loop twice, so -50% lands exactly on the seam.
        // A loop is the row's set laid out twice, so these are double the
        // old 58 / 74 / 46 and the prints pass at the same pace.
        const rows = gsap.utils.toArray<HTMLElement>(".cover__row");
        const speeds = [116, 148, 92];

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

        // The headline's band runs in along the wall's lean and stops, as if
        // one of the travelling strips came to rest; the lede's band follows
        // a beat later.
        gsap.from(".cover__title, .cover__lede", {
          xPercent: -100,
          duration: 1.3,
          ease: "expo.out",
          stagger: 0.12,
          delay: 0.15,
        });

        // On the way out the sign drifts a little less than the wall behind
        // it, so the band lifts off the photographs as the cover leaves.
        gsap.to(".cover__sign", {
          y: -48,
          ease: "none",
          scrollTrigger: {
            trigger: ".cover",
            start: "top top",
            end: "bottom top",
            scrub: 0.6,
          },
        });

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

        // The category tiles are left out here and revealed on their own
        // branch below, because on a phone they do not animate at all.
        reveal("[data-reveal]:not(.categories [data-reveal])");

        // The gifting sign runs in along its lean as it arrives, the way the
        // cover's does on load: the same band, the second time.
        gsap.from(".gifting__title, .gifting__lede", {
          xPercent: -100,
          duration: 1.3,
          ease: "expo.out",
          stagger: 0.12,
          scrollTrigger: {
            trigger: ".gifting",
            start: "top 78%",
            once: true,
          },
        });

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
          // How far the wheel turns each way as the catalogue passes. The
          // frames wrap round, so this is a matter of pace, not of the row
          // running out.
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

    /* 4b. The category tiles, revealed on wider screens only ---------- */

    // On a phone the two-up tiles arrive in staggered pairs that read as
    // jitter rather than an entrance, so there they simply sit in place.
    mm.add(
      "(min-width: 48rem) and (prefers-reduced-motion: no-preference)",
      () => {
        reveal(".categories [data-reveal]");
      },
    );

    /* 6. Turning the wheel by hand ------------------------------------ */

    // A row of prints travelling past a thumb invites a swipe, so on a phone a
    // sideways drag turns the wheel too; on desktop the two arrows do the same
    // job one frame at a time. Both write `--drag`, which the CSS adds to the
    // scroll's `--spin`, so the hand and the page never fight over one number:
    // the page keeps turning the wheel as it scrolls, from wherever the hand
    // left it. The swipe ignores mouse pointers, so on desktop only the arrows
    // turn it; below 48rem the arrows are not drawn at all.
    mm.add("(prefers-reduced-motion: no-preference)", () => {
        const carousel = document.querySelector<HTMLElement>(".carousel");
        const viewport = carousel?.querySelector<HTMLElement>(
          ".carousel__viewport",
        );
        const frames = carousel?.querySelectorAll<HTMLElement>(".frame");
        if (!carousel || !viewport || !frames || frames.length < 2) return;

        const hand = { drag: 0 };

        // The frames wrap round, so the wheel has no ends and the hand can
        // turn it as far as it likes.
        const measure = () => frames[1].offsetLeft - frames[0].offsetLeft;
        let pitch = measure();

        const write = () =>
          carousel.style.setProperty("--drag", hand.drag.toFixed(4));

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

          hand.drag = startDrag + dx / pitch;
          write();
        };

        // Let go mid-swipe and the wheel carries on a little and settles, the
        // way a real one would, rather than stopping dead under the finger.
        const up = (e: PointerEvent) => {
          if (e.pointerId !== id) return;
          id = null;
          if (!moved) return;
          gsap.to(hand, {
            drag: hand.drag + (velocity * 280) / pitch,
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
        };

        // One arrow press turns the wheel to the next whole frame, so a press
        // made mid-turn settles square rather than adding a fractional step.
        const spinNow = () =>
          parseFloat(carousel.style.getPropertyValue("--spin")) || 0;
        const step = (dir: number) => {
          const spin = spinNow();
          const turn = spin + hand.drag;
          const target =
            dir > 0 ? Math.ceil(turn - 0.01) - 1 : Math.floor(turn + 0.01) + 1;
          gsap.killTweensOf(hand);
          gsap.to(hand, {
            drag: target - spin,
            duration: 0.7,
            ease: "power3.out",
            onUpdate: write,
          });
        };
        // A wheel that wraps has no end for either arrow to reach.
        const unwire = wireArrows(carousel, step, () => ({
          atStart: false,
          atEnd: false,
        }));

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
          unwire();
          carousel.style.removeProperty("--drag");
        };
    });

    // With motion reduced the wheel is a plain rail that scrolls, so the
    // arrows scroll it a frame at a time instead, with no smooth travel.
    mm.add("(prefers-reduced-motion: reduce)", () => {
      const carousel = document.querySelector<HTMLElement>(".carousel");
      const viewport = carousel?.querySelector<HTMLElement>(
        ".carousel__viewport",
      );
      const frames = carousel?.querySelectorAll<HTMLElement>(".frame");
      if (!carousel || !viewport || !frames || frames.length < 2) return;

      const step = (dir: number) =>
        viewport.scrollBy({
          left: dir * (frames[1].offsetLeft - frames[0].offsetLeft),
        });
      const ends = () => {
        const max = viewport.scrollWidth - viewport.clientWidth;
        return {
          atStart: viewport.scrollLeft <= 1,
          atEnd: viewport.scrollLeft >= max - 1,
        };
      };

      const unwire = wireArrows(carousel, step, ends);
      viewport.addEventListener("scroll", unwire.sync, { passive: true });
      return () => {
        viewport.removeEventListener("scroll", unwire.sync);
        unwire();
      };
    });

    return () => mm.revert();
  }, []);

  return null;
}
