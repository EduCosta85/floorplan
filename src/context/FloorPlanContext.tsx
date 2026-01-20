import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  type ReactNode,
} from 'react';
import type {
  FloorPlan,
  Room,
  Wall,
  Opening,
  Defaults,
  WallSide,
  Furniture,
  Position,
} from '../types/floor-plan';

// Default empty floor plan
const createEmptyFloorPlan = (): FloorPlan => ({
  version: '0.3',
  unit: 'cm',
  scale: 0.2,
  defaults: {
    wall: { height: 280, thickness: 15 },
    door: { width: 80, height: 210 },
    window: { width: 120, height: 120, fromFloor: 100 },
  },
  floor: {
    id: 'terreo',
    name: 'Térreo',
    rooms: [],
    elements: [],
    furniture: [],
  },
});

// State
interface FloorPlanState {
  floorPlan: FloorPlan;
  selectedRoomId: string | null;
  selectedWallSide: WallSide | null;
  selectedFurnitureId: string | null;
  isDirty: boolean;
}

// Actions
type FloorPlanAction =
  | { type: 'SET_FLOOR_PLAN'; payload: FloorPlan }
  | { type: 'SELECT_ROOM'; payload: string | null }
  | { type: 'SELECT_WALL'; payload: { roomId: string; side: WallSide } | null }
  | { type: 'SELECT_FURNITURE'; payload: string | null }
  | { type: 'ADD_ROOM'; payload: Room }
  | { type: 'UPDATE_ROOM'; payload: { id: string; room: Partial<Room> } }
  | { type: 'DELETE_ROOM'; payload: string }
  | { type: 'UPDATE_WALL'; payload: { roomId: string; side: WallSide; wall: Partial<Wall> } }
  | { type: 'ADD_OPENING'; payload: { roomId: string; side: WallSide; opening: Opening } }
  | { type: 'UPDATE_OPENING'; payload: { roomId: string; side: WallSide; index: number; opening: Partial<Opening> } }
  | { type: 'DELETE_OPENING'; payload: { roomId: string; side: WallSide; index: number } }
  | { type: 'UPDATE_DEFAULTS'; payload: Partial<Defaults> }
  | { type: 'UPDATE_CONFIG'; payload: Partial<Pick<FloorPlan, 'unit' | 'scale'>> }
  | { type: 'ADD_FURNITURE'; payload: Furniture }
  | { type: 'UPDATE_FURNITURE'; payload: { id: string; furniture: Partial<Furniture> } }
  | { type: 'DELETE_FURNITURE'; payload: string }
  | { type: 'MOVE_FURNITURE'; payload: { id: string; position: Position } }
  | { type: 'MARK_CLEAN' };

