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
  },
});

// State
interface FloorPlanState {
  floorPlan: FloorPlan;
  selectedRoomId: string | null;
  selectedWallSide: WallSide | null;
  isDirty: boolean;
}

// Actions
type FloorPlanAction =
  | { type: 'SET_FLOOR_PLAN'; payload: FloorPlan }
  | { type: 'SELECT_ROOM'; payload: string | null }
  | { type: 'SELECT_WALL'; payload: { roomId: string; side: WallSide } | null }
  | { type: 'ADD_ROOM'; payload: Room }
  | { type: 'UPDATE_ROOM'; payload: { id: string; room: Partial<Room> } }
  | { type: 'DELETE_ROOM'; payload: string }
  | { type: 'UPDATE_WALL'; payload: { roomId: string; side: WallSide; wall: Partial<Wall> } }
  | { type: 'ADD_OPENING'; payload: { roomId: string; side: WallSide; opening: Opening } }
  | { type: 'UPDATE_OPENING'; payload: { roomId: string; side: WallSide; index: number; opening: Partial<Opening> } }
  | { type: 'DELETE_OPENING'; payload: { roomId: string; side: WallSide; index: number } }
  | { type: 'UPDATE_DEFAULTS'; payload: Partial<Defaults> }
  | { type: 'UPDATE_CONFIG'; payload: Partial<Pick<FloorPlan, 'unit' | 'scale'>> }
  | { type: 'MARK_CLEAN' };

// Reducer
function floorPlanReducer(state: FloorPlanState, action: FloorPlanAction): FloorPlanState {
  switch (action.type) {
    case 'SET_FLOOR_PLAN':
      return {
        ...state,
        floorPlan: action.payload,
        selectedRoomId: null,
        selectedWallSide: null,
        isDirty: false,
      };

    case 'SELECT_ROOM':
      return {
        ...state,
        selectedRoomId: action.payload,
        selectedWallSide: null,
      };

    case 'SELECT_WALL':
      return {
        ...state,
        selectedRoomId: action.payload?.roomId ?? state.selectedRoomId,
        selectedWallSide: action.payload?.side ?? null,
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
  // Import/Export
  importFloorPlan: (floorPlan: FloorPlan) => void;
  exportFloorPlan: () => FloorPlan;
  // Helpers
  getSelectedRoom: () => Room | null;
  generateRoomId: () => string;
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
    isDirty: false,
  });

  const selectRoom = useCallback((id: string | null) => {
    dispatch({ type: 'SELECT_ROOM', payload: id });
  }, []);

  const selectWall = useCallback((roomId: string, side: WallSide) => {
    dispatch({ type: 'SELECT_WALL', payload: { roomId, side } });
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

  const importFloorPlan = useCallback((floorPlan: FloorPlan) => {
    dispatch({ type: 'SET_FLOOR_PLAN', payload: floorPlan });
  }, []);

  const exportFloorPlan = useCallback(() => {
    return state.floorPlan;
  }, [state.floorPlan]);

  const getSelectedRoom = useCallback(() => {
    if (!state.selectedRoomId) return null;
    return state.floorPlan.floor.rooms.find((r) => r.id === state.selectedRoomId) ?? null;
  }, [state.selectedRoomId, state.floorPlan.floor.rooms]);

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

  const value: FloorPlanContextValue = {
    state,
    selectRoom,
    selectWall,
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
    importFloorPlan,
    exportFloorPlan,
    getSelectedRoom,
    generateRoomId,
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
