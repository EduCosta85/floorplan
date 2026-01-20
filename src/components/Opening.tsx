import type { OpeningGeometry } from '../utils/floor-plan.utils';

interface OpeningProps {
  opening: OpeningGeometry;
}

/**
 * Renders a door or window symbol on a wall
 */
export function Opening({ opening }: OpeningProps) {
  const { type, x, y, width, direction } = opening;

  const isHorizontal = direction === 'north' || direction === 'south';

  if (type === 'door') {
    return <Door x={x} y={y} width={width} isHorizontal={isHorizontal} direction={direction} />;
  }

  return <Window x={x} y={y} width={width} isHorizontal={isHorizontal} />;
}

interface DoorProps {
  x: number;
  y: number;
  width: number;
  isHorizontal: boolean;
  direction: string;
}

/**
 * Door symbol: gap in wall + arc showing swing direction
 */
function Door({ x, y, width, isHorizontal, direction }: DoorProps) {
  const arcRadius = width;

  // Calculate arc path based on wall direction
  let arcPath: string;
  let arcStartX: number, arcStartY: number;

  if (isHorizontal) {
    // Door on north or south wall
    const swingDown = direction === 'north';
    arcStartX = x;
    arcStartY = y;

    if (swingDown) {
      arcPath = `M ${arcStartX} ${arcStartY} A ${arcRadius} ${arcRadius} 0 0 1 ${arcStartX + width} ${arcStartY}`;
    } else {
      arcPath = `M ${arcStartX} ${arcStartY} A ${arcRadius} ${arcRadius} 0 0 0 ${arcStartX + width} ${arcStartY}`;
    }
  } else {
    // Door on east or west wall
    const swingRight = direction === 'west';
    arcStartX = x;
    arcStartY = y;

    if (swingRight) {
      arcPath = `M ${arcStartX} ${arcStartY} A ${arcRadius} ${arcRadius} 0 0 1 ${arcStartX} ${arcStartY + width}`;
    } else {
      arcPath = `M ${arcStartX} ${arcStartY} A ${arcRadius} ${arcRadius} 0 0 0 ${arcStartX} ${arcStartY + width}`;
    }
  }

  return (
    <g className="opening door">
      {/* Door swing arc */}
      <path
        d={arcPath}
        fill="none"
        stroke="#666"
        strokeWidth={0.5}
        strokeDasharray="2,2"
      />
      {/* Door line (the door itself) */}
      {isHorizontal ? (
        <line
          x1={x}
          y1={y}
          x2={x + width}
          y2={y + (direction === 'north' ? width * 0.3 : -width * 0.3)}
          stroke="#333"
          strokeWidth={1.5}
        />
      ) : (
        <line
          x1={x}
          y1={y}
          x2={x + (direction === 'west' ? width * 0.3 : -width * 0.3)}
          y2={y + width}
          stroke="#333"
          strokeWidth={1.5}
        />
      )}
    </g>
  );
}

interface WindowProps {
  x: number;
  y: number;
  width: number;
  isHorizontal: boolean;
}

/**
 * Window symbol: parallel lines showing glass
 */
function Window({ x, y, width, isHorizontal }: WindowProps) {
  const glassOffset = 1.5; // Distance between glass lines

  if (isHorizontal) {
    return (
      <g className="opening window">
        {/* Window frame */}
        <line x1={x} y1={y - glassOffset} x2={x + width} y2={y - glassOffset} stroke="#4a90d9" strokeWidth={1} />
        <line x1={x} y1={y + glassOffset} x2={x + width} y2={y + glassOffset} stroke="#4a90d9" strokeWidth={1} />
        {/* Glass fill */}
        <rect
          x={x}
          y={y - glassOffset}
          width={width}
          height={glassOffset * 2}
          fill="#a8d4ff"
          fillOpacity={0.3}
        />
      </g>
    );
  }

  return (
    <g className="opening window">
      {/* Window frame */}
      <line x1={x - glassOffset} y1={y} x2={x - glassOffset} y2={y + width} stroke="#4a90d9" strokeWidth={1} />
      <line x1={x + glassOffset} y1={y} x2={x + glassOffset} y2={y + width} stroke="#4a90d9" strokeWidth={1} />
      {/* Glass fill */}
      <rect
        x={x - glassOffset}
        y={y}
        width={glassOffset * 2}
        height={width}
        fill="#a8d4ff"
        fillOpacity={0.3}
      />
    </g>
  );
}

export default Opening;
