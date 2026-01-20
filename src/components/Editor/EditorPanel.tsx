import { useState } from 'react';
import type { WallSide } from '../../types/floor-plan';
import type { ValidationIssue } from '../../utils/validation';
import { useFloorPlan } from '../../context/FloorPlanContext';
import { Button } from '../ui';
import { RoomForm } from './RoomForm';
import { WallForm } from './WallForm';
import { OpeningForm } from './OpeningForm';
import { ConfigPanel } from './ConfigPanel';
import { ValidationWarnings } from '../ValidationWarnings';
import { MaterialsPanel } from './MaterialsPanel';
import { ProjectsPanel } from './ProjectsPanel';
import { FurniturePanel } from './FurniturePanel';
import type { RoomMaterials } from '../../types/floor-plan';

type Tab = 'projects' | 'room' | 'furniture' | 'alerts' | 'config';

const WALL_SIDES: WallSide[] = ['north', 'east', 'south', 'west'];
const SIDE_LABELS: Record<WallSide, string> = {
  north: 'Norte',
  east: 'Leste',
  south: 'Sul',
  west: 'Oeste',
};

interface EditorPanelProps {
  validationIssues?: ValidationIssue[];
  onIssueClick?: (issue: ValidationIssue) => void;
}

export function EditorPanel({ validationIssues = [], onIssueClick }: EditorPanelProps) {
  const {
    state,
    getSelectedRoom,
    deleteRoom,
    selectRoom,
    updateRoom,
  } = useFloorPlan();

  const [activeTab, setActiveTab] = useState<Tab>('room');
  const [isCreating, setIsCreating] = useState(false);
  const [expandedWall, setExpandedWall] = useState<WallSide | null>(null);

  const selectedRoom = getSelectedRoom();

  const errorCount = validationIssues.filter(i => i.severity === 'error').length;
  const warningCount = validationIssues.filter(i => i.severity === 'warning').length;
  const totalIssues = errorCount + warningCount;

  const handleDelete = () => {
    if (selectedRoom && confirm(`Excluir "${selectedRoom.name}"?`)) {
      deleteRoom(selectedRoom.id);
    }
  };

  const handleUpdateMaterials = (materials: RoomMaterials) => {
    if (selectedRoom) {
      updateRoom(selectedRoom.id, { materials });
    }
  };

  const getWallIcon = (side: WallSide) => {
    switch (side) {
      case 'north': return '⬆️';
      case 'east': return '➡️';
      case 'south': return '⬇️';
      case 'west': return '⬅️';
    }
  };

  return (
    <div className="editor-panel">
      {/* Tabs */}
      <div className="editor-panel__tabs">
        <button
          className={`editor-panel__tab ${activeTab === 'projects' ? 'active' : ''}`}
          onClick={() => setActiveTab('projects')}
        >
          📁 Projetos
        </button>
        <button
          className={`editor-panel__tab ${activeTab === 'room' ? 'active' : ''}`}
          onClick={() => setActiveTab('room')}
        >
          Cômodos
        </button>
        <button
          className={`editor-panel__tab ${activeTab === 'furniture' ? 'active' : ''}`}
          onClick={() => setActiveTab('furniture')}
        >
          🪑 Móveis
        </button>
        <button
          className={`editor-panel__tab ${activeTab === 'alerts' ? 'active' : ''}`}
          onClick={() => setActiveTab('alerts')}
        >
          Alertas
          {totalIssues > 0 && (
            <span className={`editor-panel__tab-badge ${errorCount > 0 ? 'error' : 'warning'}`}>
              {totalIssues}
            </span>
          )}
        </button>
        <button
          className={`editor-panel__tab ${activeTab === 'config' ? 'active' : ''}`}
          onClick={() => setActiveTab('config')}
        >
          Config
        </button>
      </div>

      {/* Content */}
      <div className="editor-panel__content">
        {activeTab === 'room' && (
          <>
            {isCreating ? (
              <RoomForm onClose={() => setIsCreating(false)} />
            ) : selectedRoom ? (
              <div className="room-editor">
                <div className="room-editor__header-nav">
                  <Button variant="ghost" size="sm" onClick={() => selectRoom(null)}>
                    ← Voltar para lista
                  </Button>
                </div>
                
                <div className="room-editor__title">
                  <h3>{selectedRoom.name}</h3>
                  <span className="room-editor__id">#{selectedRoom.id.slice(0, 4)}</span>
                </div>

                <RoomForm room={selectedRoom} />

                <div className="room-editor__walls">
                  <h4 className="section-title">Paredes & Aberturas</h4>
                  <div className="walls-list">
                    {WALL_SIDES.map((side) => (
                      <div key={side} className={`wall-item ${expandedWall === side ? 'expanded' : ''}`}>
                        <button
                          className="wall-item__header"
                          onClick={() => setExpandedWall(expandedWall === side ? null : side)}
                        >
                          <div className="wall-item__info">
                            <span className="wall-item__icon">{getWallIcon(side)}</span>
                            <span className="wall-item__label">{SIDE_LABELS[side]}</span>
                            <span className="wall-item__length">{selectedRoom.walls[side].length ?? 0} cm</span>
                          </div>
                          <span className="wall-item__chevron">
                            {expandedWall === side ? '−' : '+'}
                          </span>
                        </button>
                        {expandedWall === side && (
                          <div className="wall-item__content">
                            <WallForm
                              roomId={selectedRoom.id}
                              side={side}
                              wall={selectedRoom.walls[side]}
                            />
                            <OpeningForm
                              roomId={selectedRoom.id}
                              side={side}
                              openings={selectedRoom.walls[side].openings ?? []}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="room-editor__materials">
                  <MaterialsPanel
                    room={selectedRoom}
                    onUpdateMaterials={handleUpdateMaterials}
                  />
                </div>

                <div className="room-editor__actions">
                  <Button variant="danger" onClick={handleDelete} className="w-full">
                    Excluir Cômodo
                  </Button>
                </div>
              </div>
            ) : (
              <div className="room-list">
                <Button variant="primary" onClick={() => setIsCreating(true)}>
                  + Novo Cômodo
                </Button>

                <h4>Cômodos ({state.floorPlan.floor.rooms.length})</h4>
                <ul className="room-list__items">
                  {state.floorPlan.floor.rooms.map((room) => (
                    <li key={room.id}>
                      <button
                        className="room-list__item"
                        onClick={() => selectRoom(room.id)}
                      >
                        <strong>{room.name}</strong>
                        <small>
                          {room.walls.north.length}x{room.walls.east.length} cm
                        </small>
                      </button>
                    </li>
                  ))}
                </ul>

                {state.floorPlan.floor.rooms.length === 0 && (
                  <p className="room-list__empty">
                    Nenhum cômodo criado.<br />
                    Clique em "+ Novo Cômodo" para começar.
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === 'projects' && <ProjectsPanel />}

        {activeTab === 'furniture' && <FurniturePanel />}

        {activeTab === 'alerts' && (
          <ValidationWarnings
            issues={validationIssues}
            onIssueClick={onIssueClick}
          />
        )}

        {activeTab === 'config' && <ConfigPanel />}
      </div>
    </div>
  );
}

export default EditorPanel;
