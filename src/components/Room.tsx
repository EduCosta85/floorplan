import type { RoomGeometry } from '../utils/floor-plan.utils';
import { Wall } from './Wall';

interface RoomProps {
  room: RoomGeometry;
  showLabel?: boolean;
  fillColor?: string;
  wallColor?: string;
  isSelected?: boolean;
  hasError?: boolean;
  onClick?: (roomId: string) => void;
}

/**
 * Renders a room with its walls and label
 */
export function Room({
  room,
  showLabel = true,
  fillColor = '#ffffff',
  wallColor = '#334155', // Slate 700
  isSelected = false,
  hasError = false,
  onClick,
}: RoomProps) {
  const { id, name, x, y, width, height, walls } = room;

  // Calculate label position (center of room)
  const labelX = x + width / 2;
  const labelY = y + height / 2;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.(id);
  };

  // Determine colors based on state
  let computedFillColor = fillColor;
  let computedWallColor = wallColor;
  let computedLabelColor = '#64748b'; // Slate 500
  let labelWeight = 500;

  if (hasError) {
    computedFillColor = '#fff1f2'; // Rose 50
    computedWallColor = '#be123c'; // Rose 700
    computedLabelColor = '#be123c';
  }

  if (isSelected) {
    computedFillColor = hasError ? '#ffe4e6' : '#f1f5f9'; // Slate 100
    computedWallColor = hasError ? '#9f1239' : '#0f172a'; // Slate 900
    computedLabelColor = hasError ? '#9f1239' : '#0f172a';
    labelWeight = 700;
  }

  const className = [
    'room',
    isSelected && 'room--selected',
    hasError && 'room--error',
  ].filter(Boolean).join(' ');

  return (
    <g
      className={className}
      data-room-id={id}
      onClick={handleClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {/* Room floor fill */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={computedFillColor}
        className="room__floor"
      />

      {/* Error highlight */}
      {hasError && !isSelected && (
        <rect
          x={x - 1}
          y={y - 1}
          width={width + 2}
          height={height + 2}
          fill="none"
          stroke="#d32f2f"
          strokeWidth={1.5}
          strokeDasharray="6,3"
          className="room__error-highlight"
        />
      )}

      {/* Selection highlight */}
      {isSelected && (
        <rect
          x={x - 2}
          y={y - 2}
          width={width + 4}
          height={height + 4}
          fill="none"
          stroke={hasError ? '#e11d48' : '#3b82f6'} // Blue 500 for selection
          strokeWidth={2}
          strokeDasharray="4,2"
          className="room__selection"
        />
      )}

      {/* Walls */}
      <Wall wall={walls.north} color={computedWallColor} />
      <Wall wall={walls.east} color={computedWallColor} />
      <Wall wall={walls.south} color={computedWallColor} />
      <Wall wall={walls.west} color={computedWallColor} />

      {/* Room label */}
      {showLabel && (
        <text
          x={labelX}
          y={labelY}
          textAnchor="middle"
          dominantBaseline="middle"
          className="room__label"
          fontSize={Math.min(width, height) * 0.15}
          fill={computedLabelColor}
          fontWeight={labelWeight}
        >
          {name}
        </text>
      )}
    </g>
  );
}

export default Room;
