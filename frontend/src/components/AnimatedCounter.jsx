import { useEffect, useRef, useState } from 'react';

function parseValue(value) {
  const match = value.match(/^(\d+(?:\.\d+)?)(.*)$/);
  if (!match) return { target: 0, suffix: value };
  return { target: parseInt(match[1], 10), suffix: match[2] };
}

export default function AnimatedCounter({ value, duration = 2000 }) {
  const [display, setDisplay] = useState('0');
  const [started, setStarted] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current || started) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;

    const { target, suffix } = parseValue(value);
    const startTime = performance.now();

    let rafId;
    function animate(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out quad
      const eased = 1 - (1 - progress) * (1 - progress);
      const current = Math.floor(eased * target);

      setDisplay(suffix ? `${current}${suffix}` : String(current));

      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      } else {
        setDisplay(value);
      }
    }

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [started, value, duration]);

  return <span ref={ref}>{display}</span>;
}
