import { useFloorPlan } from '../../context/FloorPlanContext';
import { Input, Select } from '../ui';

export function ConfigPanel() {
  const { state, updateConfig, updateDefaults } = useFloorPlan();
  const { floorPlan } = state;

  return (
    <div className="config-panel">
      <h3>Configurações</h3>

      <div className="config-panel__section">
        <h4>Geral</h4>
        <div className="form-row">
          <Select
            label="Unidade"
            value={floorPlan.unit}
            onChange={(e) => updateConfig({ unit: e.target.value as 'cm' | 'mm' | 'm' })}
            options={[
              { value: 'cm', label: 'Centímetros (cm)' },
              { value: 'mm', label: 'Milímetros (mm)' },
              { value: 'm', label: 'Metros (m)' },
            ]}
          />
          <Input
            label="Escala"
            type="number"
            value={floorPlan.scale ?? 0.2}
            onChange={(e) => updateConfig({ scale: Number(e.target.value) })}
            min={0.01}
            max={2}
            step={0.01}
            suffix="px/unidade"
          />
        </div>
      </div>

      <div className="config-panel__section">
        <h4>Parede (default)</h4>
        <div className="form-row">
          <Input
            label="Altura"
            type="number"
            value={floorPlan.defaults?.wall?.height ?? 280}
            onChange={(e) =>
              updateDefaults({
                wall: { ...floorPlan.defaults?.wall, height: Number(e.target.value) },
              })
            }
            suffix={floorPlan.unit}
          />
          <Input
            label="Espessura"
            type="number"
            value={floorPlan.defaults?.wall?.thickness ?? 15}
            onChange={(e) =>
              updateDefaults({
                wall: { ...floorPlan.defaults?.wall, thickness: Number(e.target.value) },
              })
            }
            suffix={floorPlan.unit}
          />
        </div>
      </div>

      <div className="config-panel__section">
        <h4>Porta (default)</h4>
        <div className="form-row">
          <Input
            label="Largura"
            type="number"
            value={floorPlan.defaults?.door?.width ?? 80}
            onChange={(e) =>
              updateDefaults({
                door: { ...floorPlan.defaults?.door, width: Number(e.target.value) },
              })
            }
            suffix={floorPlan.unit}
          />
          <Input
            label="Altura"
            type="number"
            value={floorPlan.defaults?.door?.height ?? 210}
            onChange={(e) =>
              updateDefaults({
                door: { ...floorPlan.defaults?.door, height: Number(e.target.value) },
              })
            }
            suffix={floorPlan.unit}
          />
        </div>
      </div>

      <div className="config-panel__section">
        <h4>Janela (default)</h4>
        <div className="form-row">
          <Input
            label="Largura"
            type="number"
            value={floorPlan.defaults?.window?.width ?? 120}
            onChange={(e) =>
              updateDefaults({
                window: { ...floorPlan.defaults?.window, width: Number(e.target.value) },
              })
            }
            suffix={floorPlan.unit}
          />
          <Input
            label="Altura"
            type="number"
            value={floorPlan.defaults?.window?.height ?? 120}
            onChange={(e) =>
              updateDefaults({
                window: { ...floorPlan.defaults?.window, height: Number(e.target.value) },
              })
            }
            suffix={floorPlan.unit}
          />
        </div>
        <Input
          label="Altura do chão"
          type="number"
          value={floorPlan.defaults?.window?.fromFloor ?? 100}
          onChange={(e) =>
            updateDefaults({
              window: { ...floorPlan.defaults?.window, fromFloor: Number(e.target.value) },
            })
          }
          suffix={floorPlan.unit}
        />
      </div>
    </div>
  );
}

export default ConfigPanel;
