/**
 * Floor Plan Type Definitions
 * Defines the structure for house floor plans with rooms, walls, and openings
 */

export type Unit = 'cm' | 'mm' | 'm';

export type WallSide = 'north' | 'east' | 'south' | 'west';

// ============================================
// Material Types
// ============================================

export type FloorMaterialType = 
  | 'wood-light' 
  | 'wood-dark' 
  | 'wood-parquet'
  | 'tile-white' 
  | 'tile-gray' 
  | 'tile-beige'
  | 'marble-white'
  | 'marble-black'
  | 'concrete'
  | 'ceramic-blue'
  | 'ceramic-green'
  | 'custom';

export type WallMaterialType = 
  | 'paint-white'
  | 'paint-cream'
  | 'paint-gray'
  | 'paint-blue'
  | 'paint-green'
  | 'texture-plaster'
  | 'brick-red'
  | 'brick-white'
  | 'tile-white'
  | 'tile-subway'
  | 'custom';

export type CeilingMaterialType = 
  | 'paint-white'
  | 'paint-cream'
  | 'gesso'
  | 'wood'
  | 'custom';

export interface MaterialConfig {
  type: string;
  color?: string;
  customTexture?: string; // Base64 or URL
}

export interface RoomMaterials {
  floor?: MaterialConfig & { type: FloorMaterialType };
  walls?: MaterialConfig & { type: WallMaterialType };
  ceiling?: MaterialConfig & { type: CeilingMaterialType };
}

export type OpeningType = 'door' | 'window';

export type ElementType = 'pillar' | 'stair' | 'counter' | 'fixture';

export type StairDirection = 'up-north' | 'up-south' | 'up-east' | 'up-west';

export interface Position {
  x: number;
  y: number;
}

export interface Opening {
  type: OpeningType;
  /** Distance from wall start to opening start */
  offset: number;
  /** Opening width (overrides default) */
  width?: number;
  /** Opening height (overrides default) */
  height?: number;
  /** Height from floor (for windows) */
  fromFloor?: number;
  /** ID of room this opening leads to */
  to?: string;
}

export interface Wall {
  /** Wall length in units */
  length?: number;
  /** Wall height (overrides default) */
  height?: number;
  /** Wall thickness (overrides default) */
  thickness?: number;
  /** If false, wall is virtual (logical boundary only) */
  exists?: boolean;
  /** Openings in this wall (doors, windows) */
  openings?: Opening[];
}

export interface Walls {
  north: Wall;
  east: Wall;
  south: Wall;
  west: Wall;
}

export interface Room {
  /** Unique identifier for the room */
  id: string;
  /** Display name for the room */
  name?: string;
  /** Top-left corner position of the room */
  position: Position;
  /** Walls defining the room boundaries */
  walls: Walls;
  /** Materials for floor, walls, ceiling */
  materials?: RoomMaterials;
}

export interface Element {
  type: ElementType;
  id: string;
  position: Position;
  width?: number;
  depth?: number;
  /** For stairs: total length */
  length?: number;
  /** For stairs: direction */
  direction?: StairDirection;
  /** For stairs: number of steps */
  steps?: number;
}

export interface Floor {
  /** Unique identifier for the floor */
  id: string;
  /** Display name for the floor */
  name?: string;
  /** Rooms on this floor */
  rooms: Room[];
  /** Additional structural elements */
  elements?: Element[];
}

export interface WallDefaults {
  height?: number;
  thickness?: number;
}

export interface DoorDefaults {
  width?: number;
  height?: number;
}

export interface WindowDefaults {
  width?: number;
  height?: number;
  fromFloor?: number;
}

export interface Defaults {
  wall?: WallDefaults;
  door?: DoorDefaults;
  window?: WindowDefaults;
}

export interface FloorPlan {
  $schema?: string;
  /** Schema version */
  version: string;
  /** Unit of measurement for all dimensions */
  unit: Unit;
  /** Conversion factor: 1 unit = scale pixels */
  scale?: number;
  /** Default values for walls and openings */
  defaults?: Defaults;
  /** Floor definition */
  floor: Floor;
}

/**
 * Helper type for resolved values (with defaults applied)
 */
export interface ResolvedWall extends Required<Omit<Wall, 'openings'>> {
  openings: Opening[];
}

export interface ResolvedRoom extends Omit<Room, 'walls'> {
  walls: {
    north: ResolvedWall;
    east: ResolvedWall;
    south: ResolvedWall;
    west: ResolvedWall;
  };
}
