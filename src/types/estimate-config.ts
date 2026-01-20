// Configuration types for material estimation

export interface BrickConfig {
  width: number;      // cm
  height: number;     // cm
  length: number;     // cm
  mortarThickness: number; // cm
  wasteFactor: number;     // multiplier (1.05 = 5%)
}

export interface PaintConfig {
  coverage: number;        // m² per liter
  primerCoverage: number;  // m² per liter
  puttyCoverage: number;   // m² per kg
  coats: number;           // number of paint coats
  primerCoats: number;     // number of primer coats
  puttyPercentage: number; // percentage of walls needing putty (0-100)
}

export interface FlooringConfig {
  wasteFactor: number;     // multiplier (1.10 = 10%)
  groutPerM2: number;      // kg per m²
  adhesivePerM2: number;   // kg per m²
}

export interface RoomElectricalConfig {
  outlets: number;
  switches: number;
  lights: number;
}

export interface ElectricalConfig {
  wirePerPoint: number;    // meters of wire per point
  byRoomType: {
    sala: RoomElectricalConfig;
    cozinha: RoomElectricalConfig;
    banheiro: RoomElectricalConfig;
    quarto: RoomElectricalConfig;
    'area-servico': RoomElectricalConfig;
    default: RoomElectricalConfig;
  };
}

export interface RoomPlumbingConfig {
  coldWater: number;
  hotWater: number;
  drains: number;
}

export interface PlumbingConfig {
  pipePerPoint: number;    // meters of pipe per point
  byRoomType: {
    cozinha: RoomPlumbingConfig;
    banheiro: RoomPlumbingConfig;
    'area-servico': RoomPlumbingConfig;
  };
}

export interface PricesConfig {
  brick: number;
  mortar_m3: number;
  paint_18l: number;
  primer_18l: number;
  putty_25kg: number;
  tile_m2: number;
  grout_kg: number;
  tile_adhesive_kg: number;
  outlet: number;
  switch: number;
  light_point: number;
  water_point: number;
  drain_point: number;
  wire_m: number;
  pipe_m: number;
}

export interface EstimateConfig {
  brick: BrickConfig;
  paint: PaintConfig;
  flooring: FlooringConfig;
  electrical: ElectricalConfig;
  plumbing: PlumbingConfig;
  prices: PricesConfig;
}

// Default configuration values
export const DEFAULT_ESTIMATE_CONFIG: EstimateConfig = {
  brick: {
    width: 14,
    height: 19,
    length: 9,
    mortarThickness: 1,
    wasteFactor: 1.05,
  },
  paint: {
    coverage: 10,
    primerCoverage: 12,
    puttyCoverage: 3,
    coats: 2,
    primerCoats: 1,
    puttyPercentage: 70,
  },
  flooring: {
    wasteFactor: 1.10,
    groutPerM2: 0.5,
    adhesivePerM2: 5,
  },
  electrical: {
    wirePerPoint: 8,
    byRoomType: {
      sala: { outlets: 6, switches: 2, lights: 2 },
      cozinha: { outlets: 8, switches: 2, lights: 2 },
      banheiro: { outlets: 2, switches: 1, lights: 2 },
      quarto: { outlets: 4, switches: 2, lights: 1 },
      'area-servico': { outlets: 3, switches: 1, lights: 1 },
      default: { outlets: 3, switches: 1, lights: 1 },
    },
  },
  plumbing: {
    pipePerPoint: 3,
    byRoomType: {
      cozinha: { coldWater: 2, hotWater: 1, drains: 2 },
      banheiro: { coldWater: 3, hotWater: 2, drains: 3 },
      'area-servico': { coldWater: 2, hotWater: 1, drains: 2 },
    },
  },
  prices: {
    brick: 0.85,
    mortar_m3: 350,
    paint_18l: 280,
    primer_18l: 150,
    putty_25kg: 45,
    tile_m2: 45,
    grout_kg: 8,
    tile_adhesive_kg: 1.2,
    outlet: 25,
    switch: 20,
    light_point: 80,
    water_point: 120,
    drain_point: 100,
    wire_m: 3.5,
    pipe_m: 12,
  },
};
