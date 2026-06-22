import { useEffect, useState } from 'react';

const fonts = [
  "'Syne', sans-serif",
  "'Playfair Display', serif",
  "'Space Grotesk', sans-serif",
  "'Dancing Script', cursive",
  "'Bebas Neue', sans-serif",
];

export default function FontSwitcher({ text }) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      const timeout = setTimeout(() => {
        setIndex(i => (i + 1) % fonts.length);
        setVisible(true);
      }, 300);
      return () => clearTimeout(timeout);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span
      className={`inline-block text-amber-300 dark:text-amber-400 transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      }`}
      style={{ fontFamily: fonts[index] }}
    >
      {text}
    </span>
  );
}
