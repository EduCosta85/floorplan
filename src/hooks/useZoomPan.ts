import { useState, useCallback, useRef, useEffect } from 'react';

interface ZoomPanState {
  scale: number;
  translateX: number;
  translateY: number;
}

interface UseZoomPanOptions {
  minScale?: number;
  maxScale?: number;
  scaleStep?: number;
}

interface UseZoomPanReturn {
  state: ZoomPanState;
  containerRef: React.RefObject<HTMLDivElement>;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  fitToView: () => void;
  setContentSize: (width: number, height: number) => void;
}

export function useZoomPan(options: UseZoomPanOptions = {}): UseZoomPanReturn {
  const { minScale = 0.25, maxScale = 4, scaleStep = 0.25 } = options;

  const [state, setState] = useState<ZoomPanState>({
    scale: 1,
    translateX: 0,
    translateY: 0,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const contentSizeRef = useRef({ width: 0, height: 0 });
  const isPanningRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  const zoomIn = useCallback(() => {
    setState((prev) => ({
      ...prev,
      scale: Math.min(prev.scale + scaleStep, maxScale),
    }));
  }, [scaleStep, maxScale]);

  const zoomOut = useCallback(() => {
    setState((prev) => ({
      ...prev,
      scale: Math.max(prev.scale - scaleStep, minScale),
    }));
  }, [scaleStep, minScale]);

  const resetZoom = useCallback(() => {
    setState({ scale: 1, translateX: 0, translateY: 0 });
  }, []);

  const fitToView = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const { width: contentWidth, height: contentHeight } = contentSizeRef.current;
    if (contentWidth === 0 || contentHeight === 0) return;

    const containerRect = container.getBoundingClientRect();
    const padding = 40;

    const scaleX = (containerRect.width - padding * 2) / contentWidth;
    const scaleY = (containerRect.height - padding * 2) / contentHeight;
    const newScale = Math.min(scaleX, scaleY, maxScale);

    setState({
      scale: Math.max(newScale, minScale),
      translateX: 0,
      translateY: 0,
    });
  }, [minScale, maxScale]);

  const setContentSize = useCallback((width: number, height: number) => {
    contentSizeRef.current = { width, height };
  }, []);

  // Mouse wheel zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -scaleStep : scaleStep;
      
      setState((prev) => {
        const newScale = Math.min(Math.max(prev.scale + delta, minScale), maxScale);
        return { ...prev, scale: newScale };
      });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [scaleStep, minScale, maxScale]);

  // Pan with mouse drag
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseDown = (e: MouseEvent) => {
      // Only pan with middle mouse button or when holding space
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        e.preventDefault();
        isPanningRef.current = true;
        lastPosRef.current = { x: e.clientX, y: e.clientY };
        container.style.cursor = 'grabbing';
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isPanningRef.current) return;

      const deltaX = e.clientX - lastPosRef.current.x;
      const deltaY = e.clientY - lastPosRef.current.y;

      setState((prev) => ({
        ...prev,
        translateX: prev.translateX + deltaX,
        translateY: prev.translateY + deltaY,
      }));

      lastPosRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isPanningRef.current = false;
      container.style.cursor = '';
    };

    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return {
    state,
    containerRef: containerRef as React.RefObject<HTMLDivElement>,
    zoomIn,
    zoomOut,
    resetZoom,
    fitToView,
    setContentSize,
  };
}
