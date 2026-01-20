import { useState } from 'react';
import type { Opening, WallSide } from '../../types/floor-plan';
import { useFloorPlan } from '../../context/FloorPlanContext';
import { Button, Input, Select } from '../ui';

interface OpeningFormProps {
  roomId: string;
  side: WallSide;
  openings: Opening[];
}

export function OpeningForm({ roomId, side, openings }: OpeningFormProps) {
  const { addOpening, updateOpening, deleteOpening, state } = useFloorPlan();
  const unit = state.floorPlan.unit;
  const [isAdding, setIsAdding] = useState(false);
  const [newOpening, setNewOpening] = useState<Opening>({
    type: 'door',
    offset: 50,
  });

  const handleAdd = () => {
    addOpening(roomId, side, newOpening);
    setNewOpening({ type: 'door', offset: 50 });
    setIsAdding(false);
  };

  const handleUpdate = (index: number, field: keyof Opening, value: string | number | undefined) => {
    updateOpening(roomId, side, index, { [field]: value });
  };

  return (
    <div className="opening-form">
      <div className="opening-form__header">
        <h4>Aberturas</h4>
        {!isAdding && (
          <Button variant="ghost" size="sm" onClick={() => setIsAdding(true)}>
            + Adicionar
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="opening-form__new">
          <Select
            label="Tipo"
            value={newOpening.type}
            onChange={(e) => setNewOpening({ ...newOpening, type: e.target.value as 'door' | 'window' })}
            options={[
              { value: 'door', label: 'Porta' },
              { value: 'window', label: 'Janela' },
            ]}
          />
          <Input
            label="Distância do início"
            type="number"
            value={newOpening.offset}
            onChange={(e) => setNewOpening({ ...newOpening, offset: Number(e.target.value) })}
            suffix={unit}
          />
          <Input
            label="Largura"
            type="number"
            value={newOpening.width ?? ''}
            onChange={(e) => setNewOpening({ ...newOpening, width: Number(e.target.value) || undefined })}
            placeholder="Default"
            suffix={unit}
          />
          <div className="form-actions">
            <Button variant="primary" size="sm" onClick={handleAdd}>
              Adicionar
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {openings.length === 0 && !isAdding && (
        <p className="opening-form__empty">Nenhuma abertura</p>
      )}

      {openings.map((opening, index) => (
        <div key={index} className="opening-form__item">
          <div className="opening-form__item-header">
            <span className="opening-form__item-type">
              {opening.type === 'door' ? 'Porta' : 'Janela'}
            </span>
            <Button
              variant="danger"
              size="sm"
              onClick={() => deleteOpening(roomId, side, index)}
            >
              Excluir
            </Button>
          </div>
          <div className="form-row">
            <Input
              label="Offset"
              type="number"
              value={opening.offset}
              onChange={(e) => handleUpdate(index, 'offset', Number(e.target.value))}
              suffix={unit}
            />
            <Input
              label="Largura"
              type="number"
              value={opening.width ?? ''}
              onChange={(e) => handleUpdate(index, 'width', Number(e.target.value) || undefined)}
              placeholder="Default"
              suffix={unit}
            />
          </div>
          {opening.to && (
            <small className="opening-form__item-to">
              Leva para: {opening.to}
            </small>
          )}
        </div>
      ))}
    </div>
  );
}

export default OpeningForm;
