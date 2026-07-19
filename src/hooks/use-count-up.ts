import { useEffect, useRef, useState } from "react";

interface CountUpOptions {
  durationMs?: number;
  /** Start animating only when the element scrolls into view. */
  startOnView?: boolean;
}

/**
 * Animate a number from 0 → target with an ease-out curve.
 * Returns the current value plus a ref to attach for in-view triggering.
 */
export function useCountUp(target: number, { durationMs = 1600, startOnView = true }: CountUpOptions = {}) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLElement | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    const run = () => {
      if (startedRef.current) return;
      startedRef.current = true;
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min((now - start) / durationMs, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.round(target * eased));
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    if (!startOnView) {
      run();
      return;
    }

    const node = ref.current;
    if (!node) {
      run();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          run();
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [target, durationMs, startOnView]);

  return { value, ref };
}
