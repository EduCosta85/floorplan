import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { 
  OrbitControls, 
  PerspectiveCamera, 
  ContactShadows,
  Html,
} from '@react-three/drei';
import * as THREE from 'three';
import type { FloorPlan, Room, WallSide, Furniture } from '../types/floor-plan';
import { 
  createFloorMaterial, 
  createWallMaterial, 
  createDoorMaterial, 
  createWindowMaterial,
  createCeilingMaterial,
} from './3d/materials';
import { getFurnitureTemplate } from '../data/furniture-library';

interface FloorPlan3DProps {
  floorPlan: FloorPlan;
  selectedRoomId?: string | null;
  onRoomClick?: (roomId: string) => void;
}

// View modes
type ViewMode = 'orbit' | 'firstPerson';
type QualityMode = 'low' | 'medium' | 'high';

// Height presets in cm
const HEIGHT_PRESETS = [
  { label: 'Criança', height: 120, icon: '👶' },
  { label: 'Baixo', height: 155, icon: '🧍' },
  { label: 'Médio', height: 170, icon: '🧍' },
  { label: 'Alto', height: 185, icon: '🧍' },
  { label: 'Muito Alto', height: 200, icon: '🏀' },
];

// Furniture Mesh Component
interface FurnitureMeshProps {
  furniture: Furniture;
  scale: number;
}

