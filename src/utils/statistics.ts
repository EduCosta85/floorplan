import type { FloorPlan, Room, Wall, WallSide, Defaults } from '../types/floor-plan';
import type { EstimateConfig } from '../types/estimate-config';
import { DEFAULT_ESTIMATE_CONFIG } from '../types/estimate-config';

// ============================================
// Types
// ============================================

export interface WallStats {
  side: WallSide;
  length: number; // cm
  height: number; // cm
  thickness: number; // cm
  area: number; // m²
  areaWithoutOpenings: number; // m²
  openingsArea: number; // m²
  brickCount: number;
  exists: boolean;
}

export interface RoomStats {
  id: string;
  name: string;
  type: string; // tipo do cômodo para estimativas
  floorArea: number; // m²
  perimeter: number; // m
  wallsArea: number; // m² (todas as paredes)
  wallsAreaWithoutOpenings: number; // m²
  volume: number; // m³
  walls: WallStats[];
  brickCount: number;
}

export interface MeasurementsStats {
  totalFloorArea: number; // m²
  totalWallsArea: number; // m²
  totalWallsAreaWithoutOpenings: number; // m²
  totalVolume: number; // m³
  totalPerimeter: number; // m
  roomCount: number;
  rooms: RoomStats[];
}

export interface MasonryMaterials {
  bricks: number; // unidades
  mortar: number; // m³
}

export interface PaintMaterials {
  paint: number; // litros (para paredes)
  primer: number; // litros (selador)
  putty: number; // kg (massa corrida)
  ceilingPaint: number; // litros (para teto)
  paintableWallArea: number; // m²
  ceilingArea: number; // m²
}

export interface FlooringMaterials {
  tiles: number; // m² (com perda)
  grout: number; // kg
  adhesive: number; // kg
  netArea: number; // m² (área líquida)
}

export interface ElectricalMaterials {
  outlets: number;
  switches: number;
  lightPoints: number;
  wireEstimate: number; // metros
  byRoom: Array<{
    roomName: string;
    outlets: number;
    switches: number;
    lights: number;
  }>;
}

export interface PlumbingMaterials {
  coldWaterPoints: number;
  hotWaterPoints: number;
  drainPoints: number;
  pipeEstimate: number; // metros
  byRoom: Array<{
    roomName: string;
    coldWater: number;
    hotWater: number;
    drains: number;
  }>;
}

export interface MaterialsEstimate {
  masonry: MasonryMaterials;
  paint: PaintMaterials;
  flooring: FlooringMaterials;
  electrical: ElectricalMaterials;
  plumbing: PlumbingMaterials;
}

