import { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import type { FloorPlan, Furniture, Position } from '../types/floor-plan';
import { calculateFloorGeometry } from '../utils/floor-plan.utils';
import {
  validateFloorPlan,
  getOverlapAreas,
  getDuplicateWalls,
  type ValidationIssue,
} from '../utils/validation';
import { getFurnitureTemplate } from '../data/furniture-library';
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
  selectedFurnitureId?: string | null;
  onRoomClick?: (roomId: string) => void;
  onBackgroundClick?: () => void;
  onValidation?: (issues: ValidationIssue[]) => void;
  onFurnitureClick?: (furnitureId: string) => void;
  onFurnitureMove?: (furnitureId: string, position: Position) => void;
  onFurnitureRotate?: (furnitureId: string) => void;
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
  selectedFurnitureId,
  onRoomClick,
  onBackgroundClick,
  onValidation,
  onFurnitureClick,
  onFurnitureMove,
  onFurnitureRotate,
}: FloorPlanViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const lastPanPos = useRef({ x: 0, y: 0 });
  
  // Furniture drag state
  const [draggingFurnitureId, setDraggingFurnitureId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const clickedOnFurniture = useRef(false);

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

  // Convert screen coordinates to SVG coordinates
  const screenToSvg = useCallback((clientX: number, clientY: number): Position => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    return { x: svgP.x, y: svgP.y };
  }, []);

  // Furniture drag handlers
  const handleFurnitureMouseDown = useCallback((e: React.MouseEvent, furniture: Furniture) => {
    e.stopPropagation();
    e.preventDefault();
    if (e.button !== 0) return;
    
    // Mark that we clicked on furniture to prevent background click from clearing selection
    clickedOnFurniture.current = true;
    
    const svgPos = screenToSvg(e.clientX, e.clientY);
    const template = getFurnitureTemplate(furniture.templateId);
    if (!template) return;

    // Calculate offset from furniture position to click position
    const furnitureX = furniture.position.x * scale;
    const furnitureY = furniture.position.y * scale;
    
    setDragOffset({
      x: svgPos.x - furnitureX,
      y: svgPos.y - furnitureY,
    });
    setDraggingFurnitureId(furniture.id);
    onFurnitureClick?.(furniture.id);
  }, [screenToSvg, scale, onFurnitureClick]);

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      setIsPanning(true);
      lastPanPos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Handle furniture dragging
    if (draggingFurnitureId) {
      const svgPos = screenToSvg(e.clientX, e.clientY);
      const newX = (svgPos.x - dragOffset.x) / scale;
      const newY = (svgPos.y - dragOffset.y) / scale;
      onFurnitureMove?.(draggingFurnitureId, { x: newX, y: newY });
      return;
    }
    
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
    setDraggingFurnitureId(null);
    // Reset click flag after a small delay to allow click event to fire first
    setTimeout(() => {
      clickedOnFurniture.current = false;
    }, 10);
  };

  const handleMouseLeave = () => {
    setIsPanning(false);
    setDraggingFurnitureId(null);
    clickedOnFurniture.current = false;
  };
  
  // Keyboard handler for rotation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        if (selectedFurnitureId) {
          onFurnitureRotate?.(selectedFurnitureId);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFurnitureId, onFurnitureRotate]);

  const handleBackgroundClick = (e: React.MouseEvent) => {
    // If we clicked on furniture, don't clear the selection
    if (clickedOnFurniture.current) {
      clickedOnFurniture.current = false;
      return;
    }
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
        ref={svgRef}
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
          {/* Pool water pattern */}
          <pattern
            id="water-pattern"
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
          >
            <rect width="8" height="8" fill="#06b6d4" />
            <path
              d="M 0 4 Q 2 2, 4 4 T 8 4"
              fill="none"
              stroke="#0891b2"
              strokeWidth="0.5"
              opacity="0.5"
            />
          </pattern>
          {/* Stair pattern */}
          <pattern
            id="stair-pattern"
            width="4"
            height="12"
            patternUnits="userSpaceOnUse"
          >
            <rect width="4" height="12" fill="#8B7355" />
            <line x1="0" y1="0" x2="4" y2="0" stroke="#6B5344" strokeWidth="1" />
          </pattern>
          {/* Deck pattern */}
          <pattern
            id="deck-pattern"
            width="20"
            height="4"
            patternUnits="userSpaceOnUse"
          >
            <rect width="20" height="4" fill="#a16207" />
            <line x1="0" y1="2" x2="20" y2="2" stroke="#854d0e" strokeWidth="0.5" />
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

        {/* Furniture */}
        <g className="floor-plan-furniture">
          {(floorPlan.floor.furniture ?? []).map((furniture) => {
            const template = getFurnitureTemplate(furniture.templateId);
            if (!template) return null;
            
            const width = (furniture.width ?? template.width) * scale;
            const depth = (furniture.depth ?? template.depth) * scale;
            const x = furniture.position.x * scale;
            const y = furniture.position.y * scale;
            const rotation = furniture.rotation;
            const color = furniture.color ?? template.color;
            const isSelected = furniture.id === selectedFurnitureId;
            const isDragging = furniture.id === draggingFurnitureId;
            const isWallMounted = template.wallMounted || (furniture.elevation ?? template.elevation ?? 0) > 0;
            const structuralType = template.structuralType;
            
            // For rotation, we rotate around the center of the furniture
            const centerX = x + width / 2;
            const centerY = y + depth / 2;
            
            // Determine fill based on structural type
            let fill = color;
            let fillOpacity = isWallMounted ? 0.6 : 0.8;
            let strokeColor = isSelected ? '#2196f3' : isWallMounted ? '#9333ea' : '#666';
            
            if (structuralType === 'pool') {
              fill = 'url(#water-pattern)';
              fillOpacity = 0.9;
              strokeColor = isSelected ? '#2196f3' : '#0891b2';
            } else if (structuralType === 'stair') {
              fill = 'url(#stair-pattern)';
              fillOpacity = 1;
              strokeColor = isSelected ? '#2196f3' : '#5d4e3a';
            } else if (structuralType === 'deck') {
              fill = 'url(#deck-pattern)';
              fillOpacity = 1;
              strokeColor = isSelected ? '#2196f3' : '#854d0e';
            }
            
            return (
              <g
                key={furniture.id}
                className={`furniture-item-svg ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''} ${isWallMounted ? 'wall-mounted' : ''} ${structuralType ? `structural-${structuralType}` : ''}`}
                transform={`rotate(${rotation} ${centerX} ${centerY})`}
                onMouseDown={(e) => handleFurnitureMouseDown(e, furniture)}
                style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
              >
                {/* Furniture/Structural shape */}
                <rect
                  x={x}
                  y={y}
                  width={width}
                  height={depth}
                  fill={fill}
                  fillOpacity={fillOpacity}
                  stroke={strokeColor}
                  strokeWidth={isSelected ? 2 : 1}
                  strokeDasharray={isWallMounted ? '4,2' : 'none'}
                  rx={structuralType === 'pool' ? Math.min(width, depth) * 0.05 : 2}
                  ry={structuralType === 'pool' ? Math.min(width, depth) * 0.05 : 2}
                />
                
                {/* Stair steps indicator lines */}
                {structuralType === 'stair' && (
                  <>
                    {Array.from({ length: Math.floor(depth / 12) }).map((_, i) => (
                      <line
                        key={i}
                        x1={x + 2}
                        y1={y + i * 12 + 6}
                        x2={x + width - 2}
                        y2={y + i * 12 + 6}
                        stroke="#5d4e3a"
                        strokeWidth={0.5}
                      />
                    ))}
                    {/* Arrow indicating direction */}
                    <polygon
                      points={`${x + width / 2},${y + 4} ${x + width / 2 - 6},${y + 14} ${x + width / 2 + 6},${y + 14}`}
                      fill="#fff"
                      fillOpacity={0.8}
                    />
                  </>
                )}
                
                {/* Pool inner edge */}
                {structuralType === 'pool' && (() => {
                  const borderWidth = (furniture.borderWidth ?? template.borderWidth ?? 20) * scale;
                  return (
                    <rect
                      x={x + borderWidth}
                      y={y + borderWidth}
                      width={width - borderWidth * 2}
                      height={depth - borderWidth * 2}
                      fill="none"
                      stroke="#fff"
                      strokeWidth={1}
                      strokeOpacity={0.3}
                      rx={Math.min(width, depth) * 0.03}
                      ry={Math.min(width, depth) * 0.03}
                    />
                  );
                })()}
                
                {/* Direction indicator (small triangle on "front") - not for pools */}
                {structuralType !== 'pool' && structuralType !== 'stair' && (
                  <polygon
                    points={`${x + width / 2 - 4},${y + 2} ${x + width / 2 + 4},${y + 2} ${x + width / 2},${y + 8}`}
                    fill="#fff"
                    fillOpacity={0.6}
                  />
                )}
                
                {/* Label */}
                {showLabels && (
                  <text
                    x={x + width / 2}
                    y={y + depth / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={Math.min(width, depth) * 0.2}
                    fill={structuralType === 'pool' ? '#fff' : '#fff'}
                    style={{ 
                      pointerEvents: 'none',
                      textShadow: '0 1px 3px rgba(0,0,0,0.7)',
                      fontWeight: 500,
                    }}
                  >
                    {template.icon}
                  </text>
                )}
                
                {/* Selection handles */}
                {isSelected && (
                  <>
                    <rect
                      x={x - 4}
                      y={y - 4}
                      width={8}
                      height={8}
                      fill="#2196f3"
                      stroke="#fff"
                      strokeWidth={1}
                    />
                    <rect
                      x={x + width - 4}
                      y={y - 4}
                      width={8}
                      height={8}
                      fill="#2196f3"
                      stroke="#fff"
                      strokeWidth={1}
                    />
                    <rect
                      x={x - 4}
                      y={y + depth - 4}
                      width={8}
                      height={8}
                      fill="#2196f3"
                      stroke="#fff"
                      strokeWidth={1}
                    />
                    <rect
                      x={x + width - 4}
                      y={y + depth - 4}
                      width={8}
                      height={8}
                      fill="#2196f3"
                      stroke="#fff"
                      strokeWidth={1}
                    />
                  </>
                )}
              </g>
            );
          })}
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
