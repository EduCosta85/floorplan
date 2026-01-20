import { useState } from 'react';
import type { Furniture, FurnitureCategory, FurnitureTemplate } from '../../types/floor-plan';
import {
  FURNITURE_CATEGORIES,
  getFurnitureByCategory,
  getFurnitureTemplate,
} from '../../data/furniture-library';
import { useFloorPlan } from '../../context/FloorPlanContext';
import { Button, Input } from '../ui';

interface FurniturePanelProps {
  onAddFurniture?: (templateId: string) => void;
}

interface FurnitureItemProps {
  template: FurnitureTemplate;
  onAdd: () => void;
}

function FurnitureItem({ template, onAdd }: FurnitureItemProps) {
  const isWallMounted = template.wallMounted || (template.elevation ?? 0) > 0;
  
  return (
    <button
      className={`furniture-item ${isWallMounted ? 'furniture-item--wall-mounted' : ''}`}
      onClick={onAdd}
      title={`${template.name} (${template.width}x${template.depth}cm)${isWallMounted ? ' - Aéreo' : ''}`}
    >
      <span className="furniture-item__icon">{template.icon}</span>
      <span className="furniture-item__name">{template.name}</span>
      <span className="furniture-item__size">
        {template.width}x{template.depth}
        {isWallMounted && ' 📌'}
      </span>
    </button>
  );
}

interface FurnitureEditorProps {
  furniture: Furniture;
  template: FurnitureTemplate;
  onUpdate: (updates: Partial<Furniture>) => void;
  onDelete: () => void;
  onRotate: () => void;
}

