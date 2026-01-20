import { useState, useRef, useEffect, useCallback } from 'react';
import { Button, Checkbox } from '../ui';
import { useFloorPlan } from '../../context/FloorPlanContext';
import {
  getProjectsList,
  getProject,
  saveProject,
  deleteProject,
  renameProject,
  duplicateProject,
  getCurrentProjectId,
  setCurrentProjectId,
  exportProjectAsFile,
  importProjectFromFile,
  getSettings,
  saveSettings,
  createVersion,
  getProjectVersions,
  restoreVersion,
  deleteVersion,
  autoSaveProject,
  type ProjectMetadata,
  type ProjectVersion,
  type StorageSettings,
} from '../../services/storage';
import { createEmptyFloorPlan } from '../../context/FloorPlanContext';

export function ProjectsPanel() {
  const { state, importFloorPlan, exportFloorPlan } = useFloorPlan();
  const [projects, setProjects] = useState<ProjectMetadata[]>([]);
  const [currentProjectId, setCurrentId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [settings, setSettings] = useState<StorageSettings>(getSettings());
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load projects on mount
  useEffect(() => {
    refreshProjects();
    setSettings(getSettings());
  }, []);

  // Auto-save effect
  useEffect(() => {
    if (!settings.autoSaveEnabled || !currentProjectId || !state.isDirty) {
      return;
    }

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Set new timer
    autoSaveTimerRef.current = setTimeout(() => {
      autoSaveProject(exportFloorPlan());
      setLastAutoSave(new Date());
      refreshProjects();
    }, settings.autoSaveInterval * 1000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [state.isDirty, state.floorPlan, settings.autoSaveEnabled, settings.autoSaveInterval, currentProjectId, exportFloorPlan]);

  const refreshProjects = () => {
    setProjects(getProjectsList());
    setCurrentId(getCurrentProjectId());
  };

  const handleNewProject = () => {
    if (!newProjectName.trim()) return;
    
    if (state.isDirty && currentProjectId) {
      if (!confirm('Você tem alterações não salvas. Deseja criar um novo projeto mesmo assim?')) {
        return;
      }
    }
    
    const emptyPlan = createEmptyFloorPlan();
    emptyPlan.name = newProjectName.trim();
    
    const project = saveProject(emptyPlan, newProjectName.trim());
    importFloorPlan(project.floorPlan);
    
    setNewProjectName('');
    setShowNewProject(false);
    refreshProjects();
  };

  const handleLoadProject = (id: string) => {
    if (state.isDirty && currentProjectId && currentProjectId !== id) {
      if (!confirm('Você tem alterações não salvas. Deseja trocar de projeto mesmo assim?')) {
        return;
      }
    }
    
    const project = getProject(id);
    if (project) {
      importFloorPlan(project.floorPlan);
      setCurrentProjectId(id);
      setCurrentId(id);
    }
  };

  const handleSaveProject = () => {
    const floorPlan = exportFloorPlan();
    const name = floorPlan.name ?? 'Meu Projeto';
    
    if (currentProjectId) {
      // Create version before saving
      createVersion(currentProjectId, 'Salvamento manual');
      saveProject(floorPlan, name, currentProjectId);
    } else {
      const project = saveProject(floorPlan, name);
      setCurrentId(project.id);
    }
    
    refreshProjects();
  };

  const handleSaveAsNew = () => {
    const name = prompt('Nome do novo projeto:', `${exportFloorPlan().name ?? 'Projeto'} (cópia)`);
    if (!name) return;
    
    const project = saveProject(exportFloorPlan(), name);
    setCurrentId(project.id);
    refreshProjects();
  };

  const handleDeleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const project = projects.find(p => p.id === id);
    if (!project) return;
    
    if (!confirm(`Excluir "${project.name}"? Esta ação não pode ser desfeita.`)) {
      return;
    }
    
    deleteProject(id);
    
    if (currentProjectId === id) {
      setCurrentId(null);
      importFloorPlan(createEmptyFloorPlan());
    }
    
    refreshProjects();
  };

  const handleRenameProject = (id: string) => {
    if (!editingName.trim()) {
      setEditingId(null);
      return;
    }
    
    renameProject(id, editingName.trim());
    setEditingId(null);
    refreshProjects();
  };

  const handleDuplicateProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    duplicateProject(id);
    refreshProjects();
  };

  const handleExportProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const project = getProject(id);
    if (project) {
      exportProjectAsFile(project);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const project = await importProjectFromFile(file);
      importFloorPlan(project.floorPlan);
      refreshProjects();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erro ao importar arquivo');
    }
    
    e.target.value = '';
  };

  const handleSettingsChange = useCallback((key: keyof StorageSettings, value: boolean | number) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    saveSettings(newSettings);
  }, [settings]);

  const handleShowVersions = () => {
    if (!currentProjectId) return;
    setVersions(getProjectVersions(currentProjectId));
    setShowVersions(true);
  };

  const handleCreateVersion = () => {
    if (!currentProjectId) return;
    const description = prompt('Descrição da versão (opcional):');
    
    // Save current state first
    const floorPlan = exportFloorPlan();
    saveProject(floorPlan, floorPlan.name ?? 'Projeto', currentProjectId);
    
    createVersion(currentProjectId, description ?? undefined);
    setVersions(getProjectVersions(currentProjectId));
    refreshProjects();
  };

  const handleRestoreVersion = (versionId: string) => {
    if (!currentProjectId) return;
    
    const version = versions.find(v => v.id === versionId);
    if (!version) return;
    
    if (!confirm(`Restaurar versão de ${formatDate(version.timestamp)}? O estado atual será salvo como backup.`)) {
      return;
    }
    
    const restoredPlan = restoreVersion(currentProjectId, versionId);
    if (restoredPlan) {
      importFloorPlan(restoredPlan);
      setVersions(getProjectVersions(currentProjectId));
      refreshProjects();
    }
  };

  const handleDeleteVersion = (versionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentProjectId) return;
    
    if (!confirm('Excluir esta versão?')) return;
    
    deleteVersion(currentProjectId, versionId);
    setVersions(getProjectVersions(currentProjectId));
    refreshProjects();
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="projects-panel">
      {/* Actions */}
      <div className="projects-panel__actions">
        <Button
          variant="primary"
          size="sm"
          onClick={handleSaveProject}
        >
          💾 {currentProjectId ? 'Salvar' : 'Salvar Como'}
        </Button>
        
        {currentProjectId && (
          <Button variant="secondary" size="sm" onClick={handleSaveAsNew}>
            📋 Salvar Como...
          </Button>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowNewProject(!showNewProject)}
        >
          ➕ Novo
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          📂 Importar
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSettings(!showSettings)}
        >
          ⚙️
        </Button>
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImportFile}
          style={{ display: 'none' }}
        />
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="projects-panel__settings">
          <h4>⚙️ Configurações</h4>
          
          <Checkbox
            label="Salvamento automático"
            checked={settings.autoSaveEnabled}
            onChange={(e) => handleSettingsChange('autoSaveEnabled', e.target.checked)}
          />
          
          {settings.autoSaveEnabled && (
            <div className="projects-panel__setting-row">
              <label>Intervalo:</label>
              <select
                value={settings.autoSaveInterval}
                onChange={(e) => handleSettingsChange('autoSaveInterval', Number(e.target.value))}
              >
                <option value={15}>15 segundos</option>
                <option value={30}>30 segundos</option>
                <option value={60}>1 minuto</option>
                <option value={120}>2 minutos</option>
                <option value={300}>5 minutos</option>
              </select>
            </div>
          )}
          
          <div className="projects-panel__setting-row">
            <label>Máx. versões:</label>
            <select
              value={settings.maxVersions}
              onChange={(e) => handleSettingsChange('maxVersions', Number(e.target.value))}
            >
              <option value={5}>5 versões</option>
              <option value={10}>10 versões</option>
              <option value={20}>20 versões</option>
              <option value={50}>50 versões</option>
            </select>
          </div>
        </div>
      )}

      {/* New Project Form */}
      {showNewProject && (
        <div className="projects-panel__new">
          <input
            type="text"
            placeholder="Nome do projeto..."
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleNewProject()}
            autoFocus
          />
          <div className="projects-panel__new-actions">
            <Button variant="primary" size="sm" onClick={handleNewProject}>
              Criar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowNewProject(false);
                setNewProjectName('');
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Current Project Indicator */}
      {currentProjectId && (
        <div className="projects-panel__current">
          <div className="projects-panel__current-info">
            <span className="projects-panel__current-label">Projeto atual:</span>
            <span className="projects-panel__current-name">
              {projects.find(p => p.id === currentProjectId)?.name ?? 'Sem nome'}
            </span>
            {state.isDirty && <span className="projects-panel__unsaved">● Não salvo</span>}
            {lastAutoSave && settings.autoSaveEnabled && (
              <span className="projects-panel__autosave">
                Auto-salvo: {lastAutoSave.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          <div className="projects-panel__current-actions">
            <Button variant="ghost" size="sm" onClick={handleShowVersions}>
              📜 Versões ({projects.find(p => p.id === currentProjectId)?.versionCount ?? 0})
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCreateVersion}>
              📸 Criar Versão
            </Button>
          </div>
        </div>
      )}

      {/* Versions Panel */}
      {showVersions && currentProjectId && (
        <div className="projects-panel__versions">
          <div className="projects-panel__versions-header">
            <h4>📜 Histórico de Versões</h4>
            <Button variant="ghost" size="sm" onClick={() => setShowVersions(false)}>
              ✕
            </Button>
          </div>
          
          {versions.length === 0 ? (
            <p className="projects-panel__empty">
              Nenhuma versão salva.<br />
              Clique em "Criar Versão" para salvar o estado atual.
            </p>
          ) : (
            <ul className="projects-panel__versions-list">
              {versions.map((version) => (
                <li
                  key={version.id}
                  className="projects-panel__version-item"
                  onClick={() => handleRestoreVersion(version.id)}
                >
                  <div className="projects-panel__version-info">
                    <span className="projects-panel__version-date">
                      {formatDate(version.timestamp)}
                    </span>
                    {version.description && (
                      <span className="projects-panel__version-desc">
                        {version.description}
                      </span>
                    )}
                    <span className="projects-panel__version-rooms">
                      {version.floorPlan.floor.rooms.length} cômodo(s)
                    </span>
                  </div>
                  <div className="projects-panel__version-actions">
                    <button
                      title="Restaurar"
                      onClick={(e) => { e.stopPropagation(); handleRestoreVersion(version.id); }}
                    >
                      ↩️
                    </button>
                    <button
                      title="Excluir"
                      onClick={(e) => handleDeleteVersion(version.id, e)}
                    >
                      🗑️
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Projects List */}
      {!showVersions && (
        <div className="projects-panel__list">
          <h4>Projetos Salvos ({projects.length})</h4>
          
          {projects.length === 0 ? (
            <p className="projects-panel__empty">
              Nenhum projeto salvo.<br />
              Clique em "Salvar" para salvar o projeto atual.
            </p>
          ) : (
            <ul>
              {projects.map((project) => (
                <li
                  key={project.id}
                  className={`projects-panel__item ${project.id === currentProjectId ? 'active' : ''}`}
                  onClick={() => handleLoadProject(project.id)}
                >
                  <div className="projects-panel__item-main">
                    {editingId === project.id ? (
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => handleRenameProject(project.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenameProject(project.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                      />
                    ) : (
                      <>
                        <span className="projects-panel__item-name">{project.name}</span>
                        <span className="projects-panel__item-meta">
                          {project.roomCount} cômodo{project.roomCount !== 1 ? 's' : ''} • 
                          {project.versionCount > 0 && ` ${project.versionCount} versões • `}
                          {formatDate(project.updatedAt)}
                        </span>
                      </>
                    )}
                  </div>
                  
                  <div className="projects-panel__item-actions">
                    <button
                      title="Renomear"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(project.id);
                        setEditingName(project.name);
                      }}
                    >
                      ✏️
                    </button>
                    <button
                      title="Duplicar"
                      onClick={(e) => handleDuplicateProject(project.id, e)}
                    >
                      📋
                    </button>
                    <button
                      title="Exportar JSON"
                      onClick={(e) => handleExportProject(project.id, e)}
                    >
                      ⬇️
                    </button>
                    <button
                      title="Excluir"
                      onClick={(e) => handleDeleteProject(project.id, e)}
                    >
                      🗑️
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default ProjectsPanel;
