import { useRef, useEffect, useCallback, useState } from 'react';
import { Check, RotateCcw, PenLine } from 'lucide-react';

interface FirmaCanvasProps {
  /** Se llama con base64 PNG cuando el cliente confirma, o null cuando limpia */
  onChange: (base64: string | null) => void;
}

export default function FirmaCanvas({ onChange }: FirmaCanvasProps) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const isDrawing  = useRef(false);
  const hasStrokes = useRef(false);               // true si hay trazos en el canvas

  const [isEmpty,    setIsEmpty]    = useState(true);
  const [confirmed,  setConfirmed]  = useState(false);

  // ── Inicializar canvas (ajusta al DPR del dispositivo) ────────────────────
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr  = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    // Solo reinicializar si las dimensiones reales cambiaron
    const newW = Math.round(rect.width  * dpr);
    const newH = Math.round(rect.height * dpr);
    if (canvas.width === newW && canvas.height === newH) return;

    canvas.width  = newW;
    canvas.height = newH;

    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);

    // Fondo blanco siempre (para que el PNG sea limpio en el PDF)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.strokeStyle = '#0f172a';   // slate-900 — visible sobre blanco
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
  }, []);

  useEffect(() => {
    initCanvas();
    // Re-escalar si el contenedor cambia de tamaño (rotación del teléfono)
    const ro = new ResizeObserver(() => {
      if (!hasStrokes.current) initCanvas();
    });
    if (canvasRef.current) ro.observe(canvasRef.current);
    return () => ro.disconnect();
  }, [initCanvas]);

  // ── Obtener coordenadas relativas al canvas ───────────────────────────────
  const getPoint = (e: PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  // ── Pointer events (funciona con dedo y mouse) ────────────────────────────
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    canvasRef.current!.setPointerCapture(e.pointerId);  // capture para no perder el trazo

    const ctx = canvasRef.current!.getContext('2d')!;
    const { x, y } = getPoint(e.nativeEvent);
    ctx.beginPath();
    ctx.moveTo(x, y);

    isDrawing.current  = true;
    hasStrokes.current = true;
    setIsEmpty(false);
    setConfirmed(false);
    onChange(null);   // invalida la firma anterior hasta que se confirme de nuevo
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current!.getContext('2d')!;
    const { x, y } = getPoint(e.nativeEvent);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const onPointerUp = () => { isDrawing.current = false; };

  // ── Limpiar ───────────────────────────────────────────────────────────────
  const handleClear = () => {
    const canvas = canvasRef.current!;
    const dpr  = window.devicePixelRatio || 1;
    const ctx  = canvas.getContext('2d')!;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    hasStrokes.current = false;
    setIsEmpty(true);
    setConfirmed(false);
    onChange(null);
  };

  // ── Confirmar ─────────────────────────────────────────────────────────────
  const handleConfirm = () => {
    if (isEmpty) return;
    const base64 = canvasRef.current!.toDataURL('image/png');
    setConfirmed(true);
    onChange(base64);
  };

  return (
    <div className="space-y-3">
      {/* Canvas */}
      <div className={`relative rounded-xl overflow-hidden border-2 transition-colors ${
        confirmed
          ? 'border-green-500 dark:border-green-600'
          : isEmpty
          ? 'border-dashed border-slate-300 dark:border-slate-600'
          : 'border-slate-400 dark:border-slate-500'
      }`}>
        <canvas
          ref={canvasRef}
          className="w-full h-44 touch-none bg-white cursor-crosshair block"
          style={{ touchAction: 'none' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          onPointerCancel={onPointerUp}
        />

        {/* Watermark "Firma aquí" */}
        {isEmpty && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-1.5">
            <PenLine size={22} className="text-slate-300" />
            <p className="text-slate-300 text-sm font-medium select-none">
              Firma aquí con el dedo
            </p>
          </div>
        )}

        {/* Badge de confirmado */}
        {confirmed && (
          <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1 shadow">
            <Check size={12} strokeWidth={3} />
          </div>
        )}
      </div>

      {/* Botones */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleClear}
          disabled={isEmpty}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold rounded-xl border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
        >
          <RotateCcw size={14} /> Limpiar
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isEmpty || confirmed}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white transition-colors"
        >
          <Check size={14} /> Confirmar firma
        </button>
      </div>

      {confirmed && (
        <p className="text-center text-xs text-green-600 dark:text-green-400 font-medium">
          ✓ Firma capturada correctamente
        </p>
      )}
    </div>
  );
}
