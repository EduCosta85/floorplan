import type { FloorMaterialType, WallMaterialType, CeilingMaterialType } from '../types/floor-plan';

// ============================================
// Material Definitions
// ============================================

export interface MaterialDefinition {
  id: string;
  name: string;
  category: string;
  color: string;
  roughness: number;
  metalness: number;
  pattern?: 'solid' | 'wood' | 'tile' | 'brick' | 'marble';
  patternScale?: number;
  preview: string; // CSS gradient or color for UI preview
}

// ============================================
// Floor Materials
// ============================================

export const FLOOR_MATERIALS: Record<FloorMaterialType, MaterialDefinition> = {
  'wood-light': {
    id: 'wood-light',
    name: 'Madeira Clara',
    category: 'Madeira',
    color: '#d4a574',
    roughness: 0.6,
    metalness: 0.1,
    pattern: 'wood',
    patternScale: 4,
    preview: 'linear-gradient(90deg, #d4a574 0%, #c9956a 25%, #d4a574 50%, #c9956a 75%, #d4a574 100%)',
  },
  'wood-dark': {
    id: 'wood-dark',
    name: 'Madeira Escura',
    category: 'Madeira',
    color: '#8B4513',
    roughness: 0.5,
    metalness: 0.1,
    pattern: 'wood',
    patternScale: 4,
    preview: 'linear-gradient(90deg, #8B4513 0%, #723A0F 25%, #8B4513 50%, #723A0F 75%, #8B4513 100%)',
  },
  'wood-parquet': {
    id: 'wood-parquet',
    name: 'Parquet',
    category: 'Madeira',
    color: '#c4a77d',
    roughness: 0.55,
    metalness: 0.1,
    pattern: 'wood',
    patternScale: 8,
    preview: 'repeating-conic-gradient(#c4a77d 0deg 90deg, #b8976d 90deg 180deg)',
  },
  'tile-white': {
    id: 'tile-white',
    name: 'Cerâmica Branca',
    category: 'Cerâmica',
    color: '#f5f5f5',
    roughness: 0.3,
    metalness: 0.1,
    pattern: 'tile',
    patternScale: 6,
    preview: 'repeating-linear-gradient(0deg, #f5f5f5 0px, #f5f5f5 20px, #e0e0e0 20px, #e0e0e0 22px), repeating-linear-gradient(90deg, #f5f5f5 0px, #f5f5f5 20px, #e0e0e0 20px, #e0e0e0 22px)',
  },
  'tile-gray': {
    id: 'tile-gray',
    name: 'Cerâmica Cinza',
    category: 'Cerâmica',
    color: '#9e9e9e',
    roughness: 0.35,
    metalness: 0.1,
    pattern: 'tile',
    patternScale: 6,
    preview: 'repeating-linear-gradient(0deg, #9e9e9e 0px, #9e9e9e 20px, #757575 20px, #757575 22px), repeating-linear-gradient(90deg, #9e9e9e 0px, #9e9e9e 20px, #757575 20px, #757575 22px)',
  },
  'tile-beige': {
    id: 'tile-beige',
    name: 'Cerâmica Bege',
    category: 'Cerâmica',
    color: '#d7ccc8',
    roughness: 0.35,
    metalness: 0.1,
    pattern: 'tile',
    patternScale: 6,
    preview: 'repeating-linear-gradient(0deg, #d7ccc8 0px, #d7ccc8 20px, #bcaaa4 20px, #bcaaa4 22px), repeating-linear-gradient(90deg, #d7ccc8 0px, #d7ccc8 20px, #bcaaa4 20px, #bcaaa4 22px)',
  },
  'marble-white': {
    id: 'marble-white',
    name: 'Mármore Branco',
    category: 'Pedra',
    color: '#fafafa',
    roughness: 0.2,
    metalness: 0.3,
    pattern: 'marble',
    patternScale: 2,
    preview: 'linear-gradient(135deg, #fafafa 0%, #e0e0e0 25%, #fafafa 50%, #d0d0d0 75%, #fafafa 100%)',
  },
  'marble-black': {
    id: 'marble-black',
    name: 'Mármore Preto',
    category: 'Pedra',
    color: '#212121',
    roughness: 0.2,
    metalness: 0.3,
    pattern: 'marble',
    patternScale: 2,
    preview: 'linear-gradient(135deg, #212121 0%, #424242 25%, #212121 50%, #303030 75%, #212121 100%)',
  },
  'concrete': {
    id: 'concrete',
    name: 'Concreto',
    category: 'Industrial',
    color: '#9e9e9e',
    roughness: 0.9,
    metalness: 0,
    pattern: 'solid',
    preview: '#9e9e9e',
  },
  'ceramic-blue': {
    id: 'ceramic-blue',
    name: 'Cerâmica Azul',
    category: 'Cerâmica',
    color: '#b3e5fc',
    roughness: 0.25,
    metalness: 0.1,
    pattern: 'tile',
    patternScale: 6,
    preview: 'repeating-linear-gradient(0deg, #b3e5fc 0px, #b3e5fc 20px, #81d4fa 20px, #81d4fa 22px), repeating-linear-gradient(90deg, #b3e5fc 0px, #b3e5fc 20px, #81d4fa 20px, #81d4fa 22px)',
  },
  'ceramic-green': {
    id: 'ceramic-green',
    name: 'Cerâmica Verde',
    category: 'Cerâmica',
    color: '#c8e6c9',
    roughness: 0.25,
    metalness: 0.1,
    pattern: 'tile',
    patternScale: 6,
    preview: 'repeating-linear-gradient(0deg, #c8e6c9 0px, #c8e6c9 20px, #a5d6a7 20px, #a5d6a7 22px), repeating-linear-gradient(90deg, #c8e6c9 0px, #c8e6c9 20px, #a5d6a7 20px, #a5d6a7 22px)',
  },
  'custom': {
    id: 'custom',
    name: 'Personalizado',
    category: 'Custom',
    color: '#e0e0e0',
    roughness: 0.5,
    metalness: 0,
    pattern: 'solid',
    preview: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
  },
};

