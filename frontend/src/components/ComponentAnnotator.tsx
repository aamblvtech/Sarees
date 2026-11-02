import React, { useState, useRef, useEffect } from 'react';
import { Tag, Save, CheckCircle2, RefreshCw, Sparkles, Layers, AlertCircle } from 'lucide-react';
import { SareeAnnotations, SareeComponentBbox } from '../types';

interface ComponentAnnotatorProps {
  imageUrl: string;
  initialAnnotations?: SareeAnnotations | null;
  onSave: (annotations: any) => Promise<void>;
  readOnly?: boolean;
}

type ComponentKey = 'body' | 'pallu' | 'main_border' | 'secondary_border' | 'motifs' | 'blouse_piece';

const COMPONENT_DEFINITIONS: Record<ComponentKey, { label: string; color: string; desc: string }> = {
  body: { label: 'Saree Body Field', color: '#681D32', desc: 'Main continuous field of fabric' },
  pallu: { label: 'Grand Pallu', color: '#B99A5B', desc: 'Ornamental end piece with zari/motifs' },
  main_border: { label: 'Primary Border (Lower/Korvai)', color: '#D4AF37', desc: 'Broad border along the drape hem' },
  secondary_border: { label: 'Secondary Border (Upper)', color: '#852842', desc: 'Narrower border along the waist' },
  motifs: { label: 'Buttas & Motifs', color: '#3F7A5E', desc: 'Embroidered or woven floral/animal buttas' },
  blouse_piece: { label: 'Blouse Piece', color: '#6B4E71', desc: 'Unstitched running fabric segment' },
};

