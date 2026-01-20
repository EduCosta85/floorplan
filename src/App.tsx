import { useState, useCallback, Suspense, useEffect } from 'react';
import { FloorPlanProvider, useFloorPlan } from './context/FloorPlanContext';
import { FloorPlanViewer, FloorPlan3D, EditorPanel, StatsPanel } from './components';
import type { ValidationIssue } from './utils/validation';
import {
  getAllProjects,
  getCurrentProjectId,
  setCurrentProjectId,
  getProject,
  saveProject,
  createVersion,
} from './services/storage';
import casaExemplo from '../examples/casa-exemplo.json';
import type { FloorPlan } from './types/floor-plan';
import './App.css';

/**
 * Get initial floor plan from localStorage or default example
 * - If 1 project saved: load it
 * - If multiple projects: load last edited
 * - If no projects: load example
 */
function getInitialFloorPlan(): { floorPlan: FloorPlan; projectId: string | null } {
  const projects = getAllProjects();
  
  if (projects.length === 0) {
    // No saved projects, use example
    return { floorPlan: casaExemplo as FloorPlan, projectId: null };
  }
  
  if (projects.length === 1) {
    // Single project, load it
    setCurrentProjectId(projects[0].id);
    return { floorPlan: projects[0].floorPlan, projectId: projects[0].id };
  }
  
  // Multiple projects - check if there's a current one
  const currentId = getCurrentProjectId();
  if (currentId) {
    const currentProject = getProject(currentId);
    if (currentProject) {
      return { floorPlan: currentProject.floorPlan, projectId: currentId };
    }
  }
  
  // Load most recently updated project
  const sortedProjects = [...projects].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  const mostRecent = sortedProjects[0];
  setCurrentProjectId(mostRecent.id);
  return { floorPlan: mostRecent.floorPlan, projectId: mostRecent.id };
}

type MainView = 'floorplan' | '3d' | 'costs';

// Initialize with stored project info
const initialData = getInitialFloorPlan();

function FloorPlanApp() {
  const { 
    state, 
    selectRoom, 
    clearSelection,
    selectFurniture,
    moveFurniture,
    rotateFurniture,
    exportFloorPlan,
    markClean,
  } = useFloorPlan();
  const { floorPlan, selectedRoomId, selectedFurnitureId, isDirty } = state;
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [mainView, setMainView] = useState<MainView>('floorplan');
  const [currentProjectId, setCurrentProjectIdState] = useState<string | null>(initialData.projectId);
  const [isSaving, setIsSaving] = useState(false);

  // Callbacks - defined before useEffects that depend on them
  const handleValidation = useCallback((issues: ValidationIssue[]) => {
    setValidationIssues(issues);
  }, []);

  const handleIssueClick = useCallback((issue: ValidationIssue) => {
    if (issue.roomIds.length > 0) {
      selectRoom(issue.roomIds[0]);
      setMainView('floorplan'); // Switch to floorplan to show the room
    }
  }, [selectRoom]);

  const handleQuickSave = useCallback(() => {
    setIsSaving(true);
    const currentFloorPlan = exportFloorPlan();
    const name = currentFloorPlan.name ?? 'Meu Projeto';
    
    if (currentProjectId) {
      // Create version before saving
      createVersion(currentProjectId, 'Salvamento rápido');
      saveProject(currentFloorPlan, name, currentProjectId);
    } else {
      // First save - create new project
      const project = saveProject(currentFloorPlan, name);
      setCurrentProjectId(project.id);
      setCurrentProjectIdState(project.id);
    }
    
    markClean();
    setIsSaving(false);
  }, [currentProjectId, exportFloorPlan, markClean]);

  // Sync currentProjectId with localStorage changes
  useEffect(() => {
    const checkProjectId = () => {
      const storedId = getCurrentProjectId();
      if (storedId !== currentProjectId) {
        setCurrentProjectIdState(storedId);
      }
    };
    
    // Check periodically (for changes from ProjectsPanel)
    const interval = setInterval(checkProjectId, 500);
    return () => clearInterval(interval);
  }, [currentProjectId]);

  // Keyboard shortcut for save (Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (isDirty) {
          handleQuickSave();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDirty, handleQuickSave]);

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
        <div className="app-header__status">
          {/* Unsaved changes indicator */}
          {isDirty && (
            <div className="app-header__unsaved">
              <span className="status-badge status-badge--unsaved">
                ● Alterações não salvas
              </span>
              <button 
                className="app-header__save-btn"
                onClick={handleQuickSave}
                disabled={isSaving}
                title="Salvar alterações (Ctrl+S)"
              >
                {isSaving ? '⏳' : '💾'} Salvar
              </button>
            </div>
          )}
          
          {/* Validation errors/warnings */}
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
              selectedFurnitureId={selectedFurnitureId}
              onRoomClick={selectRoom}
              onBackgroundClick={() => {
                clearSelection();
                selectFurniture(null);
              }}
              onValidation={handleValidation}
              onFurnitureClick={selectFurniture}
              onFurnitureMove={moveFurniture}
              onFurnitureRotate={rotateFurniture}
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
    <FloorPlanProvider initialFloorPlan={initialData.floorPlan}>
      <FloorPlanApp />
    </FloorPlanProvider>
  );
}

export default App;
