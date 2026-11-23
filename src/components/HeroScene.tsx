import { useEffect, useId } from 'react';
import { useOffscreenPause } from '../hooks/useOffscreenPause';
import type { SceneWeather, Terrain } from '../lib/scene';

/**
 * Animated travel-poster landscape. Layers shift with the pointer and scroll (parallax by
 * `--depth`); sun, clouds, birds and a train are animated in CSS. Fully static under
 * prefers-reduced-motion.
 */

export function HeroScene({
  children,
  terrain = 'mountains',
  weather = 'sunny',
  className = '',
}: {
  children: React.ReactNode;
  terrain?: Terrain;
  weather?: SceneWeather;
  className?: string;
}) {
  const { ref, hidden } = useOffscreenPause<HTMLDivElement>();
  const skyId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let frame = 0;
    let target = { x: 0, y: 0 };
    let current = { x: 0, y: 0 };

    // Ease towards the pointer so the scene glides instead of snapping.
    const tick = () => {
      frame = requestAnimationFrame(tick);
      if (hidden.current) return;
      current = { x: current.x + (target.x - current.x) * 0.08, y: current.y + (target.y - current.y) * 0.08 };
      el.style.setProperty('--px', current.x.toFixed(4));
      el.style.setProperty('--py', current.y.toFixed(4));
      el.style.setProperty('--scroll', String(Math.min(window.scrollY, 600)));
    };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      target = { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: ((e.clientY - r.top) / r.height) * 2 - 1 };
    };
    const onLeave = () => (target = { x: 0, y: 0 });

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [ref, hidden]);

  return (
    <div className={`poster terrain-${terrain} scene-${weather} ${className}`} ref={ref}>
      <svg className="scene" viewBox="0 0 1200 460" preserveAspectRatio="xMidYMax slice" aria-hidden>
        <defs>
          <linearGradient id={skyId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className="sky-top" />
            <stop offset="1" className="sky-bottom" />
          </linearGradient>
        </defs>
        <rect width="1200" height="460" fill={`url(#${CSS.escape(skyId)})`} />

        <g className="stars">
          {STARS.map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} style={{ animationDelay: `${(i % 7) * 0.45}s` }} />
          ))}
        </g>

        <g className="layer" style={{ '--depth': 0.15 } as React.CSSProperties}>
          <g className="sun">
            <g className="sun-rays">
              {Array.from({ length: 16 }, (_, i) => (
                <rect key={i} x="596" y="40" width="8" height="54" rx="4" transform={`rotate(${i * 22.5} 600 215)`} />
              ))}
            </g>
            <circle cx="600" cy="215" r="92" className="sun-disc" />
            <rect x="500" y="236" width="200" height="7" className="sun-stripe" />
            <rect x="500" y="258" width="200" height="10" className="sun-stripe" />
            <rect x="500" y="282" width="200" height="13" className="sun-stripe" />
          </g>
        </g>

        <g className="clouds">
          <Cloud className="cloud c1" x={0} y={90} s={1} />
          <Cloud className="cloud c2" x={0} y={150} s={0.7} />
          <Cloud className="cloud c3" x={0} y={60} s={0.5} />
        </g>

        <g className="birds">
          <path className="bird" d="M0 0 q8 -8 16 0 q8 -8 16 0" />
          <path className="bird b2" d="M0 0 q6 -6 12 0 q6 -6 12 0" transform="translate(30 18)" />
          <path className="bird b3" d="M0 0 q5 -5 10 0 q5 -5 10 0" transform="translate(-22 26)" />
        </g>

        {terrain === 'mountains' && (
          <>
            <g className="layer m-far" style={{ '--depth': 0.35 } as React.CSSProperties}>
              <path d="M-60 290 L90 220 L190 262 L330 160 L470 258 L590 196 L720 268 L860 148 L990 240 L1110 196 L1260 252 V460 H-60Z" />
              <path className="snow" d="M330 160 L362 184 L346 182 L334 194 L320 182 L302 181Z" />
              <path className="snow" d="M860 148 L894 174 L876 171 L862 184 L848 172 L828 173Z" />
            </g>
            <g className="layer m-mid" style={{ '--depth': 0.6 } as React.CSSProperties}>
              <path d="M-60 330 L130 250 L260 316 L410 228 L560 322 L700 262 L850 336 L990 252 L1260 330 V460 H-60Z" />
            </g>
          </>
        )}
        {terrain === 'hills' && (
          <>
            <g className="layer m-far" style={{ '--depth': 0.35 } as React.CSSProperties}>
              <path d="M-60 300 Q100 230 260 280 T600 262 T940 250 T1260 270 V460 H-60Z" />
            </g>
            <g className="layer m-mid" style={{ '--depth': 0.6 } as React.CSSProperties}>
              <path d="M-60 336 Q160 282 360 326 T760 314 T1260 318 V460 H-60Z" />
            </g>
          </>
        )}
        {terrain === 'lowland' && (
          <>
            <g className="layer m-far skyline" style={{ '--depth': 0.35 } as React.CSSProperties}>
              {SKYLINE.map(([x, w, h], i) => (
                <rect key={i} className={i % 3 === 1 ? 'alt' : undefined} x={x} y={330 - h} width={w} height={h + 140} />
              ))}
              <rect x="-60" y="326" width="1320" height="140" />
            </g>
            <g className="layer water" style={{ '--depth': 0.6 } as React.CSSProperties}>
              <rect x="-60" y="330" width="1320" height="130" />
              <path
                className="wave"
                d="M-60 346 q30 -8 60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0"
              />
              <path
                className="wave w2"
                d="M-60 364 q30 -8 60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0"
              />
            </g>
          </>
        )}
        {terrain !== 'lowland' && (
          <g className="layer m-near" style={{ '--depth': 0.9 } as React.CSSProperties}>
            <path d="M-60 372 Q120 318 300 360 T660 352 T1000 364 T1260 342 V460 H-60Z" />
            {TREES.map(([x, y, h], i) => (
              <path key={i} className="tree" d={`M${x} ${y} l${h * 0.32} ${h} h${-h * 0.64}Z`} />
            ))}
          </g>
        )}
        <g className="layer m-fore" style={{ '--depth': 1.25 } as React.CSSProperties}>
          <path d="M-60 404 H1260 V460 H-60Z" />
          <line className="rail" x1="-60" y1="404" x2="1260" y2="404" />
          <g className="train">
            <g className="steam">
              <circle cx="168" cy="360" r="9" />
              <circle cx="168" cy="360" r="12" />
              <circle cx="168" cy="360" r="7" />
            </g>
            <rect x="0" y="378" width="54" height="22" rx="3" className="car" />
            <rect x="60" y="378" width="54" height="22" rx="3" className="car" />
            <rect x="120" y="372" width="64" height="28" rx="3" className="engine" />
            <rect x="160" y="362" width="12" height="12" className="engine" />
            {[8, 30, 68, 90, 130].map((x) => (
              <rect key={x} x={x} y={383} width={14} height={8} rx={1} className="window" />
            ))}
            {[12, 42, 72, 102, 132, 168].map((x) => (
              <circle key={x} cx={x} cy={402} r={5} className="wheel" />
            ))}
          </g>
        </g>
      </svg>
      {weather !== 'sunny' && weather !== 'cloudy' && <div className="scene-fx" aria-hidden />}
      <div className="poster-copy">{children}</div>
    </div>
  );
}

