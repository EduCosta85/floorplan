import * as THREE from 'three';
import type { RoomMaterials, FloorMaterialType, WallMaterialType, CeilingMaterialType } from '../../types/floor-plan';
import { FLOOR_MATERIALS, WALL_MATERIALS, CEILING_MATERIALS } from '../../data/materials-library';

// Texture loader singleton
const textureLoader = new THREE.TextureLoader();

// Cache for loaded textures
const textureCache = new Map<string, THREE.Texture>();

function loadTexture(url: string): THREE.Texture {
  if (textureCache.has(url)) {
    return textureCache.get(url)!;
  }
  
  const texture = textureLoader.load(url);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  textureCache.set(url, texture);
  return texture;
}

export function createFloorMaterial(
  roomMaterials?: RoomMaterials
): THREE.MeshStandardMaterial {
  const floorConfig = roomMaterials?.floor;
  const type: FloorMaterialType = floorConfig?.type ?? 'tile-white';
  
  // Custom texture
  if (type === 'custom' && floorConfig?.customTexture) {
    const texture = loadTexture(floorConfig.customTexture);
    return new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.5,
      metalness: 0.1,
    });
  }
  
  // Get material definition from library
  const matDef = FLOOR_MATERIALS[type] || FLOOR_MATERIALS['tile-white'];
  const color = floorConfig?.color ?? matDef.color;
  
  return new THREE.MeshStandardMaterial({
    color,
    roughness: matDef.roughness,
    metalness: matDef.metalness,
  });
}

export function createWallMaterial(
  roomMaterials?: RoomMaterials
): THREE.MeshStandardMaterial {
  const wallConfig = roomMaterials?.walls;
  const type: WallMaterialType = wallConfig?.type ?? 'paint-white';
  
  // Custom texture
  if (type === 'custom' && wallConfig?.customTexture) {
    const texture = loadTexture(wallConfig.customTexture);
    return new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.5,
      metalness: 0,
    });
  }
  
  // Get material definition from library
  const matDef = WALL_MATERIALS[type] || WALL_MATERIALS['paint-white'];
  const color = wallConfig?.color ?? matDef.color;
  
  return new THREE.MeshStandardMaterial({
    color,
    roughness: matDef.roughness,
    metalness: matDef.metalness,
  });
}

export function createCeilingMaterial(
  roomMaterials?: RoomMaterials
): THREE.MeshStandardMaterial {
  const ceilingConfig = roomMaterials?.ceiling;
  const type: CeilingMaterialType = ceilingConfig?.type ?? 'paint-white';
  
  // Custom texture
  if (type === 'custom' && ceilingConfig?.customTexture) {
    const texture = loadTexture(ceilingConfig.customTexture);
    return new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.5,
      metalness: 0,
      side: THREE.BackSide,
    });
  }
  
  // Get material definition from library
  const matDef = CEILING_MATERIALS[type] || CEILING_MATERIALS['paint-white'];
  const color = ceilingConfig?.color ?? matDef.color;
  
  return new THREE.MeshStandardMaterial({
    color,
    roughness: matDef.roughness,
    metalness: matDef.metalness,
    side: THREE.BackSide,
  });
}

export function createDoorMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: '#8B4513',
    roughness: 0.6,
    metalness: 0.1,
  });
}

export function createWindowMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: '#87CEEB',
    roughness: 0.1,
    metalness: 0.2,
    transparent: true,
    opacity: 0.4,
  });
}
