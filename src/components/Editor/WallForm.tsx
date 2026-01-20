import type { Wall, WallSide } from '../../types/floor-plan';
import { useFloorPlan } from '../../context/FloorPlanContext';
import { Input, Checkbox } from '../ui';

interface WallFormProps {
  roomId: string;
  side: WallSide;
  wall: Wall;
}

const SIDE_LABELS: Record<WallSide, string> = {
  north: 'Norte',
  east: 'Leste',
  south: 'Sul',
  west: 'Oeste',
};

export function WallForm({ roomId, side, wall }: WallFormProps) {
  const { updateWall, state } = useFloorPlan();
  const unit = state.floorPlan.unit;

  const handleChange = (field: keyof Wall, value: number | boolean) => {
    updateWall(roomId, side, { [field]: value });
  };

  return (
    <div className="wall-form">
      <h4>Parede {SIDE_LABELS[side]}</h4>

      <div className="form-row">
        <Input
          label="Comprimento"
          type="number"
          value={wall.length ?? 0}
          onChange={(e) => handleChange('length', Number(e.target.value))}
          min={0}
          suffix={unit}
        />
        <Input
          label="Espessura"
          type="number"
          value={wall.thickness ?? ''}
          onChange={(e) => handleChange('thickness', Number(e.target.value))}
          placeholder="Default"
          suffix={unit}
        />
      </div>

      <Checkbox
        label="Parede virtual (sem parede física)"
        checked={wall.exists === false}
        onChange={(e) => {
          // Quando checkbox marcado = parede virtual (exists = false)
          // Quando checkbox desmarcado = parede física (exists = true)
          const isVirtual = e.target.checked;
          updateWall(roomId, side, { exists: !isVirtual });
        }}
      />

      {wall.openings && wall.openings.length > 0 && (
        <div className="wall-form__openings">
          <small>{wall.openings.length} abertura(s)</small>
        </div>
      )}
    </div>
  );
}

export default WallForm;