// Reducer
function floorPlanReducer(state: FloorPlanState, action: FloorPlanAction): FloorPlanState {
  switch (action.type) {
    case 'SET_FLOOR_PLAN':
      return {
        ...state,
        floorPlan: {
          ...action.payload,
          floor: {
            ...action.payload.floor,
            furniture: action.payload.floor.furniture ?? [],
          },
        },
        selectedRoomId: null,
        selectedWallSide: null,
        selectedFurnitureId: null,
        isDirty: false,
      };

    case 'SELECT_ROOM':
      return {
        ...state,
        selectedRoomId: action.payload,
        selectedWallSide: null,
        selectedFurnitureId: null,
      };

    case 'SELECT_WALL':
      return {
        ...state,
        selectedRoomId: action.payload?.roomId ?? state.selectedRoomId,
        selectedWallSide: action.payload?.side ?? null,
        selectedFurnitureId: null,
      };

    case 'SELECT_FURNITURE':
      return {
        ...state,
        selectedFurnitureId: action.payload,
        selectedRoomId: null,
        selectedWallSide: null,
      };

    case 'ADD_ROOM':
      return {
        ...state,
        floorPlan: {
          ...state.floorPlan,
          floor: {
            ...state.floorPlan.floor,
            rooms: [...state.floorPlan.floor.rooms, action.payload],
          },
        },
        selectedRoomId: action.payload.id,
        selectedFurnitureId: null,
        isDirty: true,
      };

    case 'UPDATE_ROOM': {
      const rooms = state.floorPlan.floor.rooms.map((room) =>
        room.id === action.payload.id
          ? { ...room, ...action.payload.room }
          : room
      );
      return {
        ...state,
        floorPlan: {
          ...state.floorPlan,
          floor: { ...state.floorPlan.floor, rooms },
        },
        isDirty: true,
      };
    }

    case 'DELETE_ROOM': {
      const rooms = state.floorPlan.floor.rooms.filter(
        (room) => room.id !== action.payload
      );
      return {
        ...state,
        floorPlan: {
          ...state.floorPlan,
          floor: { ...state.floorPlan.floor, rooms },
        },
        selectedRoomId: state.selectedRoomId === action.payload ? null : state.selectedRoomId,
        isDirty: true,
      };
    }

    case 'UPDATE_WALL': {
      const rooms = state.floorPlan.floor.rooms.map((room) => {
        if (room.id !== action.payload.roomId) return room;
        return {
          ...room,
          walls: {
            ...room.walls,
            [action.payload.side]: {
              ...room.walls[action.payload.side],
              ...action.payload.wall,
            },
          },
        };
      });
      return {
        ...state,
        floorPlan: {
          ...state.floorPlan,
          floor: { ...state.floorPlan.floor, rooms },
        },
        isDirty: true,
      };
    }

    case 'ADD_OPENING': {
      const rooms = state.floorPlan.floor.rooms.map((room) => {
        if (room.id !== action.payload.roomId) return room;
        const wall = room.walls[action.payload.side];
        return {
          ...room,
          walls: {
            ...room.walls,
            [action.payload.side]: {
              ...wall,
              openings: [...(wall.openings ?? []), action.payload.opening],
            },
          },
        };
      });
      return {
        ...state,
        floorPlan: {
          ...state.floorPlan,
          floor: { ...state.floorPlan.floor, rooms },
        },
        isDirty: true,
      };
    }

    case 'UPDATE_OPENING': {
      const rooms = state.floorPlan.floor.rooms.map((room) => {
        if (room.id !== action.payload.roomId) return room;
        const wall = room.walls[action.payload.side];
        const openings = (wall.openings ?? []).map((op, i) =>
          i === action.payload.index ? { ...op, ...action.payload.opening } : op
        );
        return {
          ...room,
          walls: {
            ...room.walls,
            [action.payload.side]: { ...wall, openings },
          },
        };
      });
      return {
        ...state,
        floorPlan: {
          ...state.floorPlan,
          floor: { ...state.floorPlan.floor, rooms },
        },
        isDirty: true,
      };
    }

    case 'DELETE_OPENING': {
      const rooms = state.floorPlan.floor.rooms.map((room) => {
        if (room.id !== action.payload.roomId) return room;
        const wall = room.walls[action.payload.side];
        const openings = (wall.openings ?? []).filter((_, i) => i !== action.payload.index);
        return {
          ...room,
          walls: {
            ...room.walls,
            [action.payload.side]: { ...wall, openings },
          },
        };
      });
      return {
        ...state,
        floorPlan: {
          ...state.floorPlan,
          floor: { ...state.floorPlan.floor, rooms },
        },
        isDirty: true,
      };
    }

    case 'UPDATE_DEFAULTS':
      return {
        ...state,
        floorPlan: {
          ...state.floorPlan,
          defaults: {
            ...state.floorPlan.defaults,
            ...action.payload,
          },
        },
        isDirty: true,
      };

    case 'UPDATE_CONFIG':
      return {
        ...state,
        floorPlan: {
          ...state.floorPlan,
          ...action.payload,
        },
        isDirty: true,
      };

    // Furniture actions
    case 'ADD_FURNITURE': {
      const furniture = state.floorPlan.floor.furniture ?? [];
      return {
        ...state,
        floorPlan: {
          ...state.floorPlan,
          floor: {
            ...state.floorPlan.floor,
            furniture: [...furniture, action.payload],
          },
        },
        selectedFurnitureId: action.payload.id,
        selectedRoomId: null,
        selectedWallSide: null,
        isDirty: true,
      };
    }

    case 'UPDATE_FURNITURE': {
      const furniture = (state.floorPlan.floor.furniture ?? []).map((f) =>
        f.id === action.payload.id
          ? { ...f, ...action.payload.furniture }
          : f
      );
      return {
        ...state,
        floorPlan: {
          ...state.floorPlan,
          floor: { ...state.floorPlan.floor, furniture },
        },
        isDirty: true,
      };
    }

    case 'DELETE_FURNITURE': {
      const furniture = (state.floorPlan.floor.furniture ?? []).filter(
        (f) => f.id !== action.payload
      );
      return {
        ...state,
        floorPlan: {
          ...state.floorPlan,
          floor: { ...state.floorPlan.floor, furniture },
        },
        selectedFurnitureId: state.selectedFurnitureId === action.payload ? null : state.selectedFurnitureId,
        isDirty: true,
      };
    }

    case 'MOVE_FURNITURE': {
      const furniture = (state.floorPlan.floor.furniture ?? []).map((f) =>
        f.id === action.payload.id
          ? { ...f, position: action.payload.position }
          : f
      );
      return {
        ...state,
        floorPlan: {
          ...state.floorPlan,
          floor: { ...state.floorPlan.floor, furniture },
        },
        isDirty: true,
      };
    }

    case 'MARK_CLEAN':
      return { ...state, isDirty: false };

    default:
      return state;
  }
}

