import type { FloorPlan, Room, WallSide } from '../types/floor-plan';

export type ValidationSeverity = 'error' | 'warning';

export interface ValidationIssue {
  id: string;
  severity: ValidationSeverity;
  type: 'overlap' | 'duplicate-wall' | 'invalid-dimension';
  message: string;
  roomIds: string[];
  details?: {
    wallSide?: WallSide;
    overlapArea?: { x: number; y: number; width: number; height: number };
    wallPosition?: { x1: number; y1: number; x2: number; y2: number };
  };
}

interface RoomBounds {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface WallSegment {
  roomId: string;
  roomName: string;
  side: WallSide;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  exists: boolean;
}

/**
 * Get room bounding box
 */
function getRoomBounds(room: Room): RoomBounds {
  const width = Math.max(room.walls.north.length ?? 0, room.walls.south.length ?? 0);
  const height = Math.max(room.walls.east.length ?? 0, room.walls.west.length ?? 0);

  return {
    id: room.id,
    name: room.name ?? room.id,
    x: room.position.x,
    y: room.position.y,
    width,
    height,
  };
}

/**
 * Check if two rectangles overlap
 */
function rectanglesOverlap(
  r1: RoomBounds,
  r2: RoomBounds
): { x: number; y: number; width: number; height: number } | null {
  const x1 = Math.max(r1.x, r2.x);
  const y1 = Math.max(r1.y, r2.y);
  const x2 = Math.min(r1.x + r1.width, r2.x + r2.width);
  const y2 = Math.min(r1.y + r1.height, r2.y + r2.height);

  // Overlap exists if the intersection has positive area
  // We use a small threshold to allow walls to touch
  const threshold = 1; // 1 unit tolerance for touching walls
  if (x2 - x1 > threshold && y2 - y1 > threshold) {
    return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
  }

  return null;
}

/**
 * Get wall segment coordinates
 */
function getWallSegment(room: Room, side: WallSide): WallSegment {
  const bounds = getRoomBounds(room);
  const wall = room.walls[side];
  const exists = wall.exists !== false;

  let x1: number, y1: number, x2: number, y2: number;

  switch (side) {
    case 'north':
      x1 = bounds.x;
      y1 = bounds.y;
      x2 = bounds.x + bounds.width;
      y2 = bounds.y;
      break;
    case 'south':
      x1 = bounds.x;
      y1 = bounds.y + bounds.height;
      x2 = bounds.x + bounds.width;
      y2 = bounds.y + bounds.height;
      break;
    case 'east':
      x1 = bounds.x + bounds.width;
      y1 = bounds.y;
      x2 = bounds.x + bounds.width;
      y2 = bounds.y + bounds.height;
      break;
    case 'west':
      x1 = bounds.x;
      y1 = bounds.y;
      x2 = bounds.x;
      y2 = bounds.y + bounds.height;
      break;
  }

  return {
    roomId: room.id,
    roomName: room.name ?? room.id,
    side,
    x1,
    y1,
    x2,
    y2,
    exists,
  };
}

/**
 * Check if two wall segments overlap
 */
function wallsOverlap(w1: WallSegment, w2: WallSegment): boolean {
  // Both must be horizontal or both vertical
  const w1Horizontal = w1.y1 === w1.y2;
  const w2Horizontal = w2.y1 === w2.y2;

  if (w1Horizontal !== w2Horizontal) return false;

  const tolerance = 1;

  if (w1Horizontal) {
    // Horizontal walls - check if same Y and X ranges overlap
    if (Math.abs(w1.y1 - w2.y1) > tolerance) return false;

    const minX1 = Math.min(w1.x1, w1.x2);
    const maxX1 = Math.max(w1.x1, w1.x2);
    const minX2 = Math.min(w2.x1, w2.x2);
    const maxX2 = Math.max(w2.x1, w2.x2);

    const overlapStart = Math.max(minX1, minX2);
    const overlapEnd = Math.min(maxX1, maxX2);

    return overlapEnd - overlapStart > tolerance;
  } else {
    // Vertical walls - check if same X and Y ranges overlap
    if (Math.abs(w1.x1 - w2.x1) > tolerance) return false;

    const minY1 = Math.min(w1.y1, w1.y2);
    const maxY1 = Math.max(w1.y1, w1.y2);
    const minY2 = Math.min(w2.y1, w2.y2);
    const maxY2 = Math.max(w2.y1, w2.y2);

    const overlapStart = Math.max(minY1, minY2);
    const overlapEnd = Math.min(maxY1, maxY2);

    return overlapEnd - overlapStart > tolerance;
  }
}

/**
 * Detect room overlaps (conflicts)
 */
function detectOverlaps(rooms: Room[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const bounds = rooms.map(getRoomBounds);

  for (let i = 0; i < bounds.length; i++) {
    for (let j = i + 1; j < bounds.length; j++) {
      const overlap = rectanglesOverlap(bounds[i], bounds[j]);
      if (overlap) {
        issues.push({
          id: `overlap-${bounds[i].id}-${bounds[j].id}`,
          severity: 'error',
          type: 'overlap',
          message: `"${bounds[i].name}" sobrepõe "${bounds[j].name}"`,
          roomIds: [bounds[i].id, bounds[j].id],
          details: {
            overlapArea: overlap,
          },
        });
      }
    }
  }

  return issues;
}

/**
 * Detect duplicate walls (two walls occupying the same space)
 */
function detectDuplicateWalls(rooms: Room[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const walls: WallSegment[] = [];

  const sides: WallSide[] = ['north', 'east', 'south', 'west'];

  // Collect all wall segments
  for (const room of rooms) {
    for (const side of sides) {
      walls.push(getWallSegment(room, side));
    }
  }

  // Check for overlapping walls
  for (let i = 0; i < walls.length; i++) {
    for (let j = i + 1; j < walls.length; j++) {
      const w1 = walls[i];
      const w2 = walls[j];

      // Skip if same room
      if (w1.roomId === w2.roomId) continue;

      // Skip if at least one wall is virtual (user intentionally resolved the conflict)
      if (!w1.exists || !w2.exists) continue;

      if (wallsOverlap(w1, w2)) {
        // Both walls exist and overlap - this is a problem
        issues.push({
          id: `duplicate-wall-${w1.roomId}-${w1.side}-${w2.roomId}-${w2.side}`,
          severity: 'warning',
          type: 'duplicate-wall',
          message: `Parede dupla: "${w1.roomName}" (${w1.side}) e "${w2.roomName}" (${w2.side})`,
          roomIds: [w1.roomId, w2.roomId],
          details: {
            wallSide: w1.side,
            wallPosition: { x1: w1.x1, y1: w1.y1, x2: w1.x2, y2: w1.y2 },
          },
        });
      }
    }
  }

  return issues;
}

/**
 * Detect invalid dimensions
 */
function detectInvalidDimensions(rooms: Room[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const room of rooms) {
    const bounds = getRoomBounds(room);

    if (bounds.width <= 0 || bounds.height <= 0) {
      issues.push({
        id: `invalid-dimension-${room.id}`,
        severity: 'error',
        type: 'invalid-dimension',
        message: `"${bounds.name}" tem dimensões inválidas`,
        roomIds: [room.id],
      });
    }
  }

  return issues;
}

/**
 * Validate floor plan and return all issues
 */
export function validateFloorPlan(floorPlan: FloorPlan): ValidationIssue[] {
  const rooms = floorPlan.floor.rooms;

  if (rooms.length === 0) return [];

  const issues: ValidationIssue[] = [
    ...detectInvalidDimensions(rooms),
    ...detectOverlaps(rooms),
    ...detectDuplicateWalls(rooms),
  ];

  return issues;
}

/**
 * Get rooms involved in errors (for highlighting)
 */
export function getRoomsWithErrors(issues: ValidationIssue[]): Set<string> {
  const roomIds = new Set<string>();

  for (const issue of issues) {
    if (issue.severity === 'error') {
      for (const id of issue.roomIds) {
        roomIds.add(id);
      }
    }
  }

  return roomIds;
}

/**
 * Get overlap areas for visualization
 */
export function getOverlapAreas(
  issues: ValidationIssue[]
): Array<{ x: number; y: number; width: number; height: number }> {
  return issues
    .filter((issue) => issue.type === 'overlap' && issue.details?.overlapArea)
    .map((issue) => issue.details!.overlapArea!);
}

/**
 * Get duplicate wall positions for visualization
 */
export function getDuplicateWalls(
  issues: ValidationIssue[]
): Array<{ x1: number; y1: number; x2: number; y2: number }> {
  return issues
    .filter((issue) => issue.type === 'duplicate-wall' && issue.details?.wallPosition)
    .map((issue) => issue.details!.wallPosition!);
}
