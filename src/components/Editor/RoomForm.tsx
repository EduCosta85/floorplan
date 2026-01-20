import { useState, useEffect } from 'react';
import type { Room } from '../../types/floor-plan';
import { useFloorPlan } from '../../context/FloorPlanContext';
import { Button, Input, Checkbox } from '../ui';

interface RoomFormProps {
  room?: Room | null;
  onClose?: () => void;
}

export function RoomForm({ room, onClose }: RoomFormProps) {
  const { addRoom, updateRoom, generateRoomId, state } = useFloorPlan();
  const isEditing = !!room;
  const unit = state.floorPlan.unit;

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    x: 0,
    y: 0,
    width: 300,
    height: 300,
    hasFloor: true,
    hasCeiling: true,
  });

  useEffect(() => {
    if (room) {
      const width = Math.max(room.walls.north.length ?? 0, room.walls.south.length ?? 0);
      const height = Math.max(room.walls.east.length ?? 0, room.walls.west.length ?? 0);
      setFormData({
        id: room.id,
        name: room.name ?? '',
        x: room.position.x,
        y: room.position.y,
        width,
        height,
        hasFloor: room.hasFloor !== false,
        hasCeiling: room.hasCeiling !== false,
      });
    } else {
      setFormData({
        id: generateRoomId(),
        name: '',
        x: 0,
        y: 0,
        width: 300,
        height: 300,
        hasFloor: true,
        hasCeiling: true,
      });
    }
  }, [room, generateRoomId]);

  const handleChange = (field: keyof typeof formData, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditing && room) {
      // PRESERVE existing wall properties (exists, openings, thickness, etc.)
      // Only update what changed
      updateRoom(room.id, {
        name: formData.name || formData.id,
        position: { x: formData.x, y: formData.y },
        walls: {
          north: { ...room.walls.north, length: formData.width },
          east: { ...room.walls.east, length: formData.height },
          south: { ...room.walls.south, length: formData.width },
          west: { ...room.walls.west, length: formData.height },
        },
        hasFloor: formData.hasFloor,
        hasCeiling: formData.hasCeiling,
      });
    } else {
      // New room - create fresh walls
      const newRoom: Room = {
        id: formData.id,
        name: formData.name || formData.id,
        position: { x: formData.x, y: formData.y },
        walls: {
          north: { length: formData.width },
          east: { length: formData.height },
          south: { length: formData.width },
          west: { length: formData.height },
        },
        hasFloor: formData.hasFloor,
        hasCeiling: formData.hasCeiling,
      };
      addRoom(newRoom);
    }

    onClose?.();
  };

  return (
    <form onSubmit={handleSubmit} className="room-form">
      <div className="form-section">
        <Input
          label="Nome do Cômodo"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="Ex: Sala de Estar"
        />
      </div>

      <div className="form-section">
        <h4 className="form-section__title">Dimensões</h4>
        <div className="form-row">
          <Input
            label="Largura"
            type="number"
            value={formData.width}
            onChange={(e) => handleChange('width', Number(e.target.value))}
            min={50}
            suffix={unit}
          />
          <Input
            label="Altura"
            type="number"
            value={formData.height}
            onChange={(e) => handleChange('height', Number(e.target.value))}
            min={50}
            suffix={unit}
          />
        </div>
      </div>

      <div className="form-section">
        <h4 className="form-section__title">Posição</h4>
        <div className="form-row">
          <Input
            label="Eixo X"
            type="number"
            value={formData.x}
            onChange={(e) => handleChange('x', Number(e.target.value))}
            suffix={unit}
          />
          <Input
            label="Eixo Y"
            type="number"
            value={formData.y}
            onChange={(e) => handleChange('y', Number(e.target.value))}
            suffix={unit}
          />
        </div>
      </div>

      <div className="form-section">
        <h4 className="form-section__title">Estrutura (3D)</h4>
        <div className="form-checkboxes">
          <Checkbox
            label="Tem piso"
            checked={formData.hasFloor}
            onChange={(e) => handleChange('hasFloor', e.target.checked)}
          />
          <Checkbox
            label="Tem teto"
            checked={formData.hasCeiling}
            onChange={(e) => handleChange('hasCeiling', e.target.checked)}
          />
        </div>
        <p className="form-hint">
          Desmarque para áreas abertas como quintais, varandas ou terraços.
        </p>
      </div>

      <div className="form-actions">
        <Button type="submit" variant="primary" className="w-full">
          {isEditing ? 'Atualizar Dados' : 'Criar Cômodo'}
        </Button>
      </div>
    </form>
  );
}

export default RoomForm;
