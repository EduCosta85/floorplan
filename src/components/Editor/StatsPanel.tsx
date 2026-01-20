import { useState, useMemo, useCallback } from 'react';
import type { FloorPlan } from '../../types/floor-plan';
import type { EstimateConfig } from '../../types/estimate-config';
import { DEFAULT_ESTIMATE_CONFIG } from '../../types/estimate-config';
import {
  calculateFloorPlanStats,
  formatArea,
  formatLength,
  formatVolume,
  formatNumber,
  formatCurrency,
  type FloorPlanStats,
  type RoomStats,
  type WallStats,
} from '../../utils/statistics';

interface StatsPanelProps {
  floorPlan: FloorPlan;
}

type TabId = 'measurements' | 'budget';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'measurements', label: 'Medições', icon: '📐' },
  { id: 'budget', label: 'Orçamento', icon: '💰' },
];

const SIDE_LABELS: Record<string, string> = {
  north: 'Norte',
  east: 'Leste',
  south: 'Sul',
  west: 'Oeste',
};

export function StatsPanel({ floorPlan }: StatsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('budget');
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);
  const [expandedWall, setExpandedWall] = useState<string | null>(null);
  const [config, setConfig] = useState<EstimateConfig>(DEFAULT_ESTIMATE_CONFIG);

  const stats = useMemo(
    () => calculateFloorPlanStats(floorPlan, config),
    [floorPlan, config]
  );

  // Generic config updater
  const updateConfig = useCallback(<K extends keyof EstimateConfig>(
    section: K,
    updates: Partial<EstimateConfig[K]>
  ) => {
    setConfig(prev => ({
      ...prev,
      [section]: { ...prev[section], ...updates },
    }));
  }, []);

  if (floorPlan.floor.rooms.length === 0) {
    return (
      <div className="stats-panel stats-panel--empty">
        <p>Adicione cômodos para ver as estatísticas.</p>
      </div>
    );
  }

  return (
    <div className="stats-panel">
      {/* Main Tabs */}
      <div className="stats-panel__tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`stats-panel__tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="stats-panel__tab-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="stats-panel__content">
        {activeTab === 'measurements' && (
          <MeasurementsTab
            stats={stats}
            expandedRoom={expandedRoom}
            expandedWall={expandedWall}
            onRoomToggle={(id) => setExpandedRoom(expandedRoom === id ? null : id)}
            onWallToggle={(id) => setExpandedWall(expandedWall === id ? null : id)}
          />
        )}

        {activeTab === 'budget' && (
          <BudgetTab
            stats={stats}
            config={config}
            onConfigChange={updateConfig}
          />
        )}
      </div>
    </div>
  );
}

// ============================================
// Measurements Tab
// ============================================

interface MeasurementsTabProps {
  stats: FloorPlanStats;
  expandedRoom: string | null;
  expandedWall: string | null;
  onRoomToggle: (id: string) => void;
  onWallToggle: (id: string) => void;
}

