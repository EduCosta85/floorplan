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
import type { RoomMaterials } from '../../types/floor-plan';

type Tab = 'room' | 'alerts' | 'config' | 'import';

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
    importFloorPlan,
    exportFloorPlan,
  } = useFloorPlan();

  const [activeTab, setActiveTab] = useState<Tab>('room');
  const [isCreating, setIsCreating] = useState(false);
  const [expandedWall, setExpandedWall] = useState<WallSide | null>(null);

  const selectedRoom = getSelectedRoom();

  const errorCount = validationIssues.filter(i => i.severity === 'error').length;
  const warningCount = validationIssues.filter(i => i.severity === 'warning').length;
  const totalIssues = errorCount + warningCount;

  const handleExport = () => {
    const data = exportFloorPlan();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `floor-plan-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        importFloorPlan(data);
      } catch {
        alert('Erro ao importar arquivo JSON');
      }
    };
    reader.readAsText(file);
  };

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
          className={`editor-panel__tab ${activeTab === 'room' ? 'active' : ''}`}
          onClick={() => setActiveTab('room')}
        >
          Cômodos
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
        <button
          className={`editor-panel__tab ${activeTab === 'import' ? 'active' : ''}`}
          onClick={() => setActiveTab('import')}
        >
          Arquivo
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

        {activeTab === 'alerts' && (
          <ValidationWarnings
            issues={validationIssues}
            onIssueClick={onIssueClick}
          />
        )}

        {activeTab === 'config' && <ConfigPanel />}

        {activeTab === 'import' && (
          <div className="import-export">
            <h3>Importar / Exportar</h3>

            <div className="import-export__section">
              <h4>Exportar</h4>
              <p>Baixe o projeto atual como arquivo JSON.</p>
              <Button variant="primary" onClick={handleExport}>
                Exportar JSON
              </Button>
            </div>

            <div className="import-export__section">
              <h4>Importar</h4>
              <p>Carregue um arquivo JSON de planta.</p>
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="import-export__file-input"
              />
            </div>

            {state.isDirty && (
              <p className="import-export__warning">
                ⚠️ Há alterações não salvas
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default EditorPanel;
