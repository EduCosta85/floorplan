import { useState, useCallback, Suspense } from 'react';
import { FloorPlanProvider, useFloorPlan } from './context/FloorPlanContext';
import { FloorPlanViewer, FloorPlan3D, EditorPanel, StatsPanel } from './components';
import type { ValidationIssue } from './utils/validation';
import casaExemplo from '../examples/casa-exemplo.json';
import type { FloorPlan } from './types/floor-plan';
import './App.css';

type MainView = 'floorplan' | '3d' | 'costs';

function FloorPlanApp() {
  const { state, selectRoom, clearSelection } = useFloorPlan();
  const { floorPlan, selectedRoomId } = state;
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [mainView, setMainView] = useState<MainView>('floorplan');

  const handleValidation = useCallback((issues: ValidationIssue[]) => {
    setValidationIssues(issues);
  }, []);

  const handleIssueClick = useCallback((issue: ValidationIssue) => {
    if (issue.roomIds.length > 0) {
      selectRoom(issue.roomIds[0]);
      setMainView('floorplan'); // Switch to floorplan to show the room
    }
  }, [selectRoom]);

  const errorCount = validationIssues.filter(i => i.severity === 'error').length;
  const warningCount = validationIssues.filter(i => i.severity === 'warning').length;

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__info">
          <h1>Floor Plan Editor</h1>
          <p>
            {floorPlan.floor.name} &bull; {floorPlan.floor.rooms.length} cômodos
            &bull; Escala: {floorPlan.scale}px/{floorPlan.unit}
          </p>
        </div>
        {(errorCount > 0 || warningCount > 0) && (
          <div className="app-header__status">
            {errorCount > 0 && (
              <span className="status-badge status-badge--error">
                {errorCount} erro{errorCount > 1 ? 's' : ''}
              </span>
            )}
            {warningCount > 0 && (
              <span className="status-badge status-badge--warning">
                {warningCount} aviso{warningCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}
      </header>

      <main className="app-main">
        {/* Main Area Tabs */}
        <div className="main-tabs">
          <button
            className={`main-tabs__tab ${mainView === 'floorplan' ? 'active' : ''}`}
            onClick={() => setMainView('floorplan')}
          >
            <span className="main-tabs__icon">⊞</span>
            Planta 2D
          </button>
          <button
            className={`main-tabs__tab ${mainView === '3d' ? 'active' : ''}`}
            onClick={() => setMainView('3d')}
          >
            <span className="main-tabs__icon">◇</span>
            Vista 3D
          </button>
          <button
            className={`main-tabs__tab ${mainView === 'costs' ? 'active' : ''}`}
            onClick={() => setMainView('costs')}
          >
            <span className="main-tabs__icon">$</span>
            Custos
          </button>
        </div>

        {/* Main Area Content */}
        <div className="main-content">
          {mainView === 'floorplan' && (
            <FloorPlanViewer
              floorPlan={floorPlan}
              padding={30}
              selectedRoomId={selectedRoomId}
              onRoomClick={selectRoom}
              onBackgroundClick={clearSelection}
              onValidation={handleValidation}
            />
          )}
          {mainView === '3d' && (
            <Suspense fallback={<div className="main-content__loading">Carregando 3D...</div>}>
              <FloorPlan3D
                floorPlan={floorPlan}
                selectedRoomId={selectedRoomId}
                onRoomClick={selectRoom}
              />
            </Suspense>
          )}
          {mainView === 'costs' && (
            <div className="main-content__stats">
              <StatsPanel floorPlan={floorPlan} />
            </div>
          )}
        </div>
      </main>

      <aside className="app-sidebar">
        <EditorPanel
          validationIssues={validationIssues}
          onIssueClick={handleIssueClick}
        />
      </aside>
    </div>
  );
}

function App() {
  return (
    <FloorPlanProvider initialFloorPlan={casaExemplo as FloorPlan}>
      <FloorPlanApp />
    </FloorPlanProvider>
  );
}

export default App;