// ============================================
// Wall Materials
// ============================================

export const WALL_MATERIALS: Record<WallMaterialType, MaterialDefinition> = {
  'paint-white': {
    id: 'paint-white',
    name: 'Branco',
    category: 'Pintura',
    color: '#fafafa',
    roughness: 0.9,
    metalness: 0,
    pattern: 'solid',
    preview: '#fafafa',
  },
  'paint-cream': {
    id: 'paint-cream',
    name: 'Creme',
    category: 'Pintura',
    color: '#fff8e1',
    roughness: 0.9,
    metalness: 0,
    pattern: 'solid',
    preview: '#fff8e1',
  },
  'paint-gray': {
    id: 'paint-gray',
    name: 'Cinza',
    category: 'Pintura',
    color: '#e0e0e0',
    roughness: 0.9,
    metalness: 0,
    pattern: 'solid',
    preview: '#e0e0e0',
  },
  'paint-blue': {
    id: 'paint-blue',
    name: 'Azul Claro',
    category: 'Pintura',
    color: '#e3f2fd',
    roughness: 0.9,
    metalness: 0,
    pattern: 'solid',
    preview: '#e3f2fd',
  },
  'paint-green': {
    id: 'paint-green',
    name: 'Verde Claro',
    category: 'Pintura',
    color: '#e8f5e9',
    roughness: 0.9,
    metalness: 0,
    pattern: 'solid',
    preview: '#e8f5e9',
  },
  'texture-plaster': {
    id: 'texture-plaster',
    name: 'Textura',
    category: 'Textura',
    color: '#f5f5f5',
    roughness: 0.95,
    metalness: 0,
    pattern: 'solid',
    preview: 'linear-gradient(135deg, #f5f5f5 0%, #eeeeee 50%, #f5f5f5 100%)',
  },
  'brick-red': {
    id: 'brick-red',
    name: 'Tijolinho',
    category: 'Tijolo',
    color: '#bf5c3e',
    roughness: 0.85,
    metalness: 0,
    pattern: 'brick',
    patternScale: 4,
    preview: 'repeating-linear-gradient(0deg, #bf5c3e 0px, #bf5c3e 10px, #9e9e9e 10px, #9e9e9e 12px)',
  },
  'brick-white': {
    id: 'brick-white',
    name: 'Tijolinho Branco',
    category: 'Tijolo',
    color: '#f5f5f5',
    roughness: 0.85,
    metalness: 0,
    pattern: 'brick',
    patternScale: 4,
    preview: 'repeating-linear-gradient(0deg, #f5f5f5 0px, #f5f5f5 10px, #e0e0e0 10px, #e0e0e0 12px)',
  },
  'tile-white': {
    id: 'tile-white',
    name: 'Azulejo Branco',
    category: 'Azulejo',
    color: '#ffffff',
    roughness: 0.2,
    metalness: 0.1,
    pattern: 'tile',
    patternScale: 8,
    preview: 'repeating-linear-gradient(0deg, #fff 0px, #fff 15px, #e0e0e0 15px, #e0e0e0 16px), repeating-linear-gradient(90deg, #fff 0px, #fff 15px, #e0e0e0 15px, #e0e0e0 16px)',
  },
  'tile-subway': {
    id: 'tile-subway',
    name: 'Metro/Subway',
    category: 'Azulejo',
    color: '#ffffff',
    roughness: 0.2,
    metalness: 0.1,
    pattern: 'tile',
    patternScale: 6,
    preview: 'repeating-linear-gradient(0deg, #fff 0px, #fff 12px, #d0d0d0 12px, #d0d0d0 14px)',
  },
  'custom': {
    id: 'custom',
    name: 'Personalizado',
    category: 'Custom',
    color: '#e0e0e0',
    roughness: 0.5,
    metalness: 0,
    pattern: 'solid',
    preview: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
  },
};