// Context
interface FloorPlanContextValue {
  state: FloorPlanState;
  // Selection
  selectRoom: (id: string | null) => void;
  selectWall: (roomId: string, side: WallSide) => void;
  selectFurniture: (id: string | null) => void;
  clearSelection: () => void;
  // Room operations
  addRoom: (room: Room) => void;
  updateRoom: (id: string, room: Partial<Room>) => void;
  deleteRoom: (id: string) => void;
  // Wall operations
  updateWall: (roomId: string, side: WallSide, wall: Partial<Wall>) => void;
  // Opening operations
  addOpening: (roomId: string, side: WallSide, opening: Opening) => void;
  updateOpening: (roomId: string, side: WallSide, index: number, opening: Partial<Opening>) => void;
  deleteOpening: (roomId: string, side: WallSide, index: number) => void;
  // Config operations
  updateDefaults: (defaults: Partial<Defaults>) => void;
  updateConfig: (config: Partial<Pick<FloorPlan, 'unit' | 'scale'>>) => void;
  // Furniture operations
  addFurniture: (furniture: Furniture) => void;
  updateFurniture: (id: string, furniture: Partial<Furniture>) => void;
  deleteFurniture: (id: string) => void;
  moveFurniture: (id: string, position: Position) => void;
  rotateFurniture: (id: string) => void;
  // Import/Export
  importFloorPlan: (floorPlan: FloorPlan) => void;
  exportFloorPlan: () => FloorPlan;
  // State management
  markClean: () => void;
  // Helpers
  getSelectedRoom: () => Room | null;
  getSelectedFurniture: () => Furniture | null;
  generateRoomId: () => string;
  generateFurnitureId: () => string;
}

const FloorPlanContext = createContext<FloorPlanContextValue | null>(null);

// Provider
interface FloorPlanProviderProps {
  children: ReactNode;
  initialFloorPlan?: FloorPlan;
}

