import { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import type { FloorPlan } from '../types/floor-plan';
import { calculateFloorGeometry } from '../utils/floor-plan.utils';
import {
  validateFloorPlan,
  getOverlapAreas,
  getDuplicateWalls,
  type ValidationIssue,
} from '../utils/validation';
import { Room } from './Room';
import { Compass } from './Compass';
import { ZoomControls } from './ZoomControls';

interface FloorPlanViewerProps {
  floorPlan: FloorPlan;
  padding?: number;
  showLabels?: boolean;
  showCompass?: boolean;
  backgroundColor?: string;
  selectedRoomId?: string | null;
  onRoomClick?: (roomId: string) => void;
  onBackgroundClick?: () => void;
  onValidation?: (issues: ValidationIssue[]) => void;
}

/**
 * Main component for rendering a floor plan
 */
export function FloorPlanViewer({
  floorPlan,
  padding = 40,
  showLabels = true,
  showCompass = true,
  backgroundColor = '#fff',
  selectedRoomId,
  onRoomClick,
  onBackgroundClick,
  onValidation,
}: FloorPlanViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const lastPanPos = useRef({ x: 0, y: 0 });

  const geometry = useMemo(
    () => calculateFloorGeometry(floorPlan),
    [floorPlan]
  );

  // Validate and get issues
  const validationIssues = useMemo(
    () => validateFloorPlan(floorPlan),
    [floorPlan]
  );

  // Notify parent of validation changes (in useEffect to avoid setState during render)
  useEffect(() => {
    onValidation?.(validationIssues);
  }, [validationIssues, onValidation]);

  const overlapAreas = useMemo(
    () => getOverlapAreas(validationIssues),
    [validationIssues]
  );

  const duplicateWalls = useMemo(
    () => getDuplicateWalls(validationIssues),
    [validationIssues]
  );

  const roomsWithErrors = useMemo(() => {
    const ids = new Set<string>();
    for (const issue of validationIssues) {
      if (issue.severity === 'error') {
        for (const id of issue.roomIds) {
          ids.add(id);
        }
      }
    }
    return ids;
  }, [validationIssues]);

  const scale = floorPlan.scale ?? 0.2;
  
  // Content dimensions (in scaled units)
  const contentWidth = geometry.width;
  const contentHeight = geometry.height;
  
  // ViewBox dimensions with padding
  const viewBoxWidth = Math.max(contentWidth + padding * 2, 100);
  const viewBoxHeight = Math.max(contentHeight + padding * 2, 100);

  // Zoom controls
  const zoomIn = useCallback(() => {
    setZoom(z => Math.min(z * 1.25, 4));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom(z => Math.max(z / 1.25, 0.25));
  }, []);

  const resetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const fitToView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Mouse wheel zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(z => Math.min(Math.max(z * delta, 0.25), 4));
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      setIsPanning(true);
      lastPanPos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    const dx = e.clientX - lastPanPos.current.x;
    const dy = e.clientY - lastPanPos.current.y;
    // Adjust pan based on current zoom
    setPan(p => ({ 
      x: p.x + dx / zoom, 
      y: p.y + dy / zoom 
    }));
    lastPanPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleMouseLeave = () => {
    setIsPanning(false);
  };

  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.altKey || isPanning) return;
    onBackgroundClick?.();
  };

  // Calculate viewBox based on zoom and pan
  const zoomedWidth = viewBoxWidth / zoom;
  const zoomedHeight = viewBoxHeight / zoom;
  const viewBoxX = -padding + (viewBoxWidth - zoomedWidth) / 2 - pan.x;
  const viewBoxY = -padding + (viewBoxHeight - zoomedHeight) / 2 - pan.y;

  return (
    <div
      className="floor-plan-viewer"
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      style={{ cursor: isPanning ? 'grabbing' : 'default' }}
    >
      <ZoomControls
        scale={zoom}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onReset={resetZoom}
        onFit={fitToView}
      />

      <svg
        className="floor-plan-svg"
        viewBox={`${viewBoxX} ${viewBoxY} ${zoomedWidth} ${zoomedHeight}`}
        preserveAspectRatio="xMidYMid meet"
        onClick={handleBackgroundClick}
        style={{ backgroundColor }}
      >
        {/* Definitions */}
        <defs>
          <pattern
            id="grid"
            width={10}
            height={10}
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 10 0 L 0 0 0 10"
              fill="none"
              stroke="#e0e0e0"
              strokeWidth="0.5"
            />
          </pattern>
          <pattern
            id="overlap-pattern"
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line x1="0" y1="0" x2="0" y2="8" stroke="#d32f2f" strokeWidth="2" />
          </pattern>
        </defs>

        {/* Background grid - large area to cover pan */}
        <rect
          x={-1000}
          y={-1000}
          width={viewBoxWidth + 2000}
          height={viewBoxHeight + 2000}
          fill="url(#grid)"
        />

        {/* Empty state */}
        {geometry.rooms.length === 0 && (
          <text
            x={contentWidth / 2}
            y={contentHeight / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={14}
            fill="#999"
          >
            Clique em "+ Novo Cômodo" para começar
          </text>
        )}

        {/* Rooms */}
        <g className="floor-plan-rooms">
          {geometry.rooms.map((room) => (
            <Room
              key={room.id}
              room={room}
              showLabel={showLabels}
              isSelected={room.id === selectedRoomId}
              hasError={roomsWithErrors.has(room.id)}
              onClick={onRoomClick}
            />
          ))}
        </g>

        {/* Overlaps */}
        {overlapAreas.length > 0 && (
          <g className="floor-plan-overlaps">
            {overlapAreas.map((area, i) => (
              <rect
                key={`overlap-${i}`}
                x={area.x * scale}
                y={area.y * scale}
                width={area.width * scale}
                height={area.height * scale}
                fill="url(#overlap-pattern)"
                fillOpacity={0.5}
                stroke="#d32f2f"
                strokeWidth={1}
                strokeDasharray="4,2"
              />
            ))}
          </g>
        )}

        {/* Duplicate walls */}
        {duplicateWalls.length > 0 && (
          <g className="floor-plan-duplicate-walls">
            {duplicateWalls.map((wall, i) => (
              <line
                key={`dup-wall-${i}`}
                x1={wall.x1 * scale}
                y1={wall.y1 * scale}
                x2={wall.x2 * scale}
                y2={wall.y2 * scale}
                stroke="#ff9800"
                strokeWidth={4}
                strokeLinecap="round"
                opacity={0.7}
              />
            ))}
          </g>
        )}

        {/* Scale indicator */}
        {geometry.rooms.length > 0 && (
          <g className="scale-indicator" transform={`translate(5, ${contentHeight + 15})`}>
            <line x1={0} y1={0} x2={20} y2={0} stroke="#333" strokeWidth={1} />
            <line x1={0} y1={-3} x2={0} y2={3} stroke="#333" strokeWidth={1} />
            <line x1={20} y1={-3} x2={20} y2={3} stroke="#333" strokeWidth={1} />
            <text x={10} y={12} textAnchor="middle" fontSize={8} fill="#666">
              {Math.round(20 / scale)} {floorPlan.unit}
            </text>
          </g>
        )}
      </svg>

      {/* Compass Overlay */}
      {showCompass && (
        <div className="compass-overlay">
          <Compass size={48} />
        </div>
      )}
    </div>
  );
}

export default FloorPlanViewer;
