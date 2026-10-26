import { useEffect } from 'react';

/*
  Fade/rise/un-blur elements as they enter the viewport.

  The revealed state is the data-in attribute, not a class or inline style:
  React owns className and style on these nodes and would wipe either on a
  re-render, but it never removes attributes it did not render. The CSS in
  styles/base.css turns data-in into a one-shot animation, so hover and tilt
  transforms on the same element stay free afterwards.
*/
export function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    if (!els.length) return undefined;

    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.setAttribute('data-in', ''));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.setAttribute('data-in', '');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}
