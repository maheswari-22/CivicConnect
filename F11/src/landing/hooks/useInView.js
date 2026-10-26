import { useEffect, useState } from 'react';

// True while the referenced element is on screen. Lets heavy animations
// (conveyor, demo rotation) sleep when the visitor is elsewhere on the page.
export function useInView(ref, threshold = 0.1) {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) {
      setInView(true);
      return undefined;
    }
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, threshold]);

  return inView;
}
