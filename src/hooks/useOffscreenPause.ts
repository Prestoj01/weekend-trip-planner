import { useEffect, useRef } from 'react';

/**
 * Adds `.offscreen` to the element while it's scrolled out of view, which pauses its CSS
 * animations (see `.offscreen` in index.css). Returns a ref for the element and a ref that
 * JS animation loops can read to skip work while hidden.
 */
export function useOffscreenPause<T extends Element>() {
  const ref = useRef<T>(null);
  const hidden = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => {
      hidden.current = !entry.isIntersecting;
      el.classList.toggle('offscreen', hidden.current);
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, hidden };
}
