interface CompassProps {
  size?: number;
}

/**
 * Compass indicator showing cardinal directions
 */
export function Compass({ size = 40 }: CompassProps) {
  const center = size / 2;
  const radius = size * 0.4;
  
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="compass">
      {/* Circle Ring */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="white"
        fillOpacity="0.9"
        stroke="#e2e8f0"
        strokeWidth="1.5"
      />
      
      {/* North Arrow (Red) */}
      <path
        d={`M${center},${center - radius + 4} L${center - 4},${center} L${center + 4},${center} Z`}
        fill="#ef4444"
      />
      
      {/* South Arrow (Ghost) */}
      <path
        d={`M${center},${center + radius - 4} L${center - 4},${center} L${center + 4},${center} Z`}
        fill="#cbd5e1"
      />

      {/* East/West Ticks */}
      <line 
        x1={center - radius + 4} y1={center}
        x2={center + radius - 4} y2={center}
        stroke="#e2e8f0"
        strokeWidth="1"
      />

      {/* N Label */}
      <text
        x={center}
        y={center - radius - 2}
        textAnchor="middle"
        fontSize="10"
        fontWeight="700"
        fill="#64748b"
        fontFamily="system-ui, sans-serif"
      >
        N
      </text>
    </svg>
  );
}

export default Compass;
