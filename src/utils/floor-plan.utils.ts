import type {
  FloorPlan,
  Room,
  Wall,
  WallSide,
  Defaults,
  Opening,
} from '../types/floor-plan';

export interface WallGeometry {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  length: number;
  thickness: number;
  exists: boolean;
  openings: OpeningGeometry[];
}

export interface OpeningGeometry {
  type: 'door' | 'window';
  x: number;
  y: number;
  width: number;
  height: number;
  fromFloor: number;
  to?: string;
  /** Direction the opening faces (perpendicular to wall) */
  direction: WallSide;
}

export interface RoomGeometry {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  walls: Record<WallSide, WallGeometry>;
}

export interface FloorGeometry {
  width: number;
  height: number;
  rooms: RoomGeometry[];
}

const DEFAULT_WALL: Required<Pick<Wall, 'height' | 'thickness'>> = {
  height: 280,
  thickness: 15,
};

const DEFAULT_DOOR = {
  width: 80,
  height: 210,
};

const DEFAULT_WINDOW = {
  width: 120,
  height: 120,
  fromFloor: 100,
};

/**
 * Resolve wall values with defaults
 */
function resolveWall(wall: Wall, defaults?: Defaults): Required<Omit<Wall, 'openings'>> & { openings: Opening[] } {
  return {
    length: wall.length ?? 0,
    height: wall.height ?? defaults?.wall?.height ?? DEFAULT_WALL.height,
    thickness: wall.thickness ?? defaults?.wall?.thickness ?? DEFAULT_WALL.thickness,
    exists: wall.exists ?? true,
    openings: wall.openings ?? [],
  };
}

/**
 * Resolve opening values with defaults
 */
function resolveOpening(opening: Opening, defaults?: Defaults): Required<Omit<Opening, 'to'>> & { to?: string } {
  const isWindow = opening.type === 'window';
  const typeDefaults = isWindow ? defaults?.window ?? DEFAULT_WINDOW : defaults?.door ?? DEFAULT_DOOR;

  return {
    type: opening.type,
    offset: opening.offset,
    width: opening.width ?? typeDefaults.width ?? (isWindow ? DEFAULT_WINDOW.width : DEFAULT_DOOR.width),
    height: opening.height ?? typeDefaults.height ?? (isWindow ? DEFAULT_WINDOW.height : DEFAULT_DOOR.height),
    fromFloor: opening.fromFloor ?? (isWindow ? (defaults?.window?.fromFloor ?? DEFAULT_WINDOW.fromFloor) : 0),
    to: opening.to,
  };
}

/**
 * Calculate wall geometry based on room position and wall side
 */
function calculateWallGeometry(
  room: Room,
  side: WallSide,
  defaults?: Defaults,
  scale: number = 1
): WallGeometry {
  const wall = room.walls[side];
  const resolved = resolveWall(wall, defaults);
  const { x, y } = room.position;

  // Calculate room dimensions from wall lengths
  const roomWidth = Math.max(room.walls.north.length ?? 0, room.walls.south.length ?? 0);
  const roomHeight = Math.max(room.walls.east.length ?? 0, room.walls.west.length ?? 0);

  let x1: number, y1: number, x2: number, y2: number;

  switch (side) {
    case 'north':
      x1 = x * scale;
      y1 = y * scale;
      x2 = (x + roomWidth) * scale;
      y2 = y * scale;
      break;
    case 'south':
      x1 = x * scale;
      y1 = (y + roomHeight) * scale;
      x2 = (x + roomWidth) * scale;
      y2 = (y + roomHeight) * scale;
      break;
    case 'east':
      x1 = (x + roomWidth) * scale;
      y1 = y * scale;
      x2 = (x + roomWidth) * scale;
      y2 = (y + roomHeight) * scale;
      break;
    case 'west':
      x1 = x * scale;
      y1 = y * scale;
      x2 = x * scale;
      y2 = (y + roomHeight) * scale;
      break;
  }

  // Calculate openings geometry
  const openings: OpeningGeometry[] = resolved.openings.map((opening) => {
    const resolvedOpening = resolveOpening(opening, defaults);
    let ox: number, oy: number;

    switch (side) {
      case 'north':
        ox = (x + resolvedOpening.offset) * scale;
        oy = y * scale;
        break;
      case 'south':
        ox = (x + resolvedOpening.offset) * scale;
        oy = (y + roomHeight) * scale;
        break;
      case 'east':
        ox = (x + roomWidth) * scale;
        oy = (y + resolvedOpening.offset) * scale;
        break;
      case 'west':
        ox = x * scale;
        oy = (y + resolvedOpening.offset) * scale;
        break;
    }

    return {
      type: resolvedOpening.type,
      x: ox,
      y: oy,
      width: resolvedOpening.width * scale,
      height: resolvedOpening.height * scale,
      fromFloor: resolvedOpening.fromFloor * scale,
      to: resolvedOpening.to,
      direction: side,
    };
  });

  return {
    x1,
    y1,
    x2,
    y2,
    length: resolved.length * scale,
    thickness: resolved.thickness * scale,
    exists: resolved.exists,
    openings,
  };
}

