import type { FloorPlan } from '../types/floor-plan';

const STORAGE_KEY = 'floorplan-projects';
const CURRENT_PROJECT_KEY = 'floorplan-current-project';
const SETTINGS_KEY = 'floorplan-settings';
const MAX_VERSIONS = 10;

export interface ProjectVersion {
  id: string;
  timestamp: string;
  floorPlan: FloorPlan;
  description?: string;
}

export interface SavedProject {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  floorPlan: FloorPlan;
  versions?: ProjectVersion[];
}

export interface ProjectMetadata {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  roomCount: number;
  versionCount: number;
}

export interface StorageSettings {
  autoSaveEnabled: boolean;
  autoSaveInterval: number; // in seconds
  maxVersions: number;
}

/**
 * Generate a unique project ID
 */
function generateProjectId(): string {
  return `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get all projects from localStorage
 */
export function getAllProjects(): SavedProject[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading projects:', error);
    return [];
  }
}

/**
 * Get projects metadata (without full floorPlan data)
 */
export function getProjectsList(): ProjectMetadata[] {
  const projects = getAllProjects();
  return projects.map(p => ({
    id: p.id,
    name: p.name,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    roomCount: p.floorPlan.floor.rooms.length,
    versionCount: p.versions?.length ?? 0,
  }));
}

/**
 * Get storage settings
 */
export function getSettings(): StorageSettings {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    if (!data) {
      return {
        autoSaveEnabled: true,
        autoSaveInterval: 30,
        maxVersions: MAX_VERSIONS,
      };
    }
    return JSON.parse(data);
  } catch {
    return {
      autoSaveEnabled: true,
      autoSaveInterval: 30,
      maxVersions: MAX_VERSIONS,
    };
  }
}

/**
 * Save storage settings
 */
export function saveSettings(settings: StorageSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

/**
 * Get a specific project by ID
 */
export function getProject(id: string): SavedProject | null {
  const projects = getAllProjects();
  return projects.find(p => p.id === id) ?? null;
}

/**
 * Save a new project or update existing
 */
export function saveProject(floorPlan: FloorPlan, name: string, existingId?: string): SavedProject {
  const projects = getAllProjects();
  const now = new Date().toISOString();
  
  if (existingId) {
    // Update existing project
    const index = projects.findIndex(p => p.id === existingId);
    if (index !== -1) {
      projects[index] = {
        ...projects[index],
        name,
        updatedAt: now,
        floorPlan,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
      setCurrentProjectId(existingId);
      return projects[index];
    }
  }
  
  // Create new project
  const newProject: SavedProject = {
    id: generateProjectId(),
    name,
    createdAt: now,
    updatedAt: now,
    floorPlan,
  };
  
  projects.push(newProject);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  setCurrentProjectId(newProject.id);
  
  return newProject;
}

/**
 * Delete a project
 */
export function deleteProject(id: string): boolean {
  const projects = getAllProjects();
  const filtered = projects.filter(p => p.id !== id);
  
  if (filtered.length === projects.length) {
    return false; // Project not found
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  
  // Clear current project if it was deleted
  if (getCurrentProjectId() === id) {
    setCurrentProjectId(null);
  }
  
  return true;
}

/**
 * Rename a project
 */
export function renameProject(id: string, newName: string): boolean {
  const projects = getAllProjects();
  const project = projects.find(p => p.id === id);
  
  if (!project) return false;
  
  project.name = newName;
  project.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  
  return true;
}

/**
 * Duplicate a project
 */
export function duplicateProject(id: string): SavedProject | null {
  const project = getProject(id);
  if (!project) return null;
  
  return saveProject(
    JSON.parse(JSON.stringify(project.floorPlan)), // Deep clone
    `${project.name} (cópia)`
  );
}

/**
 * Get current project ID
 */
export function getCurrentProjectId(): string | null {
  return localStorage.getItem(CURRENT_PROJECT_KEY);
}

/**
 * Set current project ID
 */
export function setCurrentProjectId(id: string | null): void {
  if (id) {
    localStorage.setItem(CURRENT_PROJECT_KEY, id);
  } else {
    localStorage.removeItem(CURRENT_PROJECT_KEY);
  }
}

/**
 * Load the current project or return null
 */
export function loadCurrentProject(): SavedProject | null {
  const currentId = getCurrentProjectId();
  if (!currentId) return null;
  return getProject(currentId);
}

/**
 * Auto-save current project (debounced in the caller)
 */
export function autoSaveProject(floorPlan: FloorPlan): void {
  const currentId = getCurrentProjectId();
  if (!currentId) return;
  
  const projects = getAllProjects();
  const index = projects.findIndex(p => p.id === currentId);
  
  if (index !== -1) {
    projects[index].floorPlan = floorPlan;
    projects[index].updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }
}

/**
 * Create a version snapshot of the current project
 */
export function createVersion(projectId: string, description?: string): ProjectVersion | null {
  const projects = getAllProjects();
  const project = projects.find(p => p.id === projectId);
  
  if (!project) return null;
  
  const settings = getSettings();
  const version: ProjectVersion = {
    id: `v-${Date.now()}`,
    timestamp: new Date().toISOString(),
    floorPlan: JSON.parse(JSON.stringify(project.floorPlan)), // Deep clone
    description,
  };
  
  // Initialize versions array if needed
  if (!project.versions) {
    project.versions = [];
  }
  
  // Add new version
  project.versions.unshift(version);
  
  // Limit number of versions
  if (project.versions.length > settings.maxVersions) {
    project.versions = project.versions.slice(0, settings.maxVersions);
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  
  return version;
}

/**
 * Get all versions of a project
 */
export function getProjectVersions(projectId: string): ProjectVersion[] {
  const project = getProject(projectId);
  return project?.versions ?? [];
}

/**
 * Restore a specific version
 */
export function restoreVersion(projectId: string, versionId: string): FloorPlan | null {
  const project = getProject(projectId);
  if (!project || !project.versions) return null;
  
  const version = project.versions.find(v => v.id === versionId);
  if (!version) return null;
  
  // Create a new version before restoring (backup current state)
  createVersion(projectId, 'Backup antes de restaurar');
  
  // Update project with restored version
  const projects = getAllProjects();
  const index = projects.findIndex(p => p.id === projectId);
  
  if (index !== -1) {
    projects[index].floorPlan = JSON.parse(JSON.stringify(version.floorPlan));
    projects[index].updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    return projects[index].floorPlan;
  }
  
  return null;
}

/**
 * Delete a specific version
 */
export function deleteVersion(projectId: string, versionId: string): boolean {
  const projects = getAllProjects();
  const project = projects.find(p => p.id === projectId);
  
  if (!project || !project.versions) return false;
  
  const initialLength = project.versions.length;
  project.versions = project.versions.filter(v => v.id !== versionId);
  
  if (project.versions.length === initialLength) return false;
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  return true;
}

/**
 * Export project as JSON file
 */
export function exportProjectAsFile(project: SavedProject): void {
  const dataStr = JSON.stringify(project.floorPlan, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${project.name.replace(/[^a-z0-9]/gi, '_')}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Import project from JSON file
 */
export function importProjectFromFile(file: File): Promise<SavedProject> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const floorPlan = JSON.parse(e.target?.result as string) as FloorPlan;
        const name = file.name.replace(/\.json$/i, '');
        const project = saveProject(floorPlan, name);
        resolve(project);
      } catch (error) {
        reject(new Error('Arquivo JSON inválido'));
      }
    };
    
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsText(file);
  });
}
