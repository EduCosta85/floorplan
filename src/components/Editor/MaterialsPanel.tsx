import { useState, useRef } from 'react';
import type { Room, RoomMaterials, FloorMaterialType, WallMaterialType, CeilingMaterialType } from '../../types/floor-plan';
import {
  FLOOR_MATERIALS,
  WALL_MATERIALS,
  CEILING_MATERIALS,
  STYLE_PRESETS,
  type MaterialDefinition,
  type StylePreset,
} from '../../data/materials-library';
import { Button } from '../ui';

type MaterialCategory = 'floor' | 'walls' | 'ceiling';

interface MaterialsPanelProps {
  room: Room;
  onUpdateMaterials: (materials: RoomMaterials) => void;
}

interface MaterialSwatchProps {
  material: MaterialDefinition;
  isSelected: boolean;
  onClick: () => void;
}

function MaterialSwatch({ material, isSelected, onClick }: MaterialSwatchProps) {
  return (
    <button
      className={`material-swatch ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
      title={material.name}
      style={{
        background: material.preview,
        backgroundSize: material.pattern === 'tile' ? '22px 22px' : 'cover',
      }}
    >
      {isSelected && <span className="material-swatch__check">✓</span>}
    </button>
  );
}

interface PresetCardProps {
  preset: StylePreset;
  onClick: () => void;
}

function PresetCard({ preset, onClick }: PresetCardProps) {
  return (
    <button className="preset-card" onClick={onClick}>
      <span className="preset-card__icon">{preset.icon}</span>
      <span className="preset-card__name">{preset.name}</span>
      <span className="preset-card__desc">{preset.description}</span>
    </button>
  );
}

export function MaterialsPanel({ room, onUpdateMaterials }: MaterialsPanelProps) {
  const [activeCategory, setActiveCategory] = useState<MaterialCategory>('floor');
  const [showPresets, setShowPresets] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentMaterials: RoomMaterials = room.materials ?? {
    floor: { type: 'tile-white' },
    walls: { type: 'paint-white' },
    ceiling: { type: 'paint-white' },
  };

  const handleFloorChange = (type: FloorMaterialType) => {
    onUpdateMaterials({
      ...currentMaterials,
      floor: { type, color: FLOOR_MATERIALS[type].color },
    });
  };

  const handleWallChange = (type: WallMaterialType) => {
    onUpdateMaterials({
      ...currentMaterials,
      walls: { type, color: WALL_MATERIALS[type].color },
    });
  };

  const handleCeilingChange = (type: CeilingMaterialType) => {
    onUpdateMaterials({
      ...currentMaterials,
      ceiling: { type, color: CEILING_MATERIALS[type].color },
    });
  };

  const handlePresetApply = (preset: StylePreset) => {
    onUpdateMaterials({
      floor: { type: preset.floor, color: FLOOR_MATERIALS[preset.floor].color },
      walls: { type: preset.walls, color: WALL_MATERIALS[preset.walls].color },
      ceiling: { type: preset.ceiling, color: CEILING_MATERIALS[preset.ceiling].color },
    });
    setShowPresets(false);
  };

  const handleCustomTextureUpload = (category: MaterialCategory) => {
    if (fileInputRef.current) {
      fileInputRef.current.dataset.category = category;
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const category = e.target.dataset.category as MaterialCategory;
    
    if (!file || !category) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      
      if (category === 'floor') {
        onUpdateMaterials({
          ...currentMaterials,
          floor: { type: 'custom', customTexture: dataUrl },
        });
      } else if (category === 'walls') {
        onUpdateMaterials({
          ...currentMaterials,
          walls: { type: 'custom', customTexture: dataUrl },
        });
      } else if (category === 'ceiling') {
        onUpdateMaterials({
          ...currentMaterials,
          ceiling: { type: 'custom', customTexture: dataUrl },
        });
      }
    };
    reader.readAsDataURL(file);
    
    // Reset input
    e.target.value = '';
  };

  const groupByCategory = <T extends MaterialDefinition>(materials: Record<string, T>) => {
    const groups: Record<string, T[]> = {};
    Object.values(materials).forEach((mat) => {
      if (mat.id === 'custom') return; // Skip custom, we'll add it separately
      if (!groups[mat.category]) groups[mat.category] = [];
      groups[mat.category].push(mat);
    });
    return groups;
  };

  const floorGroups = groupByCategory(FLOOR_MATERIALS);
  const wallGroups = groupByCategory(WALL_MATERIALS);
  const ceilingGroups = groupByCategory(CEILING_MATERIALS);

  return (
    <div className="materials-panel">
      <div className="materials-panel__header">
        <h4>Materiais</h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowPresets(!showPresets)}
        >
          {showPresets ? '← Voltar' : '🎨 Estilos'}
        </Button>
      </div>

      {showPresets ? (
        <div className="materials-panel__presets">
          <p className="materials-panel__hint">
            Aplique um estilo pré-definido a todo o cômodo:
          </p>
          <div className="presets-grid">
            {STYLE_PRESETS.map((preset) => (
              <PresetCard
                key={preset.id}
                preset={preset}
                onClick={() => handlePresetApply(preset)}
              />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Category Tabs */}
          <div className="materials-panel__tabs">
            <button
              className={activeCategory === 'floor' ? 'active' : ''}
              onClick={() => setActiveCategory('floor')}
            >
              🏠 Piso
            </button>
            <button
              className={activeCategory === 'walls' ? 'active' : ''}
              onClick={() => setActiveCategory('walls')}
            >
              🧱 Paredes
            </button>
            <button
              className={activeCategory === 'ceiling' ? 'active' : ''}
              onClick={() => setActiveCategory('ceiling')}
            >
              ⬜ Teto
            </button>
          </div>

          {/* Floor Materials */}
          {activeCategory === 'floor' && (
            <div className="materials-panel__content">
              {Object.entries(floorGroups).map(([category, materials]) => (
                <div key={category} className="material-group">
                  <h5 className="material-group__title">{category}</h5>
                  <div className="material-group__swatches">
                    {materials.map((mat) => (
                      <MaterialSwatch
                        key={mat.id}
                        material={mat}
                        isSelected={currentMaterials.floor?.type === mat.id}
                        onClick={() => handleFloorChange(mat.id as FloorMaterialType)}
                      />
                    ))}
                  </div>
                </div>
              ))}
              <div className="material-group">
                <h5 className="material-group__title">Personalizado</h5>
                <button
                  className={`material-swatch material-swatch--upload ${currentMaterials.floor?.type === 'custom' ? 'selected' : ''}`}
                  onClick={() => handleCustomTextureUpload('floor')}
                  title="Enviar textura personalizada"
                >
                  {currentMaterials.floor?.type === 'custom' && currentMaterials.floor.customTexture ? (
                    <img src={currentMaterials.floor.customTexture} alt="Custom" />
                  ) : (
                    <span>📤</span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Wall Materials */}
          {activeCategory === 'walls' && (
            <div className="materials-panel__content">
              {Object.entries(wallGroups).map(([category, materials]) => (
                <div key={category} className="material-group">
                  <h5 className="material-group__title">{category}</h5>
                  <div className="material-group__swatches">
                    {materials.map((mat) => (
                      <MaterialSwatch
                        key={mat.id}
                        material={mat}
                        isSelected={currentMaterials.walls?.type === mat.id}
                        onClick={() => handleWallChange(mat.id as WallMaterialType)}
                      />
                    ))}
                  </div>
                </div>
              ))}
              <div className="material-group">
                <h5 className="material-group__title">Personalizado</h5>
                <button
                  className={`material-swatch material-swatch--upload ${currentMaterials.walls?.type === 'custom' ? 'selected' : ''}`}
                  onClick={() => handleCustomTextureUpload('walls')}
                  title="Enviar textura personalizada"
                >
                  {currentMaterials.walls?.type === 'custom' && currentMaterials.walls.customTexture ? (
                    <img src={currentMaterials.walls.customTexture} alt="Custom" />
                  ) : (
                    <span>📤</span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Ceiling Materials */}
          {activeCategory === 'ceiling' && (
            <div className="materials-panel__content">
              {Object.entries(ceilingGroups).map(([category, materials]) => (
                <div key={category} className="material-group">
                  <h5 className="material-group__title">{category}</h5>
                  <div className="material-group__swatches">
                    {materials.map((mat) => (
                      <MaterialSwatch
                        key={mat.id}
                        material={mat}
                        isSelected={currentMaterials.ceiling?.type === mat.id}
                        onClick={() => handleCeilingChange(mat.id as CeilingMaterialType)}
                      />
                    ))}
                  </div>
                </div>
              ))}
              <div className="material-group">
                <h5 className="material-group__title">Personalizado</h5>
                <button
                  className={`material-swatch material-swatch--upload ${currentMaterials.ceiling?.type === 'custom' ? 'selected' : ''}`}
                  onClick={() => handleCustomTextureUpload('ceiling')}
                  title="Enviar textura personalizada"
                >
                  {currentMaterials.ceiling?.type === 'custom' && currentMaterials.ceiling.customTexture ? (
                    <img src={currentMaterials.ceiling.customTexture} alt="Custom" />
                  ) : (
                    <span>📤</span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Current Selection Preview */}
          <div className="materials-panel__preview">
            <h5>Seleção Atual</h5>
            <div className="preview-items">
              <div className="preview-item">
                <span className="preview-item__label">Piso:</span>
                <span className="preview-item__value">
                  {currentMaterials.floor?.type === 'custom' 
                    ? 'Personalizado' 
                    : FLOOR_MATERIALS[currentMaterials.floor?.type ?? 'tile-white'].name}
                </span>
              </div>
              <div className="preview-item">
                <span className="preview-item__label">Paredes:</span>
                <span className="preview-item__value">
                  {currentMaterials.walls?.type === 'custom' 
                    ? 'Personalizado' 
                    : WALL_MATERIALS[currentMaterials.walls?.type ?? 'paint-white'].name}
                </span>
              </div>
              <div className="preview-item">
                <span className="preview-item__label">Teto:</span>
                <span className="preview-item__value">
                  {currentMaterials.ceiling?.type === 'custom' 
                    ? 'Personalizado' 
                    : CEILING_MATERIALS[currentMaterials.ceiling?.type ?? 'paint-white'].name}
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </div>
  );
}

export default MaterialsPanel;