function FurnitureMesh({ furniture, scale }: FurnitureMeshProps) {
  const template = getFurnitureTemplate(furniture.templateId);
  if (!template) return null;
  
  const unitScale = scale * 0.01;
  
  const width = (furniture.width ?? template.width) * unitScale;
  const depth = (furniture.depth ?? template.depth) * unitScale;
  const height = (furniture.height ?? template.height) * unitScale;
  const elevation = (furniture.elevation ?? template.elevation ?? 0) * unitScale;
  const x = furniture.position.x * unitScale;
  const z = furniture.position.y * unitScale;
  const rotation = (furniture.rotation * Math.PI) / 180;
  const color = furniture.color ?? template.color;
  const structuralType = template.structuralType;
  
  // Position at center of furniture for rotation
  const centerX = x + (furniture.width ?? template.width) * unitScale / 2;
  const centerZ = z + (furniture.depth ?? template.depth) * unitScale / 2;
  // Y position considers elevation (distance from floor)
  const centerY = elevation + height / 2;
  
  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.7,
      metalness: 0.1,
    });
  }, [color]);
  
  const waterMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#06b6d4',
      roughness: 0.1,
      metalness: 0.3,
      transparent: true,
      opacity: 0.8,
    });
  }, []);
  
  const secondaryMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: template.secondaryColor ?? color,
      roughness: 0.8,
      metalness: 0.1,
    });
  }, [template.secondaryColor, color]);
  
  // Pool rendering
  if (structuralType === 'pool') {
    const borderWidthCm = furniture.borderWidth ?? template.borderWidth ?? 20;
    const borderWidthUnits = borderWidthCm * unitScale;
    const waterDepthCm = furniture.waterDepth ?? template.waterDepth ?? 140;
    const waterLevel = Math.min(waterDepthCm * unitScale, height - 0.02);
    
    return (
      <group position={[centerX, 0, centerZ]} rotation={[0, rotation, 0]}>
        {/* Pool walls (outer shell - the border) */}
        <mesh castShadow receiveShadow position={[0, height / 2, 0]}>
          <boxGeometry args={[width, height, depth]} />
          <primitive object={secondaryMaterial} attach="material" />
        </mesh>
        {/* Pool interior (cutout effect - slightly smaller, darker) */}
        <mesh position={[0, height / 2 + 0.01, 0]}>
          <boxGeometry args={[width - borderWidthUnits * 2, height, depth - borderWidthUnits * 2]} />
          <meshStandardMaterial color="#0e7490" roughness={0.3} />
        </mesh>
        {/* Water surface */}
        <mesh position={[0, waterLevel, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[width - borderWidthUnits * 2, depth - borderWidthUnits * 2]} />
          <primitive object={waterMaterial} attach="material" />
        </mesh>
      </group>
    );
  }
  
  // Stair rendering
  if (structuralType === 'stair') {
    const numSteps = template.steps ?? 15;
    const stepHeight = height / numSteps;
    const stepDepth = depth / numSteps;
    
    return (
      <group position={[centerX, 0, centerZ]} rotation={[0, rotation, 0]}>
        {Array.from({ length: numSteps }).map((_, i) => (
          <mesh 
            key={i} 
            castShadow 
            receiveShadow
            position={[0, stepHeight * (i + 0.5), -depth / 2 + stepDepth * (i + 0.5)]}
          >
            <boxGeometry args={[width, stepHeight * 0.95, stepDepth * 0.95]} />
            <primitive object={i % 2 === 0 ? material : secondaryMaterial} attach="material" />
          </mesh>
        ))}
      </group>
    );
  }
  
  // Pillar rendering (cylinder for round)
  if (structuralType === 'pillar' && template.id === 'pillar-round') {
    return (
      <group position={[centerX, centerY, centerZ]} rotation={[0, rotation, 0]}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[width / 2, width / 2, height, 16]} />
          <primitive object={material} attach="material" />
        </mesh>
      </group>
    );
  }
  
  // Deck rendering (flat with slight height)
  if (structuralType === 'deck') {
    const plankWidth = 0.1;
    const numPlanks = Math.floor(width / plankWidth);
    
    return (
      <group position={[centerX, height / 2, centerZ]} rotation={[0, rotation, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[width, height, depth]} />
          <primitive object={material} attach="material" />
        </mesh>
        {/* Plank lines */}
        {Array.from({ length: numPlanks }).map((_, i) => (
          <mesh 
            key={i}
            position={[-width / 2 + plankWidth * (i + 0.5), height / 2 + 0.001, 0]}
          >
            <boxGeometry args={[0.005, 0.001, depth]} />
            <primitive object={secondaryMaterial} attach="material" />
          </mesh>
        ))}
      </group>
    );
  }
  
  // Default furniture rendering
  return (
    <group position={[centerX, centerY, centerZ]} rotation={[0, rotation, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <primitive object={material} attach="material" />
      </mesh>
      {/* Top surface highlight */}
      <mesh position={[0, height / 2 + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width * 0.95, depth * 0.95]} />
        <meshStandardMaterial
          color={color}
          roughness={0.5}
          metalness={0.2}
          opacity={0.8}
          transparent
        />
      </mesh>
    </group>
  );
}

interface RoomMeshProps {
  room: Room;
  scale: number;
  wallHeight: number;
  wallThickness: number;
  doorHeight: number;
  windowHeight: number;
  windowFromFloor: number;
  isSelected: boolean;
  isHovered: boolean;
  showLabel: boolean;
  showCeiling: boolean;
  onClick?: () => void;
  onHover?: (hovered: boolean) => void;
}

function RoomMesh({ 
  room, scale, wallHeight, wallThickness, 
  doorHeight, windowHeight, windowFromFloor,
  isSelected, isHovered, showLabel, showCeiling, onClick, onHover
}: RoomMeshProps) {
  
  // Convert cm to 3D units (scale down by 100 for manageable scene size)
  const unitScale = scale * 0.01;
  
  const x = room.position.x * unitScale;
  const z = room.position.y * unitScale;
  const width = (room.walls.north?.length ?? room.walls.south?.length ?? 100) * unitScale;
  const depth = (room.walls.east?.length ?? room.walls.west?.length ?? 100) * unitScale;
  const height = wallHeight * unitScale;
  const thickness = wallThickness * unitScale;
  const dHeight = doorHeight * unitScale;
  
  // Generate a key based on materials to force re-render when materials change
  const materialsKey = useMemo(() => {
    return JSON.stringify(room.materials ?? {});
  }, [room.materials]);
  
  // Create materials based on room configuration
  const floorMaterial = useMemo(() => createFloorMaterial(room.materials), [room.materials]);
  const wallMaterial = useMemo(() => createWallMaterial(room.materials), [room.materials]);
  const doorMaterial = useMemo(() => createDoorMaterial(), []);
  const windowMaterial = useMemo(() => createWindowMaterial(), []);
  const ceilingMaterial = useMemo(() => createCeilingMaterial(room.materials), [room.materials]);
  
  // Highlight material for selection/hover
  const highlightMaterial = useMemo(() => {
    if (isSelected) {
      return new THREE.MeshStandardMaterial({ 
        color: '#3b82f6', 
        roughness: 0.5,
        emissive: '#1d4ed8',
        emissiveIntensity: 0.2,
      });
    }
    if (isHovered) {
      return new THREE.MeshStandardMaterial({ 
        color: '#64748b', 
        roughness: 0.6,
      });
    }
    return null;
  }, [isSelected, isHovered]);

  const currentWallMaterial = highlightMaterial || wallMaterial;

  // Create wall with openings
  const createWallWithOpenings = (side: WallSide, wallData: Room['walls'][WallSide]) => {
    if (!wallData || wallData.exists === false || !wallData.length) return null;
    
    const wallLength = wallData.length * unitScale;
    const openings = wallData.openings ?? [];
    const isHorizontal = side === 'north' || side === 'south';
    
    // Calculate wall base position
    let baseX: number, baseZ: number;
    switch (side) {
      case 'north':
        baseX = x;
        baseZ = z;
        break;
      case 'south':
        baseX = x;
        baseZ = z + depth - thickness;
        break;
      case 'east':
        baseX = x + width - thickness;
        baseZ = z;
        break;
      case 'west':
        baseX = x;
        baseZ = z;
        break;
    }
    
    // Build wall segments considering openings
    const elements: React.ReactNode[] = [];
    let currentPos = 0;
    
    // Sort openings by offset
    const sortedOpenings = [...openings].sort((a, b) => (a.offset ?? 0) - (b.offset ?? 0));
    
    sortedOpenings.forEach((opening, idx) => {
      const offset = (opening.offset ?? 0) * unitScale;
      const openingWidth = (opening.width ?? 80) * unitScale;
      const openingHeight = opening.type === 'door' 
        ? (opening.height ?? doorHeight) * unitScale 
        : (opening.height ?? windowHeight) * unitScale;
      const fromFloor = opening.type === 'window' 
        ? (opening.fromFloor ?? windowFromFloor) * unitScale 
        : 0;
      
      // Wall segment before opening
      if (offset > currentPos) {
        const segmentLength = offset - currentPos;
        const segmentCenter = currentPos + segmentLength / 2;
        
        if (isHorizontal) {
          elements.push(
            <mesh
              key={`${side}-wall-${idx}-before`}
              position={[baseX + segmentCenter, height / 2, baseZ + thickness / 2]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[segmentLength, height, thickness]} />
              <primitive object={currentWallMaterial} attach="material" />
            </mesh>
          );
        } else {
          elements.push(
            <mesh
              key={`${side}-wall-${idx}-before`}
              position={[baseX + thickness / 2, height / 2, baseZ + segmentCenter]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[thickness, height, segmentLength]} />
              <primitive object={currentWallMaterial} attach="material" />
            </mesh>
          );
        }
      }
      
      // Opening area
      const openingCenter = offset + openingWidth / 2;
      
      if (opening.type === 'door') {
        // Wall above door
        const aboveDoorHeight = height - dHeight;
        if (aboveDoorHeight > 0) {
          if (isHorizontal) {
            elements.push(
              <mesh
                key={`${side}-door-${idx}-above`}
                position={[baseX + openingCenter, dHeight + aboveDoorHeight / 2, baseZ + thickness / 2]}
                castShadow
                receiveShadow
              >
                <boxGeometry args={[openingWidth, aboveDoorHeight, thickness]} />
                <primitive object={currentWallMaterial} attach="material" />
              </mesh>
            );
          } else {
            elements.push(
              <mesh
                key={`${side}-door-${idx}-above`}
                position={[baseX + thickness / 2, dHeight + aboveDoorHeight / 2, baseZ + openingCenter]}
                castShadow
                receiveShadow
              >
                <boxGeometry args={[thickness, aboveDoorHeight, openingWidth]} />
                <primitive object={currentWallMaterial} attach="material" />
              </mesh>
            );
          }
        }
        
        // Door panel
        if (isHorizontal) {
          elements.push(
            <mesh
              key={`${side}-door-${idx}-frame`}
              position={[baseX + openingCenter, dHeight / 2, baseZ + thickness / 2]}
              castShadow
            >
              <boxGeometry args={[openingWidth * 0.9, dHeight * 0.98, thickness * 0.15]} />
              <primitive object={doorMaterial} attach="material" />
            </mesh>
          );
        } else {
          elements.push(
            <mesh
              key={`${side}-door-${idx}-frame`}
              position={[baseX + thickness / 2, dHeight / 2, baseZ + openingCenter]}
              castShadow
            >
              <boxGeometry args={[thickness * 0.15, dHeight * 0.98, openingWidth * 0.9]} />
              <primitive object={doorMaterial} attach="material" />
            </mesh>
          );
        }
      } else {
        // Window - wall below
        if (fromFloor > 0) {
          if (isHorizontal) {
            elements.push(
              <mesh
                key={`${side}-window-${idx}-below`}
                position={[baseX + openingCenter, fromFloor / 2, baseZ + thickness / 2]}
                castShadow
                receiveShadow
              >
                <boxGeometry args={[openingWidth, fromFloor, thickness]} />
                <primitive object={currentWallMaterial} attach="material" />
              </mesh>
            );
          } else {
            elements.push(
              <mesh
                key={`${side}-window-${idx}-below`}
                position={[baseX + thickness / 2, fromFloor / 2, baseZ + openingCenter]}
                castShadow
                receiveShadow
              >
                <boxGeometry args={[thickness, fromFloor, openingWidth]} />
                <primitive object={currentWallMaterial} attach="material" />
              </mesh>
            );
          }
        }
        
        // Window - wall above
        const aboveWindowHeight = height - fromFloor - openingHeight;
        if (aboveWindowHeight > 0) {
          if (isHorizontal) {
            elements.push(
              <mesh
                key={`${side}-window-${idx}-above`}
                position={[baseX + openingCenter, fromFloor + openingHeight + aboveWindowHeight / 2, baseZ + thickness / 2]}
                castShadow
                receiveShadow
              >
                <boxGeometry args={[openingWidth, aboveWindowHeight, thickness]} />
                <primitive object={currentWallMaterial} attach="material" />
              </mesh>
            );
          } else {
            elements.push(
              <mesh
                key={`${side}-window-${idx}-above`}
                position={[baseX + thickness / 2, fromFloor + openingHeight + aboveWindowHeight / 2, baseZ + openingCenter]}
                castShadow
                receiveShadow
              >
                <boxGeometry args={[thickness, aboveWindowHeight, openingWidth]} />
                <primitive object={currentWallMaterial} attach="material" />
              </mesh>
            );
          }
        }
        
        // Window glass
        if (isHorizontal) {
          elements.push(
            <mesh
              key={`${side}-window-${idx}-glass`}
              position={[baseX + openingCenter, fromFloor + openingHeight / 2, baseZ + thickness / 2]}
            >
              <boxGeometry args={[openingWidth * 0.95, openingHeight * 0.95, thickness * 0.05]} />
              <primitive object={windowMaterial} attach="material" />
            </mesh>
          );
        } else {
          elements.push(
            <mesh
              key={`${side}-window-${idx}-glass`}
              position={[baseX + thickness / 2, fromFloor + openingHeight / 2, baseZ + openingCenter]}
            >
              <boxGeometry args={[thickness * 0.05, openingHeight * 0.95, openingWidth * 0.95]} />
              <primitive object={windowMaterial} attach="material" />
            </mesh>
          );
        }
      }
      
      currentPos = offset + openingWidth;
    });
    
    // Final wall segment after last opening
    if (currentPos < wallLength) {
      const segmentLength = wallLength - currentPos;
      const segmentCenter = currentPos + segmentLength / 2;
      
      if (isHorizontal) {
        elements.push(
          <mesh
            key={`${side}-wall-final`}
            position={[baseX + segmentCenter, height / 2, baseZ + thickness / 2]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[segmentLength, height, thickness]} />
            <primitive object={currentWallMaterial} attach="material" />
          </mesh>
        );
      } else {
        elements.push(
          <mesh
            key={`${side}-wall-final`}
            position={[baseX + thickness / 2, height / 2, baseZ + segmentCenter]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[thickness, height, segmentLength]} />
            <primitive object={currentWallMaterial} attach="material" />
          </mesh>
        );
      }
    }
    
    // If no openings, render full wall
    if (openings.length === 0) {
      if (isHorizontal) {
        return (
          <mesh
            key={side}
            position={[baseX + wallLength / 2, height / 2, baseZ + thickness / 2]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[wallLength, height, thickness]} />
            <primitive object={currentWallMaterial} attach="material" />
          </mesh>
        );
      } else {
        return (
          <mesh
            key={side}
            position={[baseX + thickness / 2, height / 2, baseZ + wallLength / 2]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[thickness, height, wallLength]} />
            <primitive object={currentWallMaterial} attach="material" />
          </mesh>
        );
      }
    }
    
    return <group key={side}>{elements}</group>;
  };

  // Calculate room center for label
  const roomCenterX = x + width / 2;
  const roomCenterZ = z + depth / 2;

  return (
    <group 
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      onPointerEnter={() => onHover?.(true)}
      onPointerLeave={() => onHover?.(false)}
    >
      {/* Floor - key includes materialsKey to force re-render */}
      {(room.hasFloor !== false) && (
        <mesh 
          key={`floor-${materialsKey}`}
          position={[x + width / 2, 0.01, z + depth / 2]} 
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <planeGeometry args={[width, depth]} />
          <primitive object={floorMaterial} attach="material" />
        </mesh>
      )}
      
      {/* Ceiling - key includes materialsKey to force re-render */}
      {showCeiling && (room.hasCeiling !== false) && (
        <mesh 
          key={`ceiling-${materialsKey}`}
          position={[x + width / 2, height, z + depth / 2]} 
          rotation={[Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[width, depth]} />
          <primitive object={ceilingMaterial} attach="material" />
        </mesh>
      )}
      
      {/* Room Label */}
      {showLabel && (
        <Html
          position={[roomCenterX, 0.05, roomCenterZ]}
          center
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          <div style={{
            background: isSelected ? '#3b82f6' : isHovered ? '#475569' : 'rgba(15, 23, 42, 0.85)',
            color: 'white',
            padding: '4px 10px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            transform: 'translateY(-10px)',
          }}>
            {room.name}
          </div>
        </Html>
      )}
      
      {/* Walls with openings - key includes materialsKey to force re-render */}
      <group key={`walls-${materialsKey}`}>
        {createWallWithOpenings('north', room.walls.north)}
        {createWallWithOpenings('south', room.walls.south)}
        {createWallWithOpenings('east', room.walls.east)}
        {createWallWithOpenings('west', room.walls.west)}
      </group>
    </group>
  );
}

// First Person Camera Controller
interface FirstPersonControllerProps {
  position: THREE.Vector3;
  enabled: boolean;
  moveSpeed: number;
  lookSpeed: number;
  bounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  };
}

function FirstPersonController({ position, enabled, moveSpeed, lookSpeed, bounds }: FirstPersonControllerProps) {
  const { camera } = useThree();
  const keys = useRef<Set<string>>(new Set());
  const yaw = useRef(0);
  const pitch = useRef(0);
  const isPointerLocked = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      keys.current.add(e.code);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keys.current.delete(e.code);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isPointerLocked.current) return;
      yaw.current -= e.movementX * lookSpeed;
      pitch.current = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, pitch.current - e.movementY * lookSpeed));
    };

    const handlePointerLockChange = () => {
      isPointerLocked.current = document.pointerLockElement !== null;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('pointerlockchange', handlePointerLockChange);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
    };
  }, [enabled, lookSpeed]);

  useFrame(() => {
    if (!enabled) return;

    // Update camera rotation
    camera.rotation.order = 'YXZ';
    camera.rotation.y = yaw.current;
    camera.rotation.x = pitch.current;

    // Movement
    const direction = new THREE.Vector3();
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    right.y = 0;
    right.normalize();

    if (keys.current.has('KeyW') || keys.current.has('ArrowUp')) {
      direction.add(forward);
    }
    if (keys.current.has('KeyS') || keys.current.has('ArrowDown')) {
      direction.sub(forward);
    }
    if (keys.current.has('KeyA') || keys.current.has('ArrowLeft')) {
      direction.sub(right);
    }
    if (keys.current.has('KeyD') || keys.current.has('ArrowRight')) {
      direction.add(right);
    }

    if (direction.length() > 0) {
      direction.normalize();
      const newX = camera.position.x + direction.x * moveSpeed;
      const newZ = camera.position.z + direction.z * moveSpeed;
      
      // Clamp to bounds
      camera.position.x = Math.max(bounds.minX, Math.min(bounds.maxX, newX));
      camera.position.z = Math.max(bounds.minZ, Math.min(bounds.maxZ, newZ));
    }
  });

  useEffect(() => {
    if (enabled) {
      camera.position.copy(position);
      yaw.current = 0;
      pitch.current = 0;
    }
  }, [enabled, position, camera]);

  return null;
}