// ============================================
// Ceiling Materials
// ============================================

export const CEILING_MATERIALS: Record<CeilingMaterialType, MaterialDefinition> = {
  'paint-white': {
    id: 'paint-white',
    name: 'Branco',
    category: 'Pintura',
    color: '#ffffff',
    roughness: 0.95,
    metalness: 0,
    pattern: 'solid',
    preview: '#ffffff',
  },
  'paint-cream': {
    id: 'paint-cream',
    name: 'Creme',
    category: 'Pintura',
    color: '#fffde7',
    roughness: 0.95,
    metalness: 0,
    pattern: 'solid',
    preview: '#fffde7',
  },
  'gesso': {
    id: 'gesso',
    name: 'Gesso',
    category: 'Gesso',
    color: '#fafafa',
    roughness: 0.9,
    metalness: 0,
    pattern: 'solid',
    preview: '#fafafa',
  },
  'wood': {
    id: 'wood',
    name: 'Madeira',
    category: 'Madeira',
    color: '#a1887f',
    roughness: 0.7,
    metalness: 0.1,
    pattern: 'wood',
    patternScale: 4,
    preview: 'linear-gradient(90deg, #a1887f 0%, #8d6e63 50%, #a1887f 100%)',
  },
  'custom': {
    id: 'custom',
    name: 'Personalizado',
    category: 'Custom',
    color: '#e0e0e0',
    roughness: 0.5,
    metalness: 0,
    pattern: 'solid',
    preview: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
  },
};

// ============================================
// Style Presets
// ============================================

export interface StylePreset {
  id: string;
  name: string;
  icon: string;
  description: string;
  floor: FloorMaterialType;
  walls: WallMaterialType;
  ceiling: CeilingMaterialType;
}

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: 'modern',
    name: 'Moderno',
    icon: '🏢',
    description: 'Linhas limpas, cores neutras',
    floor: 'tile-gray',
    walls: 'paint-white',
    ceiling: 'gesso',
  },
  {
    id: 'classic',
    name: 'Clássico',
    icon: '🏠',
    description: 'Madeira e tons quentes',
    floor: 'wood-light',
    walls: 'paint-cream',
    ceiling: 'paint-white',
  },
  {
    id: 'rustic',
    name: 'Rústico',
    icon: '🌿',
    description: 'Tijolos e madeira escura',
    floor: 'wood-dark',
    walls: 'brick-red',
    ceiling: 'wood',
  },
  {
    id: 'minimalist',
    name: 'Minimalista',
    icon: '⬜',
    description: 'Branco e concreto',
    floor: 'concrete',
    walls: 'paint-white',
    ceiling: 'paint-white',
  },
  {
    id: 'industrial',
    name: 'Industrial',
    icon: '🏭',
    description: 'Concreto e tijolo',
    floor: 'concrete',
    walls: 'brick-white',
    ceiling: 'gesso',
  },
];

// ============================================
// Helper Functions
// ============================================

export function getFloorMaterial(type: FloorMaterialType): MaterialDefinition {
  return FLOOR_MATERIALS[type] || FLOOR_MATERIALS['tile-white'];
}

export function getWallMaterial(type: WallMaterialType): MaterialDefinition {
  return WALL_MATERIALS[type] || WALL_MATERIALS['paint-white'];
}

export function getCeilingMaterial(type: CeilingMaterialType): MaterialDefinition {
  return CEILING_MATERIALS[type] || CEILING_MATERIALS['paint-white'];
}

export function getMaterialsByCategory<T extends MaterialDefinition>(
  materials: Record<string, T>
): Map<string, T[]> {
  const categories = new Map<string, T[]>();
  
  Object.values(materials).forEach(material => {
    const list = categories.get(material.category) || [];
    list.push(material);
    categories.set(material.category, list);
  });
  
  return categories;
}