function FurnitureEditor({ furniture, template, onUpdate, onDelete, onRotate }: FurnitureEditorProps) {
  const effectiveWidth = furniture.width ?? template.width;
  const effectiveDepth = furniture.depth ?? template.depth;
  const effectiveHeight = furniture.height ?? template.height;
  const effectiveElevation = furniture.elevation ?? template.elevation ?? 0;
  const isWallMounted = template.wallMounted || effectiveElevation > 0;

  return (
    <div className="furniture-editor">
      <div className="furniture-editor__header">
        <span className="furniture-editor__icon">{template.icon}</span>
        <span className="furniture-editor__name">
          {furniture.name ?? template.name}
        </span>
        {isWallMounted && (
          <span className="furniture-editor__badge">📌 Aéreo</span>
        )}
      </div>

      <div className="furniture-editor__field">
        <label>Nome</label>
        <Input
          value={furniture.name ?? template.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder={template.name}
        />
      </div>

      <div className="furniture-editor__dimensions">
        <div className="furniture-editor__field">
          <label>Largura (cm)</label>
          <Input
            type="number"
            value={effectiveWidth}
            onChange={(e) => onUpdate({ width: Number(e.target.value) })}
            min={template.minWidth ?? 10}
            max={template.maxWidth ?? 500}
            disabled={!template.resizable}
          />
        </div>
        <div className="furniture-editor__field">
          <label>Profundidade (cm)</label>
          <Input
            type="number"
            value={effectiveDepth}
            onChange={(e) => onUpdate({ depth: Number(e.target.value) })}
            min={template.minDepth ?? 10}
            max={template.maxDepth ?? 500}
            disabled={!template.resizable}
          />
        </div>
        <div className="furniture-editor__field">
          <label>Altura (cm)</label>
          <Input
            type="number"
            value={effectiveHeight}
            onChange={(e) => onUpdate({ height: Number(e.target.value) })}
            min={10}
            max={300}
          />
        </div>
      </div>

      {/* Elevation field for wall-mounted items */}
      {(isWallMounted || effectiveElevation > 0) && (
        <div className="furniture-editor__field">
          <label>Elevação do chão (cm)</label>
          <Input
            type="number"
            value={effectiveElevation}
            onChange={(e) => onUpdate({ elevation: Number(e.target.value) })}
            min={0}
            max={250}
          />
          <span className="furniture-editor__hint">
            Altura da base do móvel em relação ao chão
          </span>
        </div>
      )}

      {/* Pool-specific fields */}
      {template.structuralType === 'pool' && (
        <>
          <div className="furniture-editor__field">
            <label>Largura da Borda (cm)</label>
            <Input
              type="number"
              value={furniture.borderWidth ?? template.borderWidth ?? 20}
              onChange={(e) => onUpdate({ borderWidth: Number(e.target.value) })}
              min={5}
              max={100}
            />
            <span className="furniture-editor__hint">
              Espessura da borda ao redor da piscina
            </span>
          </div>
          <div className="furniture-editor__field">
            <label>Profundidade da Água (cm)</label>
            <Input
              type="number"
              value={furniture.waterDepth ?? template.waterDepth ?? 140}
              onChange={(e) => onUpdate({ waterDepth: Number(e.target.value) })}
              min={30}
              max={300}
            />
            <span className="furniture-editor__hint">
              Profundidade da água na piscina
            </span>
          </div>
        </>
      )}

      <div className="furniture-editor__field">
        <label>Rotação</label>
        <div className="furniture-editor__rotation">
          <span className="rotation-value">{furniture.rotation}°</span>
          <Button variant="secondary" size="sm" onClick={onRotate}>
            🔄 Girar 90°
          </Button>
        </div>
      </div>

      <div className="furniture-editor__field">
        <label>Cor</label>
        <div className="furniture-editor__color">
          <input
            type="color"
            value={furniture.color ?? template.color}
            onChange={(e) => onUpdate({ color: e.target.value })}
          />
          <span>{furniture.color ?? template.color}</span>
        </div>
      </div>

      <div className="furniture-editor__position">
        <div className="furniture-editor__field">
          <label>Posição X (cm)</label>
          <Input
            type="number"
            value={Math.round(furniture.position.x)}
            onChange={(e) => onUpdate({ position: { ...furniture.position, x: Number(e.target.value) } })}
          />
        </div>
        <div className="furniture-editor__field">
          <label>Posição Y (cm)</label>
          <Input
            type="number"
            value={Math.round(furniture.position.y)}
            onChange={(e) => onUpdate({ position: { ...furniture.position, y: Number(e.target.value) } })}
          />
        </div>
      </div>

      <div className="furniture-editor__actions">
        <Button variant="danger" size="sm" onClick={onDelete}>
          🗑️ Excluir
        </Button>
      </div>
    </div>
  );
}

export function FurniturePanel({ onAddFurniture }: FurniturePanelProps) {
  const [activeCategory, setActiveCategory] = useState<FurnitureCategory>('living');
  const {
    state,
    addFurniture,
    updateFurniture,
    deleteFurniture,
    rotateFurniture,
    selectFurniture,
    generateFurnitureId,
    getSelectedFurniture,
  } = useFloorPlan();

  const selectedFurniture = getSelectedFurniture();
  const selectedTemplate = selectedFurniture
    ? getFurnitureTemplate(selectedFurniture.templateId)
    : null;

  const furnitureList = state.floorPlan.floor.furniture ?? [];
  const categoryItems = getFurnitureByCategory(activeCategory);

  const handleAddFurniture = (templateId: string) => {
    const template = getFurnitureTemplate(templateId);
    if (!template) return;

    const newFurniture: Furniture = {
      id: generateFurnitureId(),
      templateId,
      position: { x: 100, y: 100 },
      rotation: 0,
    };

    addFurniture(newFurniture);
    onAddFurniture?.(templateId);
  };

  const handleUpdateFurniture = (updates: Partial<Furniture>) => {
    if (selectedFurniture) {
      updateFurniture(selectedFurniture.id, updates);
    }
  };

  const handleDeleteFurniture = () => {
    if (selectedFurniture) {
      deleteFurniture(selectedFurniture.id);
    }
  };

  const handleRotateFurniture = () => {
    if (selectedFurniture) {
      rotateFurniture(selectedFurniture.id);
    }
  };

  return (
    <div className="furniture-panel">
      <div className="furniture-panel__header">
        <h4>🪑 Móveis</h4>
        {furnitureList.length > 0 && (
          <span className="furniture-panel__count">{furnitureList.length}</span>
        )}
      </div>

      {/* Selected Furniture Editor */}
      {selectedFurniture && selectedTemplate ? (
        <div className="furniture-panel__editor">
          <div className="furniture-panel__back">
            <Button variant="ghost" size="sm" onClick={() => selectFurniture(null)}>
              ← Voltar ao catálogo
            </Button>
          </div>
          <FurnitureEditor
            furniture={selectedFurniture}
            template={selectedTemplate}
            onUpdate={handleUpdateFurniture}
            onDelete={handleDeleteFurniture}
            onRotate={handleRotateFurniture}
          />
        </div>
      ) : (
        <>
          {/* Category Tabs */}
          <div className="furniture-panel__categories">
            {FURNITURE_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                className={`furniture-category ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
                title={cat.name}
              >
                <span className="furniture-category__icon">{cat.icon}</span>
                <span className="furniture-category__name">{cat.name}</span>
              </button>
            ))}
          </div>

          {/* Furniture Items */}
          <div className="furniture-panel__items">
            {categoryItems.map((template) => (
              <FurnitureItem
                key={template.id}
                template={template}
                onAdd={() => handleAddFurniture(template.id)}
              />
            ))}
          </div>

          {/* Placed Furniture List */}
          {furnitureList.length > 0 && (
            <div className="furniture-panel__placed">
              <h5>Móveis Posicionados</h5>
              <div className="placed-furniture-list">
                {furnitureList.map((f) => {
                  const template = getFurnitureTemplate(f.templateId);
                  if (!template) return null;
                  return (
                    <button
                      key={f.id}
                      className={`placed-furniture-item ${
                        state.selectedFurnitureId === f.id ? 'selected' : ''
                      }`}
                      onClick={() => selectFurniture(f.id)}
                    >
                      <span className="placed-furniture-item__icon">{template.icon}</span>
                      <span className="placed-furniture-item__name">
                        {f.name ?? template.name}
                      </span>
                      <span className="placed-furniture-item__rotation">{f.rotation}°</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Help Text */}
          <div className="furniture-panel__help">
            <p>💡 Clique em um móvel para adicioná-lo à planta.</p>
            <p>Arraste para posicionar, use R para rotacionar.</p>
          </div>
        </>
      )}
    </div>
  );
}

export default FurniturePanel;