interface SceneProps extends FloorPlan3DProps {
  viewMode: ViewMode;
  qualityMode: QualityMode;
  cameraHeight: number;
  hoveredRoomId: string | null;
  onRoomHover: (roomId: string | null) => void;
  showLabels: boolean;
  showCeiling: boolean;
}

function Scene({ 
  floorPlan, 
  selectedRoomId, 
  onRoomClick, 
  viewMode, 
  qualityMode,
  cameraHeight, 
  hoveredRoomId,
  onRoomHover,
  showLabels,
  showCeiling,
}: SceneProps) {
  const scale = floorPlan.scale ?? 0.2;
  const wallHeight = floorPlan.defaults?.wall?.height ?? 280;
  const wallThickness = floorPlan.defaults?.wall?.thickness ?? 15;
  const doorHeight = floorPlan.defaults?.door?.height ?? 210;
  const windowHeight = floorPlan.defaults?.window?.height ?? 120;
  const windowFromFloor = floorPlan.defaults?.window?.fromFloor ?? 100;
  
  const unitScale = scale * 0.01;
  const cameraHeightUnits = cameraHeight * unitScale;
  
  // Calculate scene center for camera
  const bounds = useMemo(() => {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const room of floorPlan.floor.rooms) {
      const x = room.position.x * unitScale;
      const z = room.position.y * unitScale;
      const w = (room.walls.north?.length ?? 100) * unitScale;
      const d = (room.walls.east?.length ?? 100) * unitScale;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x + w);
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z + d);
    }
    return {
      centerX: (minX + maxX) / 2,
      centerZ: (minZ + maxZ) / 2,
      width: maxX - minX,
      depth: maxZ - minZ,
      minX: minX + 0.1,
      maxX: maxX - 0.1,
      minZ: minZ + 0.1,
      maxZ: maxZ - 0.1,
    };
  }, [floorPlan, unitScale]);

  const firstPersonPosition = useMemo(() => 
    new THREE.Vector3(bounds.centerX, cameraHeightUnits, bounds.centerZ),
    [bounds.centerX, bounds.centerZ, cameraHeightUnits]
  );

  return (
    <>
      {/* Orbit Camera (when not in first person) */}
      {viewMode === 'orbit' && (
        <>
          <PerspectiveCamera 
            makeDefault 
            position={[bounds.centerX + bounds.width, bounds.width * 0.8, bounds.centerZ + bounds.depth * 1.5]} 
            fov={50}
          />
          <OrbitControls 
            target={[bounds.centerX, 0.3, bounds.centerZ]}
            maxPolarAngle={Math.PI / 2.1}
            minDistance={0.5}
            maxDistance={bounds.width * 3}
            enableDamping
            dampingFactor={0.05}
          />
        </>
      )}
      
      {/* First Person Camera */}
      {viewMode === 'firstPerson' && (
        <>
          <PerspectiveCamera 
            makeDefault 
            position={[bounds.centerX, cameraHeightUnits, bounds.centerZ]} 
            fov={75}
          />
          <FirstPersonController
            position={firstPersonPosition}
            enabled={viewMode === 'firstPerson'}
            moveSpeed={0.02}
            lookSpeed={0.002}
            bounds={bounds}
          />
        </>
      )}
      
      {/* Main Lighting */}
      <ambientLight intensity={0.5} />
      
      {/* Hemisphere light for natural lighting */}
      <hemisphereLight 
        args={['#87CEEB', '#f0e68c', 0.6]}
      />
      
      {/* Sun light */}
      <directionalLight
        position={[bounds.centerX + 5, 10, bounds.centerZ - 5]}
        intensity={1.5}
        castShadow
        shadow-mapSize={qualityMode === 'high' ? [4096, 4096] : [2048, 2048]}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0001}
      />
      
      {/* Fill lights */}
      <directionalLight
        position={[bounds.centerX - 3, 6, bounds.centerZ + 3]}
        intensity={0.4}
        color="#b4d4ff"
      />
      
      {/* Rim light */}
      <directionalLight
        position={[bounds.centerX, 4, bounds.centerZ - 8]}
        intensity={0.3}
        color="#ffeedd"
      />
      
      {/* Contact Shadows for better grounding */}
      {qualityMode !== 'low' && (
        <ContactShadows
          position={[bounds.centerX, 0, bounds.centerZ]}
          opacity={0.4}
          scale={bounds.width * 2}
          blur={2}
          far={4}
          resolution={qualityMode === 'high' ? 512 : 256}
        />
      )}
      
      {/* Ground plane */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[bounds.centerX, -0.01, bounds.centerZ]}
        receiveShadow
      >
        <planeGeometry args={[bounds.width * 3, bounds.depth * 3]} />
        <meshStandardMaterial 
          color="#e2e8f0" 
          roughness={0.9}
        />
      </mesh>
      
      {/* Rooms */}
      {floorPlan.floor.rooms.map((room) => (
        <RoomMesh
          key={room.id}
          room={room}
          scale={scale}
          wallHeight={wallHeight}
          wallThickness={wallThickness}
          doorHeight={doorHeight}
          windowHeight={windowHeight}
          windowFromFloor={windowFromFloor}
          isSelected={room.id === selectedRoomId}
          isHovered={room.id === hoveredRoomId}
          showLabel={showLabels}
          showCeiling={showCeiling}
          onClick={() => onRoomClick?.(room.id)}
          onHover={(hovered) => onRoomHover(hovered ? room.id : null)}
        />
      ))}
      
      {/* Furniture */}
      {(floorPlan.floor.furniture ?? []).map((furniture) => (
        <FurnitureMesh
          key={furniture.id}
          furniture={furniture}
          scale={scale}
        />
      ))}
    </>
  );
}