export function FloorPlanProvider({ children, initialFloorPlan }: FloorPlanProviderProps) {
  const [state, dispatch] = useReducer(floorPlanReducer, {
    floorPlan: initialFloorPlan ?? createEmptyFloorPlan(),
    selectedRoomId: null,
    selectedWallSide: null,
    selectedFurnitureId: null,
    isDirty: false,
  });

  const selectRoom = useCallback((id: string | null) => {
    dispatch({ type: 'SELECT_ROOM', payload: id });
  }, []);

  const selectWall = useCallback((roomId: string, side: WallSide) => {
    dispatch({ type: 'SELECT_WALL', payload: { roomId, side } });
  }, []);

  const selectFurniture = useCallback((id: string | null) => {
    dispatch({ type: 'SELECT_FURNITURE', payload: id });
  }, []);

  const clearSelection = useCallback(() => {
    dispatch({ type: 'SELECT_ROOM', payload: null });
  }, []);

  const addRoom = useCallback((room: Room) => {
    dispatch({ type: 'ADD_ROOM', payload: room });
  }, []);

  const updateRoom = useCallback((id: string, room: Partial<Room>) => {
    dispatch({ type: 'UPDATE_ROOM', payload: { id, room } });
  }, []);

  const deleteRoom = useCallback((id: string) => {
    dispatch({ type: 'DELETE_ROOM', payload: id });
  }, []);

  const updateWall = useCallback((roomId: string, side: WallSide, wall: Partial<Wall>) => {
    dispatch({ type: 'UPDATE_WALL', payload: { roomId, side, wall } });
  }, []);

  const addOpening = useCallback((roomId: string, side: WallSide, opening: Opening) => {
    dispatch({ type: 'ADD_OPENING', payload: { roomId, side, opening } });
  }, []);

  const updateOpening = useCallback(
    (roomId: string, side: WallSide, index: number, opening: Partial<Opening>) => {
      dispatch({ type: 'UPDATE_OPENING', payload: { roomId, side, index, opening } });
    },
    []
  );

  const deleteOpening = useCallback((roomId: string, side: WallSide, index: number) => {
    dispatch({ type: 'DELETE_OPENING', payload: { roomId, side, index } });
  }, []);

  const updateDefaults = useCallback((defaults: Partial<Defaults>) => {
    dispatch({ type: 'UPDATE_DEFAULTS', payload: defaults });
  }, []);

  const updateConfig = useCallback((config: Partial<Pick<FloorPlan, 'unit' | 'scale'>>) => {
    dispatch({ type: 'UPDATE_CONFIG', payload: config });
  }, []);

  // Furniture operations
  const addFurniture = useCallback((furniture: Furniture) => {
    dispatch({ type: 'ADD_FURNITURE', payload: furniture });
  }, []);

  const updateFurniture = useCallback((id: string, furniture: Partial<Furniture>) => {
    dispatch({ type: 'UPDATE_FURNITURE', payload: { id, furniture } });
  }, []);

  const deleteFurniture = useCallback((id: string) => {
    dispatch({ type: 'DELETE_FURNITURE', payload: id });
  }, []);

  const moveFurniture = useCallback((id: string, position: Position) => {
    dispatch({ type: 'MOVE_FURNITURE', payload: { id, position } });
  }, []);

  const rotateFurniture = useCallback((id: string) => {
    const furniture = state.floorPlan.floor.furniture?.find((f) => f.id === id);
    if (furniture) {
      const newRotation = (furniture.rotation + 90) % 360;
      dispatch({ type: 'UPDATE_FURNITURE', payload: { id, furniture: { rotation: newRotation } } });
    }
  }, [state.floorPlan.floor.furniture]);

  const importFloorPlan = useCallback((floorPlan: FloorPlan) => {
    dispatch({ type: 'SET_FLOOR_PLAN', payload: floorPlan });
  }, []);

  const exportFloorPlan = useCallback(() => {
    return state.floorPlan;
  }, [state.floorPlan]);

  const markClean = useCallback(() => {
    dispatch({ type: 'MARK_CLEAN' });
  }, []);

  const getSelectedRoom = useCallback(() => {
    if (!state.selectedRoomId) return null;
    return state.floorPlan.floor.rooms.find((r) => r.id === state.selectedRoomId) ?? null;
  }, [state.selectedRoomId, state.floorPlan.floor.rooms]);

  const getSelectedFurniture = useCallback(() => {
    if (!state.selectedFurnitureId) return null;
    return state.floorPlan.floor.furniture?.find((f) => f.id === state.selectedFurnitureId) ?? null;
  }, [state.selectedFurnitureId, state.floorPlan.floor.furniture]);

  const generateRoomId = useCallback(() => {
    const existing = state.floorPlan.floor.rooms.map((r) => r.id);
    let counter = existing.length + 1;
    let id = `room-${counter}`;
    while (existing.includes(id)) {
      counter++;
      id = `room-${counter}`;
    }
    return id;
  }, [state.floorPlan.floor.rooms]);

  const generateFurnitureId = useCallback(() => {
    const existing = (state.floorPlan.floor.furniture ?? []).map((f) => f.id);
    let counter = existing.length + 1;
    let id = `furniture-${counter}`;
    while (existing.includes(id)) {
      counter++;
      id = `furniture-${counter}`;
    }
    return id;
  }, [state.floorPlan.floor.furniture]);

  const value: FloorPlanContextValue = {
    state,
    selectRoom,
    selectWall,
    selectFurniture,
    clearSelection,
    addRoom,
    updateRoom,
    deleteRoom,
    updateWall,
    addOpening,
    updateOpening,
    deleteOpening,
    updateDefaults,
    updateConfig,
    addFurniture,
    updateFurniture,
    deleteFurniture,
    moveFurniture,
    rotateFurniture,
    importFloorPlan,
    exportFloorPlan,
    markClean,
    getSelectedRoom,
    getSelectedFurniture,
    generateRoomId,
    generateFurnitureId,
  };

  return (
    <FloorPlanContext.Provider value={value}>
      {children}
    </FloorPlanContext.Provider>
  );
}

// Hook
export function useFloorPlan() {
  const context = useContext(FloorPlanContext);
  if (!context) {
    throw new Error('useFloorPlan must be used within a FloorPlanProvider');
  }
  return context;
}

export { createEmptyFloorPlan };
