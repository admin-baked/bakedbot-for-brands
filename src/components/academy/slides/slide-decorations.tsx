'use client';

/**
 * Slide Decorations
 *
 * Reusable decorative SVG/CSS components positioned absolutely within slides.
 * All use pointer-events-none so they don't interfere with content interaction.
 */

import { hexToRgba } from './slide-css-utils';

interface DecorationProps {
  color: string;
}

/** Radial gradient glow orb */
export function GlowOrb({
  color,
  position = 'top-right',
  size = 320,
}: DecorationProps & { position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center'; size?: number }) {
  const positionClasses: Record<string, string> = {
    'top-right': '-top-20 -right-20',
    'top-left': '-top-20 -left-20',
    'bottom-right': '-bottom-20 -right-20',
    'bottom-left': '-bottom-20 -left-20',
    center: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
  };

  return (
    <div
      className={`absolute pointer-events-none ${positionClasses[position]}`}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, ${hexToRgba(color, 0.15)} 0%, transparent 70%)`,
        borderRadius: '50%',
      }}
    />
  );
}

/** SVG dot grid pattern */
export function DotGrid({
  color,
  rows = 6,
  cols = 8,
  position = 'right',
}: DecorationProps & { rows?: number; cols?: number; position?: 'right' | 'left' }) {
  const spacing = 24;
  const width = cols * spacing;
  const height = rows * spacing;
  const posClass = position === 'right' ? 'right-12 top-1/2 -translate-y-1/2' : 'left-12 top-1/2 -translate-y-1/2';

  return (
    <div className={`absolute pointer-events-none ${posClass}`}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {Array.from({ length: rows }).map((_, r) =>
          Array.from({ length: cols }).map((_, c) => (
            <circle
              key={`${r}-${c}`}
              cx={c * spacing + spacing / 2}
              cy={r * spacing + spacing / 2}
              r={2}
              fill={hexToRgba(color, 0.15)}
            />
          ))
        )}
      </svg>
    </div>
  );
}

/** Scattered floating circles */
export function FloatingCircles({ color, count = 5 }: DecorationProps & { count?: number }) {
  // Deterministic positions based on count
  const circles = Array.from({ length: count }).map((_, i) => ({
    x: (17 + i * 23) % 90,
    y: (11 + i * 19) % 85,
    size: 40 + (i * 30) % 80,
    opacity: 0.06 + (i * 0.02) % 0.1,
    delay: i * 0.5,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {circles.map((c, i) => (
        <div
          key={i}
          className="absolute rounded-full animate-float"
          style={{
            left: `${c.x}%`,
            top: `${c.y}%`,
            width: c.size,
            height: c.size,
            background: hexToRgba(color, c.opacity),
            animationDelay: `${c.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

/** Diagonal accent lines */
export function DiagonalLines({ color, position = 'bottom-left' }: DecorationProps & { position?: 'bottom-left' | 'top-right' }) {
  const posClass = position === 'bottom-left' ? 'bottom-0 left-0' : 'top-0 right-0';
  const rotate = position === 'bottom-left' ? '0' : '180';

  return (
    <div className={`absolute pointer-events-none ${posClass}`}>
      <svg
        width="200"
        height="200"
        viewBox="0 0 200 200"
        style={{ transform: `rotate(${rotate}deg)` }}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <line
            key={i}
            x1={0}
            y1={200 - i * 40}
            x2={i * 40}
            y2={0}
            stroke={hexToRgba(color, 0.08)}
            strokeWidth={1}
          />
        ))}
      </svg>
    </div>
  );
}

/** Large decorative quote marks */
export function DecorativeQuoteMarks({ color }: DecorationProps) {
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
      <span
        className="text-[20rem] font-serif leading-none select-none"
        style={{ color: hexToRgba(color, 0.05) }}
      >
        &ldquo;
      </span>
    </div>
  );
}

/** Animated pulse ring for stat slides */
export function PulseRing({ color, size = 280 }: DecorationProps & { size?: number }) {
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
      <div
        className="rounded-full animate-pulse-ring"
        style={{
          width: size,
          height: size,
          border: `2px solid ${hexToRgba(color, 0.2)}`,
        }}
      />
      <div
        className="absolute rounded-full animate-pulse-ring"
        style={{
          width: size * 1.3,
          height: size * 1.3,
          border: `1px solid ${hexToRgba(color, 0.1)}`,
          animationDelay: '0.5s',
        }}
      />
    </div>
  );
}

/** Flow arrow SVG between comparison columns */
export function FlowArrow({ color }: DecorationProps) {
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
      <svg width="60" height="60" viewBox="0 0 60 60">
        <defs>
          <linearGradient id="arrowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0.5" />
          </linearGradient>
        </defs>
        <path
          d="M10 30 L40 30 M35 20 L45 30 L35 40"
          stroke="url(#arrowGrad)"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

/** Hex pattern grid for subtle tech feel */
export function HexPattern({ color }: DecorationProps) {
  return (
    <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
      <svg width="100%" height="100%">
        <defs>
          <pattern id="hexGrid" width="56" height="100" patternUnits="userSpaceOnUse" patternTransform="scale(2)">
            <polygon
              points="24.8,22 37.2,29 37.2,43 24.8,50 12.4,43 12.4,29"
              fill="none"
              stroke={color}
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hexGrid)" />
      </svg>
    </div>
  );
}
