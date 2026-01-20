interface ZoomControlsProps {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onFit: () => void;
}

export function ZoomControls({
  scale,
  onZoomIn,
  onZoomOut,
  onReset,
  onFit,
}: ZoomControlsProps) {
  const percentage = Math.round(scale * 100);

  return (
    <div className="zoom-controls">
      <button
        className="zoom-controls__btn"
        onClick={onZoomOut}
        title="Diminuir zoom"
        aria-label="Diminuir zoom"
      >
        −
      </button>
      
      <button
        className="zoom-controls__value"
        onClick={onReset}
        title="Resetar zoom (100%)"
        aria-label="Resetar zoom"
      >
        {percentage}%
      </button>
      
      <button
        className="zoom-controls__btn"
        onClick={onZoomIn}
        title="Aumentar zoom"
        aria-label="Aumentar zoom"
      >
        +
      </button>
      
      <div className="zoom-controls__divider" />
      
      <button
        className="zoom-controls__btn zoom-controls__btn--fit"
        onClick={onFit}
        title="Ajustar à tela"
        aria-label="Ajustar à tela"
      >
        ⊡
      </button>
    </div>
  );
}

export default ZoomControls;