export const ComponentAnnotator: React.FC<ComponentAnnotatorProps> = ({
  imageUrl,
  initialAnnotations,
  onSave,
  readOnly = false,
}) => {
  const [activeComponent, setActiveComponent] = useState<ComponentKey>('body');
  const [boxes, setBoxes] = useState<Record<ComponentKey, SareeComponentBbox | null>>({
    body: initialAnnotations?.bodyBbox || null,
    pallu: initialAnnotations?.palluBbox || null,
    main_border: initialAnnotations?.mainBorderBbox || null,
    secondary_border: initialAnnotations?.secondaryBorderBbox || null,
    motifs: initialAnnotations?.motifsBbox || null,
    blouse_piece: initialAnnotations?.blousePieceBbox || null,
  });

  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentBox, setCurrentBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (initialAnnotations) {
      setBoxes({
        body: initialAnnotations.bodyBbox || null,
        pallu: initialAnnotations.palluBbox || null,
        main_border: initialAnnotations.mainBorderBbox || null,
        secondary_border: initialAnnotations.secondaryBorderBbox || null,
        motifs: initialAnnotations.motifsBbox || null,
        blouse_piece: initialAnnotations.blousePieceBbox || null,
      });
    }
  }, [initialAnnotations]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (readOnly || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const xPct = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const yPct = Math.round(((e.clientY - rect.top) / rect.height) * 100);

    setIsDrawing(true);
    setStartPoint({ x: xPct, y: yPct });
    setCurrentBox({ x: xPct, y: yPct, width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !startPoint || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const currentX = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const currentY = Math.round(((e.clientY - rect.top) / rect.height) * 100);

    const x = Math.min(startPoint.x, currentX);
    const y = Math.min(startPoint.y, currentY);
    const width = Math.abs(currentX - startPoint.x);
    const height = Math.abs(currentY - startPoint.y);

    setCurrentBox({ x, y, width, height });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentBox || currentBox.width < 3 || currentBox.height < 3) {
      setIsDrawing(false);
      setCurrentBox(null);
      return;
    }

    setBoxes(prev => ({
      ...prev,
      [activeComponent]: {
        ...currentBox,
        label: COMPONENT_DEFINITIONS[activeComponent].label,
      },
    }));

    setIsDrawing(false);
    setCurrentBox(null);
  };

  const handleClearComponent = (key: ComponentKey) => {
    if (readOnly) return;
    setBoxes(prev => ({ ...prev, [key]: null }));
  };

  const handleAutoSuggest = () => {
    // Generates standard folded saree component layout coordinates based on Indian saree textile folding conventions
    setBoxes({
      body: { x: 12, y: 28, width: 45, height: 55, label: COMPONENT_DEFINITIONS.body.label },
      pallu: { x: 58, y: 15, width: 38, height: 70, label: COMPONENT_DEFINITIONS.pallu.label },
      main_border: { x: 10, y: 84, width: 86, height: 14, label: COMPONENT_DEFINITIONS.main_border.label },
      secondary_border: { x: 10, y: 5, width: 86, height: 10, label: COMPONENT_DEFINITIONS.secondary_border.label },
      motifs: { x: 22, y: 38, width: 20, height: 22, label: COMPONENT_DEFINITIONS.motifs.label },
      blouse_piece: { x: 65, y: 80, width: 25, height: 18, label: COMPONENT_DEFINITIONS.blouse_piece.label },
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setSavedSuccess(false);
    try {
      await onSave({
        bodyBbox: boxes.body,
        palluBbox: boxes.pallu,
        mainBorderBbox: boxes.main_border,
        secondaryBorderBbox: boxes.secondary_border,
        motifsBbox: boxes.motifs,
        blousePieceBbox: boxes.blouse_piece,
        detectionMethod: 'ai_assisted',
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e) {
      console.error('Save annotations error', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-[#FAF7F0] border border-[#B99A5B] rounded-2xl p-6 shadow-md space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E2D5] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#681D32]" />
            <h3 className="font-serif text-lg font-bold text-[#681D32]">
              Saree Component Labeling & Registration Suite
            </h3>
          </div>
          <p className="text-xs text-[#292522]/70 mt-1">
            Draw bounding boxes to map Body, Pallu, and Borders on folded saree photography.
          </p>
        </div>

        {!readOnly && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleAutoSuggest}
              className="px-3 py-1.5 border border-[#B99A5B] bg-[#FAF7F0] text-[#681D32] hover:bg-[#B99A5B]/10 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#B99A5B]" />
              <span>AI Auto-Detect</span>
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-1.5 bg-[#681D32] hover:bg-[#852842] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow"
            >
              <Save className="w-3.5 h-3.5 text-[#B99A5B]" />
              <span>{saving ? 'Saving...' : 'Save Component Bounding Boxes'}</span>
            </button>
          </div>
        )}
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>Saree component annotations successfully recorded in PostgreSQL.</span>
        </div>
      )}

      {/* Component Picker Ribbon */}
      {!readOnly && (
        <div className="flex flex-wrap gap-2">
          {(Object.keys(COMPONENT_DEFINITIONS) as ComponentKey[]).map(key => {
            const def = COMPONENT_DEFINITIONS[key];
            const hasBox = Boolean(boxes[key]);
            const isActive = activeComponent === key;

            return (
              <button
                key={key}
                onClick={() => setActiveComponent(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-2 transition-all ${
                  isActive
                    ? 'border-[#681D32] bg-[#681D32] text-white shadow-sm'
                    : 'border-[#E8E2D5] bg-[#FAF7F0] text-[#292522] hover:border-[#B99A5B]'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: def.color }}
                />
                <span>{def.label}</span>
                {hasBox && <span className="text-[10px] opacity-75">✓</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Main Interactive Canvas & Image */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        <div className="lg:col-span-3">
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-[#292522] select-none cursor-crosshair border-2 border-[#B99A5B]/50 shadow-inner"
          >
            <img
              src={imageUrl}
              alt="Folded Saree for Annotation"
              className="w-full h-full object-contain pointer-events-none"
              draggable={false}
            />

            {/* Existing Rendered Bounding Boxes */}
            {(Object.keys(boxes) as ComponentKey[]).map(key => {
              const box = boxes[key];
              if (!box) return null;
              const def = COMPONENT_DEFINITIONS[key];
              const isSelected = activeComponent === key;

              return (
                <div
                  key={key}
                  style={{
                    left: `${box.x}%`,
                    top: `${box.y}%`,
                    width: `${box.width}%`,
                    height: `${box.height}%`,
                    borderColor: def.color,
                  }}
                  className={`absolute border-2 rounded transition-all ${
                    isSelected ? 'ring-2 ring-white ring-offset-1 ring-offset-black/50 z-20' : 'opacity-85 z-10'
                  }`}
                >
                  <div
                    style={{ backgroundColor: def.color }}
                    className="absolute -top-6 left-0 text-[10px] text-white font-bold px-2 py-0.5 rounded shadow whitespace-nowrap"
                  >
                    {def.label}
                  </div>
                </div>
              );
            })}

            {/* Currently Drawing Box */}
            {isDrawing && currentBox && (
              <div
                style={{
                  left: `${currentBox.x}%`,
                  top: `${currentBox.y}%`,
                  width: `${currentBox.width}%`,
                  height: `${currentBox.height}%`,
                  borderColor: COMPONENT_DEFINITIONS[activeComponent].color,
                }}
                className="absolute border-2 border-dashed bg-white/10 rounded pointer-events-none z-30"
              />
            )}
          </div>
        </div>

        {/* Legend & Details Column */}
        <div className="space-y-3 bg-[#F2EDE2]/70 p-4 rounded-xl border border-[#E8E2D5] text-xs">
          <div className="font-semibold text-sm text-[#681D32] border-b border-[#E8E2D5] pb-2">
            Component Schema
          </div>

          {(Object.keys(COMPONENT_DEFINITIONS) as ComponentKey[]).map(key => {
            const def = COMPONENT_DEFINITIONS[key];
            const box = boxes[key];

            return (
              <div key={key} className="p-2 bg-[#FAF7F0] rounded border border-[#E8E2D5]">
                <div className="flex items-center justify-between font-medium">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: def.color }} />
                    <span className="text-[#292522]">{def.label}</span>
                  </div>
                  {box ? (
                    <button
                      onClick={() => handleClearComponent(key)}
                      className="text-[10px] text-red-600 hover:underline"
                    >
                      Clear
                    </button>
                  ) : (
                    <span className="text-[10px] text-gray-400">Unset</span>
                  )}
                </div>
                <div className="text-[10px] text-[#292522]/65 mt-0.5">{def.desc}</div>
                {box && (
                  <div className="text-[9px] font-mono text-[#B99A5B] mt-1">
                    x:{box.x}% y:{box.y}% w:{box.width}% h:{box.height}%
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