function Cloud({ className, x, y, s }: { className: string; x: number; y: number; s: number }) {
  return (
    <g className={className}>
      <g transform={`translate(${x} ${y}) scale(${s})`}>
        <path d="M0 40 a28 28 0 0 1 40 -26 a36 36 0 0 1 66 6 a24 24 0 0 1 34 20Z" />
      </g>
    </g>
  );
}

const STARS: [number, number, number][] = [
  [80, 40, 2],
  [180, 110, 1.5],
  [260, 30, 2.5],
  [390, 80, 1.5],
  [470, 24, 2],
  [720, 60, 2],
  [800, 20, 1.5],
  [910, 96, 2.5],
  [1010, 40, 1.5],
  [1110, 120, 2],
  [1150, 30, 2],
  [330, 140, 1.2],
  [640, 30, 1.2],
  [980, 150, 1.2],
];

const TREES: [number, number, number][] = [
  [70, 336, 30],
  [96, 340, 24],
  [250, 344, 26],
  [520, 338, 32],
  [548, 344, 24],
  [780, 344, 28],
  [1060, 340, 30],
  [1088, 346, 22],
];

const SKYLINE: [x: number, w: number, h: number][] = [
  [20, 60, 70],
  [90, 40, 120],
  [140, 70, 90],
  [220, 36, 160],
  [262, 54, 110],
  [330, 80, 60],
  [420, 44, 140],
  [470, 60, 190],
  [540, 38, 120],
  [590, 90, 80],
  [690, 50, 150],
  [750, 64, 100],
  [820, 40, 210],
  [870, 70, 130],
  [950, 46, 90],
  [1005, 60, 160],
  [1075, 50, 110],
  [1135, 70, 75],
];