export interface BudgetItem {
  category: string;
  item: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export interface BudgetEstimate {
  items: BudgetItem[];
  subtotals: {
    masonry: number;
    paint: number;
    flooring: number;
    electrical: number;
    plumbing: number;
  };
  total: number;
  perM2: number;
}

export interface FloorPlanStats {
  measurements: MeasurementsStats;
  materials: MaterialsEstimate;
  budget: BudgetEstimate;
}

// ============================================
// Helper Functions
// ============================================

function getWallDefaults(defaults?: Defaults): { height: number; thickness: number } {
  return {
    height: defaults?.wall?.height ?? 280,
    thickness: defaults?.wall?.thickness ?? 15,
  };
}

function getOpeningDefaults(type: 'door' | 'window', defaults?: Defaults): { width: number; height: number } {
  if (type === 'door') {
    return {
      width: defaults?.door?.width ?? 80,
      height: defaults?.door?.height ?? 210,
    };
  }
  return {
    width: defaults?.window?.width ?? 120,
    height: defaults?.window?.height ?? 120,
  };
}

function calculateOpeningsArea(wall: Wall, defaults?: Defaults): number {
  if (!wall.openings || wall.openings.length === 0) return 0;

  return wall.openings.reduce((total, opening) => {
    const openingDefaults = getOpeningDefaults(opening.type, defaults);
    const width = opening.width ?? openingDefaults.width;
    const height = opening.height ?? openingDefaults.height;
    return total + (width * height);
  }, 0);
}

function calculateBrickCount(areaCm2: number, config: EstimateConfig): number {
  const brickWithMortar = {
    width: config.brick.width + config.brick.mortarThickness,
    height: config.brick.height + config.brick.mortarThickness,
  };
  const brickArea = brickWithMortar.width * brickWithMortar.height;
  return Math.ceil((areaCm2 / brickArea) * config.brick.wasteFactor);
}

function cm2ToM2(cm2: number): number {
  return cm2 / 10000;
}

function cmToM(cm: number): number {
  return cm / 100;
}

function getRoomType(room: Room): string {
  const id = room.id.toLowerCase();
  const name = (room.name ?? '').toLowerCase();
  
  if (id.includes('sala') || name.includes('sala')) return 'sala';
  if (id.includes('cozinha') || name.includes('cozinha')) return 'cozinha';
  if (id.includes('banheiro') || name.includes('banheiro') || name.includes('wc')) return 'banheiro';
  if (id.includes('quarto') || name.includes('quarto') || name.includes('dormit')) return 'quarto';
  if (id.includes('servico') || name.includes('servico') || name.includes('lavanderia')) return 'area-servico';
  return 'default';
}

// ============================================
// Calculation Functions
// ============================================

function calculateWallStats(wall: Wall, side: WallSide, defaults: Defaults | undefined, config: EstimateConfig): WallStats {
  const wallDefaults = getWallDefaults(defaults);
  
  const length = wall.length ?? 0;
  const height = wall.height ?? wallDefaults.height;
  const thickness = wall.thickness ?? wallDefaults.thickness;
  const exists = wall.exists !== false;
  
  const areaCm2 = length * height;
  const openingsAreaCm2 = calculateOpeningsArea(wall, defaults);
  const areaWithoutOpeningsCm2 = Math.max(0, areaCm2 - openingsAreaCm2);
  
  const brickCount = exists ? calculateBrickCount(areaWithoutOpeningsCm2, config) : 0;
  
  return {
    side,
    length,
    height,
    thickness,
    area: cm2ToM2(areaCm2),
    areaWithoutOpenings: cm2ToM2(areaWithoutOpeningsCm2),
    openingsArea: cm2ToM2(openingsAreaCm2),
    brickCount,
    exists,
  };
}

function calculateRoomStats(room: Room, defaults: Defaults | undefined, config: EstimateConfig): RoomStats {
  const wallDefaults = getWallDefaults(defaults);
  
  const width = Math.max(room.walls.north.length ?? 0, room.walls.south.length ?? 0);
  const height = Math.max(room.walls.east.length ?? 0, room.walls.west.length ?? 0);
  const wallHeight = wallDefaults.height;
  
  const floorAreaCm2 = width * height;
  const floorArea = cm2ToM2(floorAreaCm2);
  
  const sides: WallSide[] = ['north', 'east', 'south', 'west'];
  let perimeterCm = 0;
  sides.forEach(side => {
    if (room.walls[side].exists !== false) {
      perimeterCm += room.walls[side].length ?? 0;
    }
  });
  const perimeter = cmToM(perimeterCm);
  
  const walls = sides.map(side => calculateWallStats(room.walls[side], side, defaults, config));
  
  const wallsArea = walls
    .filter(w => w.exists)
    .reduce((sum, w) => sum + w.area, 0);
  
  const wallsAreaWithoutOpenings = walls
    .filter(w => w.exists)
    .reduce((sum, w) => sum + w.areaWithoutOpenings, 0);
  
  const volumeCm3 = floorAreaCm2 * wallHeight;
  const volume = volumeCm3 / 1000000;
  
  const brickCount = walls.reduce((sum, w) => sum + w.brickCount, 0);
  
  return {
    id: room.id,
    name: room.name ?? room.id,
    type: getRoomType(room),
    floorArea,
    perimeter,
    wallsArea,
    wallsAreaWithoutOpenings,
    volume,
    walls,
    brickCount,
  };
}

function calculateMeasurements(rooms: RoomStats[]): MeasurementsStats {
  return {
    totalFloorArea: rooms.reduce((sum, r) => sum + r.floorArea, 0),
    totalWallsArea: rooms.reduce((sum, r) => sum + r.wallsArea, 0),
    totalWallsAreaWithoutOpenings: rooms.reduce((sum, r) => sum + r.wallsAreaWithoutOpenings, 0),
    totalVolume: rooms.reduce((sum, r) => sum + r.volume, 0),
    totalPerimeter: rooms.reduce((sum, r) => sum + r.perimeter, 0),
    roomCount: rooms.length,
    rooms,
  };
}

function calculateMasonry(measurements: MeasurementsStats): MasonryMaterials {
  const bricks = measurements.rooms.reduce((sum, r) => sum + r.brickCount, 0);
  // ~0.25m³ of mortar per 1000 bricks
  const mortarPer1000 = 0.25;
  const mortar = (bricks / 1000) * mortarPer1000;
  
  return { bricks, mortar };
}

function calculatePaint(measurements: MeasurementsStats, config: EstimateConfig): PaintMaterials {
  // Paredes: área sem aberturas, considerando paredes internas compartilhadas (x1.5)
  const paintableWallArea = measurements.totalWallsAreaWithoutOpenings * 1.5;
  
  // Teto: mesma área do piso
  const ceilingArea = measurements.totalFloorArea;
  
  // Cálculos de material usando config
  const totalPaintArea = paintableWallArea * config.paint.coats;
  const paint = Math.ceil(totalPaintArea / config.paint.coverage);
  
  const primer = Math.ceil((paintableWallArea * config.paint.primerCoats) / config.paint.primerCoverage);
  
  // Massa corrida apenas em parte das paredes
  const putty = Math.ceil((paintableWallArea * (config.paint.puttyPercentage / 100)) / config.paint.puttyCoverage);
  
  // Tinta para teto
  const ceilingPaint = Math.ceil((ceilingArea * config.paint.coats) / config.paint.coverage);
  
  return {
    paint,
    primer,
    putty,
    ceilingPaint,
    paintableWallArea,
    ceilingArea,
  };
}

function calculateFlooring(measurements: MeasurementsStats, config: EstimateConfig): FlooringMaterials {
  const netArea = measurements.totalFloorArea;
  const tiles = netArea * config.flooring.wasteFactor;
  const grout = Math.ceil(netArea * config.flooring.groutPerM2);
  const adhesive = Math.ceil(netArea * config.flooring.adhesivePerM2);
  
  return { tiles, grout, adhesive, netArea };
}

function calculateElectrical(rooms: RoomStats[], config: EstimateConfig): ElectricalMaterials {
  const byRoom = rooms.map(room => {
    const roomType = room.type as keyof typeof config.electrical.byRoomType;
    const estimate = config.electrical.byRoomType[roomType] || config.electrical.byRoomType.default;
    return {
      roomName: room.name,
      outlets: estimate.outlets,
      switches: estimate.switches,
      lights: estimate.lights,
    };
  });
  
  const outlets = byRoom.reduce((sum, r) => sum + r.outlets, 0);
  const switches = byRoom.reduce((sum, r) => sum + r.switches, 0);
  const lightPoints = byRoom.reduce((sum, r) => sum + r.lights, 0);
  
  // Estimativa de fiação usando config
  const wireEstimate = (outlets + switches + lightPoints) * config.electrical.wirePerPoint;
  
  return { outlets, switches, lightPoints, wireEstimate, byRoom };
}

function calculatePlumbing(rooms: RoomStats[], config: EstimateConfig): PlumbingMaterials {
  const byRoom = rooms
    .map(room => {
      const roomType = room.type as keyof typeof config.plumbing.byRoomType;
      const estimate = config.plumbing.byRoomType[roomType];
      if (!estimate) {
        return null;
      }
      return {
        roomName: room.name,
        coldWater: estimate.coldWater,
        hotWater: estimate.hotWater,
        drains: estimate.drains,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);
  
  const coldWaterPoints = byRoom.reduce((sum, r) => sum + r.coldWater, 0);
  const hotWaterPoints = byRoom.reduce((sum, r) => sum + r.hotWater, 0);
  const drainPoints = byRoom.reduce((sum, r) => sum + r.drains, 0);
  
  // Estimativa de tubulação usando config
  const pipeEstimate = (coldWaterPoints + hotWaterPoints + drainPoints) * config.plumbing.pipePerPoint;
  
  return { coldWaterPoints, hotWaterPoints, drainPoints, pipeEstimate, byRoom };
}

function calculateBudget(materials: MaterialsEstimate, totalArea: number, config: EstimateConfig): BudgetEstimate {
  const items: BudgetItem[] = [];
  const prices = config.prices;
  
  // Alvenaria
  items.push({
    category: 'Alvenaria',
    item: 'Tijolos cerâmicos 6 furos',
    quantity: materials.masonry.bricks,
    unit: 'un',
    unitPrice: prices.brick,
    total: materials.masonry.bricks * prices.brick,
  });
  items.push({
    category: 'Alvenaria',
    item: 'Argamassa de assentamento',
    quantity: Math.ceil(materials.masonry.mortar * 10) / 10,
    unit: 'm³',
    unitPrice: prices.mortar_m3,
    total: materials.masonry.mortar * prices.mortar_m3,
  });
  
  // Pintura
  const paintCans = Math.ceil(materials.paint.paint / 18);
  items.push({
    category: 'Pintura',
    item: 'Tinta látex (paredes) 18L',
    quantity: paintCans,
    unit: 'lata',
    unitPrice: prices.paint_18l,
    total: paintCans * prices.paint_18l,
  });
  
  const primerCans = Math.ceil(materials.paint.primer / 18);
  items.push({
    category: 'Pintura',
    item: 'Selador/Fundo 18L',
    quantity: primerCans,
    unit: 'lata',
    unitPrice: prices.primer_18l,
    total: primerCans * prices.primer_18l,
  });
  
  const puttySacks = Math.ceil(materials.paint.putty / 25);
  items.push({
    category: 'Pintura',
    item: 'Massa corrida 25kg',
    quantity: puttySacks,
    unit: 'saco',
    unitPrice: prices.putty_25kg,
    total: puttySacks * prices.putty_25kg,
  });
  
  const ceilingCans = Math.ceil(materials.paint.ceilingPaint / 18);
  items.push({
    category: 'Pintura',
    item: 'Tinta látex (teto) 18L',
    quantity: ceilingCans,
    unit: 'lata',
    unitPrice: prices.paint_18l,
    total: ceilingCans * prices.paint_18l,
  });
  
  // Piso
  items.push({
    category: 'Piso',
    item: `Piso cerâmico (c/ ${Math.round((config.flooring.wasteFactor - 1) * 100)}% perda)`,
    quantity: Math.ceil(materials.flooring.tiles * 10) / 10,
    unit: 'm²',
    unitPrice: prices.tile_m2,
    total: materials.flooring.tiles * prices.tile_m2,
  });
  items.push({
    category: 'Piso',
    item: 'Rejunte',
    quantity: materials.flooring.grout,
    unit: 'kg',
    unitPrice: prices.grout_kg,
    total: materials.flooring.grout * prices.grout_kg,
  });
  items.push({
    category: 'Piso',
    item: 'Argamassa colante',
    quantity: materials.flooring.adhesive,
    unit: 'kg',
    unitPrice: prices.tile_adhesive_kg,
    total: materials.flooring.adhesive * prices.tile_adhesive_kg,
  });
  
  // Elétrica
  items.push({
    category: 'Elétrica',
    item: 'Tomadas',
    quantity: materials.electrical.outlets,
    unit: 'un',
    unitPrice: prices.outlet,
    total: materials.electrical.outlets * prices.outlet,
  });
  items.push({
    category: 'Elétrica',
    item: 'Interruptores',
    quantity: materials.electrical.switches,
    unit: 'un',
    unitPrice: prices.switch,
    total: materials.electrical.switches * prices.switch,
  });
  items.push({
    category: 'Elétrica',
    item: 'Pontos de luz',
    quantity: materials.electrical.lightPoints,
    unit: 'un',
    unitPrice: prices.light_point,
    total: materials.electrical.lightPoints * prices.light_point,
  });
  items.push({
    category: 'Elétrica',
    item: 'Fiação 2.5mm',
    quantity: materials.electrical.wireEstimate,
    unit: 'm',
    unitPrice: prices.wire_m,
    total: materials.electrical.wireEstimate * prices.wire_m,
  });
  
  // Hidráulica
  const totalWaterPoints = materials.plumbing.coldWaterPoints + materials.plumbing.hotWaterPoints;
  if (totalWaterPoints > 0) {
    items.push({
      category: 'Hidráulica',
      item: 'Pontos de água',
      quantity: totalWaterPoints,
      unit: 'un',
      unitPrice: prices.water_point,
      total: totalWaterPoints * prices.water_point,
    });
  }
  if (materials.plumbing.drainPoints > 0) {
    items.push({
      category: 'Hidráulica',
      item: 'Pontos de esgoto',
      quantity: materials.plumbing.drainPoints,
      unit: 'un',
      unitPrice: prices.drain_point,
      total: materials.plumbing.drainPoints * prices.drain_point,
    });
  }
  if (materials.plumbing.pipeEstimate > 0) {
    items.push({
      category: 'Hidráulica',
      item: 'Tubulação PVC',
      quantity: materials.plumbing.pipeEstimate,
      unit: 'm',
      unitPrice: prices.pipe_m,
      total: materials.plumbing.pipeEstimate * prices.pipe_m,
    });
  }
  
  // Calcular subtotais
  const subtotals = {
    masonry: items.filter(i => i.category === 'Alvenaria').reduce((sum, i) => sum + i.total, 0),
    paint: items.filter(i => i.category === 'Pintura').reduce((sum, i) => sum + i.total, 0),
    flooring: items.filter(i => i.category === 'Piso').reduce((sum, i) => sum + i.total, 0),
    electrical: items.filter(i => i.category === 'Elétrica').reduce((sum, i) => sum + i.total, 0),
    plumbing: items.filter(i => i.category === 'Hidráulica').reduce((sum, i) => sum + i.total, 0),
  };
  
  const total = Object.values(subtotals).reduce((sum, v) => sum + v, 0);
  const perM2 = totalArea > 0 ? total / totalArea : 0;
  
  return { items, subtotals, total, perM2 };
}

// ============================================
// Main Calculation Function
// ============================================

export function calculateFloorPlanStats(
  floorPlan: FloorPlan, 
  config: EstimateConfig = DEFAULT_ESTIMATE_CONFIG
): FloorPlanStats {
  const rooms = floorPlan.floor.rooms.map(room => 
    calculateRoomStats(room, floorPlan.defaults, config)
  );
  
  const measurements = calculateMeasurements(rooms);
  
  const materials: MaterialsEstimate = {
    masonry: calculateMasonry(measurements),
    paint: calculatePaint(measurements, config),
    flooring: calculateFlooring(measurements, config),
    electrical: calculateElectrical(rooms, config),
    plumbing: calculatePlumbing(rooms, config),
  };
  
  const budget = calculateBudget(materials, measurements.totalFloorArea, config);
  
  return { measurements, materials, budget };
}

// ============================================
// Formatting Functions
// ============================================

export function formatNumber(num: number, decimals: number = 2): string {
  return num.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatArea(m2: number): string {
  return `${formatNumber(m2)} m²`;
}

export function formatLength(m: number): string {
  return `${formatNumber(m)} m`;
}

export function formatVolume(m3: number): string {
  return `${formatNumber(m3)} m³`;
}

export function formatCount(count: number): string {
  return count.toLocaleString('pt-BR');
}

export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

// Note: RoomStats and WallStats are already exported above as interfaces
