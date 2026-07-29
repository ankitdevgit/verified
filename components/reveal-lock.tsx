"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Makes the scroll-driven reveals one-shot.
 *
 * A `view()` timeline is a function of position, not of time: scroll back up
 * and every animation runs backwards, so content that has already been read
 * fades out again. That's correct per the spec and wrong for a reader.
 *
 * This watches for each revealed element becoming properly visible and then
 * freezes it there, so the reveal happens exactly once.
 *
 * Note what it deliberately does *not* do: it never hides anything. The start
 * state still lives entirely in CSS, so a failed or blocked script leaves the
 * page working exactly as it does today, rather than stuck at opacity 0. That
 * is the whole reason the reveals weren't built on IntersectionObserver in the
 * first place — this only ever adds the finished state, never the hidden one.
 */
const TARGETS = [
  ".reveal",
  ".reveal-stagger > *",
  ".reveal-scale",
  ".reveal-scale-stagger > *",
  ".reveal-sequence > *",
  ".reveal-rule",
].join(",");

export function RevealLock() {
  const pathname = usePathname();

  useEffect(() => {
    const elements = document.querySelectorAll(TARGETS);
    if (!elements.length || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("reveal-done");
          observer.unobserve(entry.target);
        }
      },
      // Inset rather than a threshold: a section taller than the viewport can
      // never cross a 0.6 threshold, so it would never lock. This fires once
      // the element reaches the comfortable middle of the screen instead.
      { rootMargin: "-18% 0px -18% 0px" },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // Re-scan per route: the effect can't see a client-side navigation's DOM.
  }, [pathname]);

  return null;
}
