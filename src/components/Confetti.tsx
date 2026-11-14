import { useState } from 'react';

const COLORS = ['#e4572e', '#f3a683', '#c06c84', '#6c5b7b', '#e9a23b', '#355c7d'];

/** A one-shot burst of ticket-punch confetti. Remount (change `key`) to fire again. */
export function Confetti({ pieces = 28 }: { pieces?: number }) {
  const [bits] = useState(() =>
    Array.from({ length: pieces }, (_, i) => ({
      angle: (360 / pieces) * i + Math.random() * 12,
      dist: 60 + Math.random() * 90,
      spin: Math.round(Math.random() * 720 - 360),
      color: COLORS[i % COLORS.length],
      delay: Math.random() * 120,
      round: i % 3 === 0,
    })),
  );
  return (
    <span className="confetti" aria-hidden>
      {bits.map((b, i) => (
        <span
          key={i}
          className={b.round ? 'bit round' : 'bit'}
          style={
            {
              '--a': `${b.angle}deg`,
              '--d': `${b.dist}px`,
              '--spin': `${b.spin}deg`,
              background: b.color,
              animationDelay: `${b.delay}ms`,
            } as React.CSSProperties
          }
        />
      ))}
    </span>
  );
}
