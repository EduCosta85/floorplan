import { useState } from 'react';

export interface Snapshot {
  id: string;
  name: string;
  imageData: string;
  createdAt: string;
  viewMode: 'orbit' | 'firstPerson';
  cameraHeight?: number;
}

interface SnapshotsGalleryProps {
  snapshots: Snapshot[];
  onDelete: (id: string) => void;
  onRename: (id: string, newName: string) => void;
}

export function SnapshotsGallery({ snapshots, onDelete, onRename }: SnapshotsGalleryProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null);

  const handleStartEdit = (snapshot: Snapshot) => {
    setEditingId(snapshot.id);
    setEditName(snapshot.name);
  };

  const handleSaveEdit = (id: string) => {
    if (editName.trim()) {
      onRename(id, editName.trim());
    }
    setEditingId(null);
    setEditName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      handleSaveEdit(id);
    } else if (e.key === 'Escape') {
      setEditingId(null);
      setEditName('');
    }
  };

  const handleDownload = (snapshot: Snapshot) => {
    const link = document.createElement('a');
    link.href = snapshot.imageData;
    link.download = `${snapshot.name.replace(/\s+/g, '_')}.png`;
    link.click();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (snapshots.length === 0) {
    return (
      <div className="snapshots-gallery snapshots-gallery--empty">
        <div className="snapshots-gallery__empty-icon">📷</div>
        <p>Nenhuma foto capturada ainda</p>
        <p className="snapshots-gallery__empty-hint">
          Vá para a <strong>Vista 3D</strong> e clique no botão 📷 para capturar fotos da visualização
        </p>
      </div>
    );
  }

  return (
    <div className="snapshots-gallery">
      <div className="snapshots-gallery__header">
        <h3>Fotos Capturadas</h3>
        <span className="snapshots-gallery__count">{snapshots.length} foto{snapshots.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="snapshots-gallery__grid">
        {snapshots.map((snapshot) => (
          <div key={snapshot.id} className="snapshot-card">
            <div 
              className="snapshot-card__image"
              onClick={() => setSelectedSnapshot(snapshot)}
            >
              <img src={snapshot.imageData} alt={snapshot.name} />
              <div className="snapshot-card__overlay">
                <span>🔍 Ver</span>
              </div>
            </div>
            
            <div className="snapshot-card__info">
              {editingId === snapshot.id ? (
                <input
                  type="text"
                  className="snapshot-card__name-input"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={() => handleSaveEdit(snapshot.id)}
                  onKeyDown={(e) => handleKeyDown(e, snapshot.id)}
                  autoFocus
                />
              ) : (
                <span 
                  className="snapshot-card__name"
                  onClick={() => handleStartEdit(snapshot)}
                  title="Clique para editar"
                >
                  {snapshot.name}
                </span>
              )}
              <span className="snapshot-card__date">{formatDate(snapshot.createdAt)}</span>
            </div>

            <div className="snapshot-card__actions">
              <button
                className="snapshot-card__action"
                onClick={() => handleDownload(snapshot)}
                title="Baixar imagem"
              >
                ⬇️
              </button>
              <button
                className="snapshot-card__action"
                onClick={() => handleStartEdit(snapshot)}
                title="Renomear"
              >
                ✏️
              </button>
              <button
                className="snapshot-card__action snapshot-card__action--danger"
                onClick={() => onDelete(snapshot.id)}
                title="Excluir"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedSnapshot && (
        <div 
          className="snapshots-lightbox"
          onClick={() => setSelectedSnapshot(null)}
        >
          <div className="snapshots-lightbox__content" onClick={(e) => e.stopPropagation()}>
            <button 
              className="snapshots-lightbox__close"
              onClick={() => setSelectedSnapshot(null)}
            >
              ✕
            </button>
            <img src={selectedSnapshot.imageData} alt={selectedSnapshot.name} />
            <div className="snapshots-lightbox__info">
              <h4>{selectedSnapshot.name}</h4>
              <p>{formatDate(selectedSnapshot.createdAt)}</p>
              <button
                className="btn btn--primary btn--sm"
                onClick={() => handleDownload(selectedSnapshot)}
              >
                ⬇️ Baixar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SnapshotsGallery;