/**
 * Calculate room geometry including all walls
 */
function calculateRoomGeometry(room: Room, defaults?: Defaults, scale: number = 1): RoomGeometry {
  const roomWidth = Math.max(room.walls.north.length ?? 0, room.walls.south.length ?? 0);
  const roomHeight = Math.max(room.walls.east.length ?? 0, room.walls.west.length ?? 0);

  return {
    id: room.id,
    name: room.name ?? room.id,
    x: room.position.x * scale,
    y: room.position.y * scale,
    width: roomWidth * scale,
    height: roomHeight * scale,
    walls: {
      north: calculateWallGeometry(room, 'north', defaults, scale),
      east: calculateWallGeometry(room, 'east', defaults, scale),
      south: calculateWallGeometry(room, 'south', defaults, scale),
      west: calculateWallGeometry(room, 'west', defaults, scale),
    },
  };
}

/**
 * Calculate full floor geometry from floor plan
 */
export function calculateFloorGeometry(floorPlan: FloorPlan): FloorGeometry {
  const scale = floorPlan.scale ?? 0.2;
  const rooms = floorPlan.floor.rooms.map((room) =>
    calculateRoomGeometry(room, floorPlan.defaults, scale)
  );

  // Calculate total dimensions
  let maxX = 0;
  let maxY = 0;

  rooms.forEach((room) => {
    maxX = Math.max(maxX, room.x + room.width);
    maxY = Math.max(maxY, room.y + room.height);
  });

  return {
    width: maxX,
    height: maxY,
    rooms,
  };
}

/**
 * Check if two walls overlap (for shared walls detection)
 */
export function wallsOverlap(w1: WallGeometry, w2: WallGeometry): boolean {
  // Horizontal walls
  if (w1.y1 === w1.y2 && w2.y1 === w2.y2 && w1.y1 === w2.y1) {
    const minX1 = Math.min(w1.x1, w1.x2);
    const maxX1 = Math.max(w1.x1, w1.x2);
    const minX2 = Math.min(w2.x1, w2.x2);
    const maxX2 = Math.max(w2.x1, w2.x2);
    return maxX1 > minX2 && maxX2 > minX1;
  }

  // Vertical walls
  if (w1.x1 === w1.x2 && w2.x1 === w2.x2 && w1.x1 === w2.x1) {
    const minY1 = Math.min(w1.y1, w1.y2);
    const maxY1 = Math.max(w1.y1, w1.y2);
    const minY2 = Math.min(w2.y1, w2.y2);
    const maxY2 = Math.max(w2.y1, w2.y2);
    return maxY1 > minY2 && maxY2 > minY1;
  }

  return false;
}