export function FloorPlan3D({ floorPlan, selectedRoomId, onRoomClick }: FloorPlan3DProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('orbit');
  const [qualityMode, setQualityMode] = useState<QualityMode>('medium');
  const [cameraHeight, setCameraHeight] = useState(170);
  const [hoveredRoomId, setHoveredRoomId] = useState<string | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const [showCeiling, setShowCeiling] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  
  const handleEnterFirstPerson = useCallback(() => {
    setViewMode('firstPerson');
    canvasRef.current?.querySelector('canvas')?.requestPointerLock();
  }, []);
  
  const handleExitFirstPerson = useCallback(() => {
    setViewMode('orbit');
    document.exitPointerLock();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape' && viewMode === 'firstPerson') {
        handleExitFirstPerson();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, handleExitFirstPerson]);

  return (
    <div className="floor-plan-3d" ref={canvasRef}>
      <Canvas 
        shadows
        gl={{ 
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
        }}
        style={{ background: 'linear-gradient(to bottom, #87CEEB 0%, #E0E7EE 100%)' }}
      >
        <Scene 
          floorPlan={floorPlan} 
          selectedRoomId={selectedRoomId}
          onRoomClick={onRoomClick}
          viewMode={viewMode}
          qualityMode={qualityMode}
          cameraHeight={cameraHeight}
          hoveredRoomId={hoveredRoomId}
          onRoomHover={setHoveredRoomId}
          showLabels={showLabels}
          showCeiling={showCeiling}
        />
      </Canvas>
      
      {/* Controls Panel */}
      <div className="floor-plan-3d__controls">
        {/* View Mode Toggle */}
        <div className="floor-plan-3d__control-group">
          <label>Modo de Visualização</label>
          <div className="floor-plan-3d__button-group">
            <button 
              className={viewMode === 'orbit' ? 'active' : ''}
              onClick={() => setViewMode('orbit')}
            >
              🌐 Orbital
            </button>
            <button 
              className={viewMode === 'firstPerson' ? 'active' : ''}
              onClick={handleEnterFirstPerson}
            >
              👁️ Tour 360
            </button>
          </div>
        </div>
        
        {/* Quality Mode */}
        <div className="floor-plan-3d__control-group">
          <label>Qualidade</label>
          <div className="floor-plan-3d__button-group floor-plan-3d__button-group--small">
            <button 
              className={qualityMode === 'low' ? 'active' : ''}
              onClick={() => setQualityMode('low')}
              title="Baixa - Mais rápido"
            >
              🚀
            </button>
            <button 
              className={qualityMode === 'medium' ? 'active' : ''}
              onClick={() => setQualityMode('medium')}
              title="Média - Equilibrado"
            >
              ⚖️
            </button>
            <button 
              className={qualityMode === 'high' ? 'active' : ''}
              onClick={() => setQualityMode('high')}
              title="Alta - Melhor visual"
            >
              ✨
            </button>
          </div>
        </div>
        
        {/* Height Selector */}
        <div className="floor-plan-3d__control-group">
          <label>
            Altura da Visão: <strong>{cameraHeight}cm</strong>
          </label>
          <input
            type="range"
            min="100"
            max="220"
            value={cameraHeight}
            onChange={(e) => setCameraHeight(Number(e.target.value))}
            className="floor-plan-3d__slider"
          />
          <div className="floor-plan-3d__presets">
            {HEIGHT_PRESETS.map((preset) => (
              <button
                key={preset.height}
                className={cameraHeight === preset.height ? 'active' : ''}
                onClick={() => setCameraHeight(preset.height)}
                title={`${preset.label} (${preset.height}cm)`}
              >
                {preset.icon} {preset.height}
              </button>
            ))}
          </div>
        </div>
        
        {/* Options */}
        <div className="floor-plan-3d__control-group">
          <label className="floor-plan-3d__checkbox">
            <input 
              type="checkbox" 
              checked={showLabels} 
              onChange={(e) => setShowLabels(e.target.checked)}
            />
            Mostrar nomes
          </label>
          <label className="floor-plan-3d__checkbox">
            <input 
              type="checkbox" 
              checked={showCeiling} 
              onChange={(e) => setShowCeiling(e.target.checked)}
            />
            Mostrar teto
          </label>
        </div>
      </div>
      
      {/* Help Text */}
      <div className="floor-plan-3d__help">
        {viewMode === 'orbit' ? (
          <>
            <span>🖱️ Arrastar para rotacionar</span>
            <span>⚙️ Scroll para zoom</span>
          </>
        ) : (
          <>
            <span>🖱️ Mouse para olhar</span>
            <span>⌨️ WASD/Setas para mover</span>
            <span>⎋ ESC para sair</span>
          </>
        )}
      </div>
      
      {/* Hovered Room Info */}
      {hoveredRoomId && viewMode === 'orbit' && (
        <div className="floor-plan-3d__room-info">
          {floorPlan.floor.rooms.find(r => r.id === hoveredRoomId)?.name}
        </div>
      )}
    </div>
  );
}

export default FloorPlan3D;
