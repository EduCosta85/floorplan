import type { WallGeometry } from '../utils/floor-plan.utils';
import { Opening } from './Opening';

interface WallProps {
  wall: WallGeometry;
  color?: string;
}

/**
 * Renders a wall as a line with thickness
 * Virtual walls (exists: false) are rendered as dashed lines
 */
export function Wall({ wall, color = '#333' }: WallProps) {
  const { x1, y1, x2, y2, thickness, exists, openings } = wall;

  if (!exists) {
    // Virtual wall - dashed line, no thickness
    return (
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="#999"
        strokeWidth={0.5}
        strokeDasharray="4,4"
        className="wall wall--virtual"
      />
    );
  }

  const isHorizontal = y1 === y2;
  const halfThickness = thickness / 2;

  // Calculate wall rectangle
  let rx: number, ry: number, rw: number, rh: number;

  if (isHorizontal) {
    rx = Math.min(x1, x2);
    ry = y1 - halfThickness;
    rw = Math.abs(x2 - x1);
    rh = thickness;
  } else {
    rx = x1 - halfThickness;
    ry = Math.min(y1, y2);
    rw = thickness;
    rh = Math.abs(y2 - y1);
  }

  // Create clip path for openings (doors/windows cut through the wall)
  const clipId = `wall-clip-${x1}-${y1}-${x2}-${y2}`;
  const hasOpenings = openings.length > 0;

  return (
    <g className="wall">
      {hasOpenings && (
        <defs>
          <clipPath id={clipId}>
            {/* Full wall area */}
            <rect x={rx} y={ry} width={rw} height={rh} />
            {/* Subtract openings */}
            {openings.map((opening, i) => {
              const gapPadding = 1;
              if (isHorizontal) {
                return (
                  <rect
                    key={i}
                    x={opening.x - gapPadding}
                    y={ry - 1}
                    width={opening.width + gapPadding * 2}
                    height={rh + 2}
                    fill="black"
                  />
                );
              } else {
                return (
                  <rect
                    key={i}
                    x={rx - 1}
                    y={opening.y - gapPadding}
                    width={rw + 2}
                    height={opening.width + gapPadding * 2}
                    fill="black"
                  />
                );
              }
            })}
          </clipPath>
          {/* Inverted clip - only show wall where there are NO openings */}
          <mask id={`${clipId}-mask`}>
            <rect x={rx} y={ry} width={rw} height={rh} fill="white" />
            {openings.map((opening, i) => {
              if (isHorizontal) {
                return (
                  <rect
                    key={i}
                    x={opening.x}
                    y={ry - 1}
                    width={opening.width}
                    height={rh + 2}
                    fill="black"
                  />
                );
              } else {
                return (
                  <rect
                    key={i}
                    x={rx - 1}
                    y={opening.y}
                    width={rw + 2}
                    height={opening.width}
                    fill="black"
                  />
                );
              }
            })}
          </mask>
        </defs>
      )}

      {/* Wall fill */}
      <rect
        x={rx}
        y={ry}
        width={rw}
        height={rh}
        fill={color}
        mask={hasOpenings ? `url(#${clipId}-mask)` : undefined}
        className="wall__fill"
      />

      {/* Render openings */}
      {openings.map((opening, i) => (
        <Opening key={i} opening={opening} />
      ))}
    </g>
  );
}

export default Wall;