function MeasurementsTab({ stats, expandedRoom, expandedWall, onRoomToggle, onWallToggle }: MeasurementsTabProps) {
  const { measurements } = stats;

  return (
    <div className="measurements-tab">
      {/* Summary */}
      <div className="stats-section">
        <h3 className="stats-section__title">Resumo Geral</h3>
        <div className="stats-grid">
          <StatCard label="Área Total" value={formatArea(measurements.totalFloorArea)} icon="📐" />
          <StatCard label="Paredes" value={formatArea(measurements.totalWallsArea)} icon="🧱" />
          <StatCard label="Volume" value={formatVolume(measurements.totalVolume)} icon="📦" />
          <StatCard label="Perímetro" value={formatLength(measurements.totalPerimeter)} icon="📏" />
        </div>
      </div>

      {/* By Room */}
      <div className="stats-section">
        <h3 className="stats-section__title">Por Cômodo</h3>
        <div className="room-list">
          {measurements.rooms.map((room) => (
            <RoomMeasurementsCard
              key={room.id}
              room={room}
              isExpanded={expandedRoom === room.id}
              expandedWall={expandedRoom === room.id ? expandedWall : null}
              onToggle={() => onRoomToggle(room.id)}
              onWallToggle={(wallId) => onWallToggle(wallId)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Budget Tab - Tabela com Detalhes do Cálculo
// ============================================

interface BudgetTabProps {
  stats: FloorPlanStats;
  config: EstimateConfig;
  onConfigChange: <K extends keyof EstimateConfig>(section: K, updates: Partial<EstimateConfig[K]>) => void;
}

function BudgetTab({ stats, config, onConfigChange }: BudgetTabProps) {
  const { materials, measurements } = stats;

  // Calculate totals
  const totals = useMemo(() => {
    const items = {
      // Alvenaria
      bricks: materials.masonry.bricks * config.prices.brick,
      mortar: materials.masonry.mortar * config.prices.mortar_m3,
      // Pintura
      paintWalls: Math.ceil(materials.paint.paint / 18) * config.prices.paint_18l,
      paintCeiling: Math.ceil(materials.paint.ceilingPaint / 18) * config.prices.paint_18l,
      primer: Math.ceil(materials.paint.primer / 18) * config.prices.primer_18l,
      putty: Math.ceil(materials.paint.putty / 25) * config.prices.putty_25kg,
      // Piso
      tiles: materials.flooring.tiles * config.prices.tile_m2,
      grout: materials.flooring.grout * config.prices.grout_kg,
      adhesive: materials.flooring.adhesive * config.prices.tile_adhesive_kg,
      // Elétrica
      outlets: materials.electrical.outlets * config.prices.outlet,
      switches: materials.electrical.switches * config.prices.switch,
      lights: materials.electrical.lightPoints * config.prices.light_point,
      wire: materials.electrical.wireEstimate * config.prices.wire_m,
      // Hidráulica
      water: (materials.plumbing.coldWaterPoints + materials.plumbing.hotWaterPoints) * config.prices.water_point,
      drains: materials.plumbing.drainPoints * config.prices.drain_point,
      pipes: materials.plumbing.pipeEstimate * config.prices.pipe_m,
    };

    const subtotals = {
      masonry: items.bricks + items.mortar,
      paint: items.paintWalls + items.paintCeiling + items.primer + items.putty,
      flooring: items.tiles + items.grout + items.adhesive,
      electrical: items.outlets + items.switches + items.lights + items.wire,
      plumbing: items.water + items.drains + items.pipes,
    };

    const total = Object.values(subtotals).reduce((a, b) => a + b, 0);
    const perM2 = measurements.totalFloorArea > 0 ? total / measurements.totalFloorArea : 0;

    return { items, subtotals, total, perM2 };
  }, [materials, config.prices, measurements.totalFloorArea]);

  return (
    <div className="budget-tab">
      {/* Summary */}
      <div className="budget-summary">
        <div className="budget-total">
          <span className="budget-total__label">Total Estimado</span>
          <span className="budget-total__value">{formatCurrency(totals.total)}</span>
          <span className="budget-total__per-m2">
            {formatCurrency(totals.perM2)}/m² ({formatArea(measurements.totalFloorArea)})
          </span>
        </div>
      </div>

      {/* Unified Table */}
      <div className="budget-table-container">
        <table className="budget-table budget-table--detailed">
          <thead>
            <tr>
              <th className="col-item">Material</th>
              <th className="col-base">Base</th>
              <th className="col-calc">Cálculo</th>
              <th className="col-qty">Qtd</th>
              <th className="col-price">Preço</th>
              <th className="col-total">Total</th>
            </tr>
          </thead>
          <tbody>
            {/* ========== ALVENARIA ========== */}
            <tr className="budget-table__category-row">
              <td colSpan={6}>🧱 Alvenaria</td>
            </tr>
            
            {/* Tijolos */}
            <tr className="budget-table__item-row">
              <td className="col-item">Tijolos cerâmicos</td>
              <td className="col-base">{formatArea(measurements.totalWallsAreaWithoutOpenings)}</td>
              <td className="col-calc">
                <EditableNumber
                  value={Math.round((config.brick.wasteFactor - 1) * 100)}
                  onChange={(v) => onConfigChange('brick', { wasteFactor: 1 + v / 100 })}
                  suffix="% perda"
                />
              </td>
              <td className="col-qty">{formatNumber(materials.masonry.bricks, 0)} un</td>
              <td className="col-price">
                <EditableNumber
                  value={config.prices.brick}
                  onChange={(v) => onConfigChange('prices', { brick: v })}
                  prefix="R$"
                  step={0.05}
                />
              </td>
              <td className="col-total">{formatCurrency(totals.items.bricks)}</td>
            </tr>

            {/* Argamassa */}
            <tr className="budget-table__item-row">
              <td className="col-item">Argamassa assentamento</td>
              <td className="col-base">{formatNumber(materials.masonry.bricks, 0)} tijolos</td>
              <td className="col-calc">
                <span className="calc-formula">0,25 m³/1000</span>
              </td>
              <td className="col-qty">{formatNumber(materials.masonry.mortar, 2)} m³</td>
              <td className="col-price">
                <EditableNumber
                  value={config.prices.mortar_m3}
                  onChange={(v) => onConfigChange('prices', { mortar_m3: v })}
                  prefix="R$"
                  suffix="/m³"
                />
              </td>
              <td className="col-total">{formatCurrency(totals.items.mortar)}</td>
            </tr>

            <tr className="budget-table__subtotal-row">
              <td colSpan={5}>Subtotal Alvenaria</td>
              <td className="col-total">{formatCurrency(totals.subtotals.masonry)}</td>
            </tr>

            {/* ========== PINTURA ========== */}
            <tr className="budget-table__category-row">
              <td colSpan={6}>🎨 Pintura</td>
            </tr>

            {/* Tinta paredes */}
            <tr className="budget-table__item-row">
              <td className="col-item">Tinta látex (paredes)</td>
              <td className="col-base">{formatArea(materials.paint.paintableWallArea)}</td>
              <td className="col-calc">
                <EditableNumber
                  value={config.paint.coats}
                  onChange={(v) => onConfigChange('paint', { coats: v })}
                  suffix="demãos"
                  min={1}
                  max={4}
                />
                <span className="calc-sep">×</span>
                <EditableNumber
                  value={config.paint.coverage}
                  onChange={(v) => onConfigChange('paint', { coverage: v })}
                  suffix="m²/L"
                  min={5}
                  max={20}
                />
              </td>
              <td className="col-qty">{Math.ceil(materials.paint.paint / 18)} latas 18L</td>
              <td className="col-price">
                <EditableNumber
                  value={config.prices.paint_18l}
                  onChange={(v) => onConfigChange('prices', { paint_18l: v })}
                  prefix="R$"
                />
              </td>
              <td className="col-total">{formatCurrency(totals.items.paintWalls)}</td>
            </tr>

            {/* Tinta teto */}
            <tr className="budget-table__item-row">
              <td className="col-item">Tinta látex (teto)</td>
              <td className="col-base">{formatArea(materials.paint.ceilingArea)}</td>
              <td className="col-calc">
                <span className="calc-formula">{config.paint.coats} demãos × {config.paint.coverage} m²/L</span>
              </td>
              <td className="col-qty">{Math.ceil(materials.paint.ceilingPaint / 18)} lata 18L</td>
              <td className="col-price">
                <EditableNumber
                  value={config.prices.paint_18l}
                  onChange={(v) => onConfigChange('prices', { paint_18l: v })}
                  prefix="R$"
                />
              </td>
              <td className="col-total">{formatCurrency(totals.items.paintCeiling)}</td>
            </tr>

            {/* Selador */}
            <tr className="budget-table__item-row">
              <td className="col-item">Selador/Fundo</td>
              <td className="col-base">{formatArea(materials.paint.paintableWallArea)}</td>
              <td className="col-calc">
                <EditableNumber
                  value={config.paint.primerCoats}
                  onChange={(v) => onConfigChange('paint', { primerCoats: v })}
                  suffix="demão"
                  min={1}
                  max={2}
                />
                <span className="calc-sep">×</span>
                <EditableNumber
                  value={config.paint.primerCoverage}
                  onChange={(v) => onConfigChange('paint', { primerCoverage: v })}
                  suffix="m²/L"
                  min={5}
                  max={20}
                />
              </td>
              <td className="col-qty">{Math.ceil(materials.paint.primer / 18)} lata 18L</td>
              <td className="col-price">
                <EditableNumber
                  value={config.prices.primer_18l}
                  onChange={(v) => onConfigChange('prices', { primer_18l: v })}
                  prefix="R$"
                />
              </td>
              <td className="col-total">{formatCurrency(totals.items.primer)}</td>
            </tr>

            {/* Massa corrida */}
            <tr className="budget-table__item-row">
              <td className="col-item">Massa corrida</td>
              <td className="col-base">{formatArea(materials.paint.paintableWallArea)}</td>
              <td className="col-calc">
                <EditableNumber
                  value={config.paint.puttyPercentage}
                  onChange={(v) => onConfigChange('paint', { puttyPercentage: v })}
                  suffix="%"
                  min={0}
                  max={100}
                />
                <span className="calc-sep">÷</span>
                <EditableNumber
                  value={config.paint.puttyCoverage}
                  onChange={(v) => onConfigChange('paint', { puttyCoverage: v })}
                  suffix="m²/kg"
                  min={1}
                  max={5}
                  step={0.5}
                />
              </td>
              <td className="col-qty">{Math.ceil(materials.paint.putty / 25)} sacos 25kg</td>
              <td className="col-price">
                <EditableNumber
                  value={config.prices.putty_25kg}
                  onChange={(v) => onConfigChange('prices', { putty_25kg: v })}
                  prefix="R$"
                />
              </td>
              <td className="col-total">{formatCurrency(totals.items.putty)}</td>
            </tr>

            <tr className="budget-table__subtotal-row">
              <td colSpan={5}>Subtotal Pintura</td>
              <td className="col-total">{formatCurrency(totals.subtotals.paint)}</td>
            </tr>

            {/* ========== PISO ========== */}
            <tr className="budget-table__category-row">
              <td colSpan={6}>🪨 Piso</td>
            </tr>

            {/* Piso cerâmico */}
            <tr className="budget-table__item-row">
              <td className="col-item">Piso cerâmico</td>
              <td className="col-base">{formatArea(materials.flooring.netArea)}</td>
              <td className="col-calc">
                <EditableNumber
                  value={Math.round((config.flooring.wasteFactor - 1) * 100)}
                  onChange={(v) => onConfigChange('flooring', { wasteFactor: 1 + v / 100 })}
                  suffix="% perda"
                  min={5}
                  max={30}
                />
              </td>
              <td className="col-qty">{formatNumber(materials.flooring.tiles, 1)} m²</td>
              <td className="col-price">
                <EditableNumber
                  value={config.prices.tile_m2}
                  onChange={(v) => onConfigChange('prices', { tile_m2: v })}
                  prefix="R$"
                  suffix="/m²"
                />
              </td>
              <td className="col-total">{formatCurrency(totals.items.tiles)}</td>
            </tr>

            {/* Rejunte */}
            <tr className="budget-table__item-row">
              <td className="col-item">Rejunte</td>
              <td className="col-base">{formatArea(materials.flooring.netArea)}</td>
              <td className="col-calc">
                <EditableNumber
                  value={config.flooring.groutPerM2}
                  onChange={(v) => onConfigChange('flooring', { groutPerM2: v })}
                  suffix="kg/m²"
                  min={0.3}
                  max={1}
                  step={0.1}
                />
              </td>
              <td className="col-qty">{formatNumber(materials.flooring.grout, 0)} kg</td>
              <td className="col-price">
                <EditableNumber
                  value={config.prices.grout_kg}
                  onChange={(v) => onConfigChange('prices', { grout_kg: v })}
                  prefix="R$"
                  suffix="/kg"
                  step={0.5}
                />
              </td>
              <td className="col-total">{formatCurrency(totals.items.grout)}</td>
            </tr>

            {/* Argamassa colante */}
            <tr className="budget-table__item-row">
              <td className="col-item">Argamassa colante</td>
              <td className="col-base">{formatArea(materials.flooring.netArea)}</td>
              <td className="col-calc">
                <EditableNumber
                  value={config.flooring.adhesivePerM2}
                  onChange={(v) => onConfigChange('flooring', { adhesivePerM2: v })}
                  suffix="kg/m²"
                  min={3}
                  max={8}
                  step={0.5}
                />
              </td>
              <td className="col-qty">{formatNumber(materials.flooring.adhesive, 0)} kg</td>
              <td className="col-price">
                <EditableNumber
                  value={config.prices.tile_adhesive_kg}
                  onChange={(v) => onConfigChange('prices', { tile_adhesive_kg: v })}
                  prefix="R$"
                  suffix="/kg"
                  step={0.1}
                />
              </td>
              <td className="col-total">{formatCurrency(totals.items.adhesive)}</td>
            </tr>

            <tr className="budget-table__subtotal-row">
              <td colSpan={5}>Subtotal Piso</td>
              <td className="col-total">{formatCurrency(totals.subtotals.flooring)}</td>
            </tr>

            {/* ========== ELÉTRICA ========== */}
            <tr className="budget-table__category-row">
              <td colSpan={6}>⚡ Elétrica</td>
            </tr>

            {/* Tomadas */}
            <tr className="budget-table__item-row">
              <td className="col-item">Tomadas</td>
              <td className="col-base">{measurements.roomCount} cômodos</td>
              <td className="col-calc">
                <span className="calc-formula">~{Math.round(materials.electrical.outlets / measurements.roomCount)}/cômodo</span>
              </td>
              <td className="col-qty">{materials.electrical.outlets} un</td>
              <td className="col-price">
                <EditableNumber
                  value={config.prices.outlet}
                  onChange={(v) => onConfigChange('prices', { outlet: v })}
                  prefix="R$"
                />
              </td>
              <td className="col-total">{formatCurrency(totals.items.outlets)}</td>
            </tr>

            {/* Interruptores */}
            <tr className="budget-table__item-row">
              <td className="col-item">Interruptores</td>
              <td className="col-base">{measurements.roomCount} cômodos</td>
              <td className="col-calc">
                <span className="calc-formula">~{Math.round(materials.electrical.switches / measurements.roomCount)}/cômodo</span>
              </td>
              <td className="col-qty">{materials.electrical.switches} un</td>
              <td className="col-price">
                <EditableNumber
                  value={config.prices.switch}
                  onChange={(v) => onConfigChange('prices', { switch: v })}
                  prefix="R$"
                />
              </td>
              <td className="col-total">{formatCurrency(totals.items.switches)}</td>
            </tr>

            {/* Pontos de luz */}
            <tr className="budget-table__item-row">
              <td className="col-item">Pontos de luz</td>
              <td className="col-base">{measurements.roomCount} cômodos</td>
              <td className="col-calc">
                <span className="calc-formula">~{Math.round(materials.electrical.lightPoints / measurements.roomCount)}/cômodo</span>
              </td>
              <td className="col-qty">{materials.electrical.lightPoints} un</td>
              <td className="col-price">
                <EditableNumber
                  value={config.prices.light_point}
                  onChange={(v) => onConfigChange('prices', { light_point: v })}
                  prefix="R$"
                />
              </td>
              <td className="col-total">{formatCurrency(totals.items.lights)}</td>
            </tr>

            {/* Fiação */}
            <tr className="budget-table__item-row">
              <td className="col-item">Fiação 2.5mm</td>
              <td className="col-base">{materials.electrical.outlets + materials.electrical.switches + materials.electrical.lightPoints} pontos</td>
              <td className="col-calc">
                <EditableNumber
                  value={config.electrical.wirePerPoint}
                  onChange={(v) => onConfigChange('electrical', { wirePerPoint: v })}
                  suffix="m/ponto"
                  min={5}
                  max={15}
                />
              </td>
              <td className="col-qty">{formatNumber(materials.electrical.wireEstimate, 0)} m</td>
              <td className="col-price">
                <EditableNumber
                  value={config.prices.wire_m}
                  onChange={(v) => onConfigChange('prices', { wire_m: v })}
                  prefix="R$"
                  suffix="/m"
                  step={0.5}
                />
              </td>
              <td className="col-total">{formatCurrency(totals.items.wire)}</td>
            </tr>

            <tr className="budget-table__subtotal-row">
              <td colSpan={5}>Subtotal Elétrica</td>
              <td className="col-total">{formatCurrency(totals.subtotals.electrical)}</td>
            </tr>

            {/* ========== HIDRÁULICA ========== */}
            {(materials.plumbing.coldWaterPoints + materials.plumbing.hotWaterPoints + materials.plumbing.drainPoints) > 0 && (
              <>
                <tr className="budget-table__category-row">
                  <td colSpan={6}>🚿 Hidráulica</td>
                </tr>

                {/* Pontos de água */}
                <tr className="budget-table__item-row">
                  <td className="col-item">Pontos de água</td>
                  <td className="col-base">{materials.plumbing.byRoom.length} cômodos</td>
                  <td className="col-calc">
                    <span className="calc-formula">
                      {materials.plumbing.coldWaterPoints} fria + {materials.plumbing.hotWaterPoints} quente
                    </span>
                  </td>
                  <td className="col-qty">{materials.plumbing.coldWaterPoints + materials.plumbing.hotWaterPoints} un</td>
                  <td className="col-price">
                    <EditableNumber
                      value={config.prices.water_point}
                      onChange={(v) => onConfigChange('prices', { water_point: v })}
                      prefix="R$"
                    />
                  </td>
                  <td className="col-total">{formatCurrency(totals.items.water)}</td>
                </tr>

                {/* Pontos de esgoto */}
                <tr className="budget-table__item-row">
                  <td className="col-item">Pontos de esgoto</td>
                  <td className="col-base">{materials.plumbing.byRoom.length} cômodos</td>
                  <td className="col-calc">
                    <span className="calc-formula">ralos + vaso + pia</span>
                  </td>
                  <td className="col-qty">{materials.plumbing.drainPoints} un</td>
                  <td className="col-price">
                    <EditableNumber
                      value={config.prices.drain_point}
                      onChange={(v) => onConfigChange('prices', { drain_point: v })}
                      prefix="R$"
                    />
                  </td>
                  <td className="col-total">{formatCurrency(totals.items.drains)}</td>
                </tr>

                {/* Tubulação */}
                <tr className="budget-table__item-row">
                  <td className="col-item">Tubulação PVC</td>
                  <td className="col-base">{materials.plumbing.coldWaterPoints + materials.plumbing.hotWaterPoints + materials.plumbing.drainPoints} pontos</td>
                  <td className="col-calc">
                    <EditableNumber
                      value={config.plumbing.pipePerPoint}
                      onChange={(v) => onConfigChange('plumbing', { pipePerPoint: v })}
                      suffix="m/ponto"
                      min={2}
                      max={6}
                    />
                  </td>
                  <td className="col-qty">{formatNumber(materials.plumbing.pipeEstimate, 0)} m</td>
                  <td className="col-price">
                    <EditableNumber
                      value={config.prices.pipe_m}
                      onChange={(v) => onConfigChange('prices', { pipe_m: v })}
                      prefix="R$"
                      suffix="/m"
                    />
                  </td>
                  <td className="col-total">{formatCurrency(totals.items.pipes)}</td>
                </tr>

                <tr className="budget-table__subtotal-row">
                  <td colSpan={5}>Subtotal Hidráulica</td>
                  <td className="col-total">{formatCurrency(totals.subtotals.plumbing)}</td>
                </tr>
              </>
            )}
          </tbody>
          <tfoot>
            <tr className="budget-table__total-row">
              <td colSpan={5}>TOTAL GERAL</td>
              <td className="col-total">{formatCurrency(totals.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Disclaimer */}
      <div className="budget-disclaimer">
        <strong>⚠️ Importante:</strong> Orçamento estimativo para referência. 
        Preços variam conforme região e fornecedor. 
        Não inclui mão de obra, fundação, estrutura, cobertura e esquadrias.
      </div>
    </div>
  );
}

// ============================================
// Editable Number Component
// ============================================

interface EditableNumberProps {
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
}

function EditableNumber({ value, onChange, prefix, suffix, min = 0, max, step = 1 }: EditableNumberProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value.toString());

  const handleClick = () => {
    setTempValue(value.toString());
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    const newValue = parseFloat(tempValue);
    if (!isNaN(newValue) && newValue >= min && (max === undefined || newValue <= max)) {
      onChange(newValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setTempValue(value.toString());
    }
  };

  if (isEditing) {
    return (
      <input
        type="number"
        className="editable-number__input"
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        min={min}
        max={max}
        step={step}
        autoFocus
      />
    );
  }

  return (
    <button className="editable-number" onClick={handleClick} title="Clique para editar">
      {prefix && <span className="editable-number__prefix">{prefix} </span>}
      {formatNumber(value, step < 1 ? 2 : 0)}
      {suffix && <span className="editable-number__suffix"> {suffix}</span>}
    </button>
  );
}

// ============================================
// Shared Components
// ============================================

interface StatCardProps {
  label: string;
  value: string;
  icon?: string;
}

function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <div className="stat-card">
      {icon && <span className="stat-card__icon">{icon}</span>}
      <div className="stat-card__content">
        <span className="stat-card__value">{value}</span>
        <span className="stat-card__label">{label}</span>
      </div>
    </div>
  );
}

interface RoomMeasurementsCardProps {
  room: RoomStats;
  isExpanded: boolean;
  expandedWall: string | null;
  onToggle: () => void;
  onWallToggle: (wallId: string) => void;
}

function RoomMeasurementsCard({ room, isExpanded, expandedWall, onToggle, onWallToggle }: RoomMeasurementsCardProps) {
  return (
    <div className="room-card">
      <button className="room-card__header" onClick={onToggle}>
        <span className="room-card__toggle">{isExpanded ? '▼' : '▶'}</span>
        <span className="room-card__name">{room.name}</span>
        <span className="room-card__area">{formatArea(room.floorArea)}</span>
      </button>

      {isExpanded && (
        <div className="room-card__content">
          <div className="room-card__summary">
            <div className="room-card__row">
              <span>Área do piso</span>
              <span>{formatArea(room.floorArea)}</span>
            </div>
            <div className="room-card__row">
              <span>Perímetro</span>
              <span>{formatLength(room.perimeter)}</span>
            </div>
            <div className="room-card__row">
              <span>Área das paredes</span>
              <span>{formatArea(room.wallsArea)}</span>
            </div>
            <div className="room-card__row">
              <span>Paredes (s/ aberturas)</span>
              <span>{formatArea(room.wallsAreaWithoutOpenings)}</span>
            </div>
            <div className="room-card__row">
              <span>Volume</span>
              <span>{formatVolume(room.volume)}</span>
            </div>
          </div>

          <div className="room-card__walls">
            <h5>Paredes</h5>
            {room.walls.map((wall) => (
              <WallStatsRow
                key={wall.side}
                wall={wall}
                roomId={room.id}
                isExpanded={expandedWall === `${room.id}-${wall.side}`}
                onToggle={() => onWallToggle(`${room.id}-${wall.side}`)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface WallStatsRowProps {
  wall: WallStats;
  roomId: string;
  isExpanded: boolean;
  onToggle: () => void;
}

function WallStatsRow({ wall, isExpanded, onToggle }: WallStatsRowProps) {
  if (!wall.exists) {
    return (
      <div className="wall-row wall-row--virtual">
        <span className="wall-row__name">{SIDE_LABELS[wall.side]}</span>
        <span className="wall-row__value">Virtual</span>
      </div>
    );
  }

  return (
    <div className="wall-row">
      <button className="wall-row__header" onClick={onToggle}>
        <span className="wall-row__toggle">{isExpanded ? '▼' : '▶'}</span>
        <span className="wall-row__name">{SIDE_LABELS[wall.side]}</span>
        <span className="wall-row__value">{formatArea(wall.areaWithoutOpenings)}</span>
      </button>

      {isExpanded && (
        <div className="wall-row__details">
          <div className="wall-row__detail">
            <span>Comprimento</span>
            <span>{formatNumber(wall.length / 100)} m</span>
          </div>
          <div className="wall-row__detail">
            <span>Altura</span>
            <span>{formatNumber(wall.height / 100)} m</span>
          </div>
          <div className="wall-row__detail">
            <span>Área total</span>
            <span>{formatArea(wall.area)}</span>
          </div>
          <div className="wall-row__detail">
            <span>Aberturas</span>
            <span>{formatArea(wall.openingsArea)}</span>
          </div>
          <div className="wall-row__detail">
            <span>Área útil</span>
            <span>{formatArea(wall.areaWithoutOpenings)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default StatsPanel;
