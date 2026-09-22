import type { Sides } from "@/lib/game";

interface Shape {
  points: string;
  /** Visual center, used for the text and the inner "pair" outline. */
  cx: number;
  cy: number;
  font: number;
}

// Outline silhouettes in a 100x100 box, roughly how each die reads from above.
const SHAPES: Record<Sides, Shape> = {
  4: { points: "50,8 93,86 7,86", cx: 50, cy: 62, font: 28 },
  6: { points: "13,13 87,13 87,87 13,87", cx: 50, cy: 50, font: 40 },
  8: { points: "50,4 94,50 50,96 6,50", cx: 50, cy: 50, font: 34 },
  10: { points: "50,4 94,40 50,96 6,40", cx: 50, cy: 46, font: 32 },
  12: { points: "50,6 93,38 77,90 23,90 7,38", cx: 50, cy: 54, font: 34 },
  20: { points: "50,4 92,27 92,73 50,96 8,73 8,27", cx: 50, cy: 50, font: 34 },
};

interface DieIconProps {
  sides: Sides;
  /** Number to show; null shows the die type (unrolled). */
  value: number | null;
  dashed?: boolean;
  doubled?: boolean;
  fillOpacity?: number;
  className?: string;
}

export function DieIcon({ sides, value, dashed, doubled, fillOpacity = 0.06, className }: DieIconProps) {
  const s = SHAPES[sides];
  const text = value == null ? `D${sides}` : String(value);
  const font = value == null ? s.font * 0.62 : text.length > 1 ? s.font * 0.9 : s.font;
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <polygon
        points={s.points}
        fill="currentColor"
        fillOpacity={fillOpacity}
        stroke="currentColor"
        strokeWidth={dashed ? 3 : 4.5}
        strokeLinejoin="round"
        strokeDasharray={dashed ? "7 6" : undefined}
      />
      {doubled && (
        <polygon
          points={s.points}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinejoin="round"
          opacity={0.75}
          transform={`translate(${s.cx} ${s.cy}) scale(0.74) translate(${-s.cx} ${-s.cy})`}
        />
      )}
      <text
        x={s.cx}
        y={s.cy}
        textAnchor="middle"
        dominantBaseline="central"
        fill="currentColor"
        fontSize={font}
        fontWeight={value == null ? 500 : 700}
        style={{ fontFamily: "var(--font-orbitron)" }}
      >
        {text}
      </text>
    </svg>
  );
}
