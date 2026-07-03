import { Brush, Eraser, Trash2 } from "lucide-react";
import type { DrawMode } from "@/lib/game/types";

const COLORS = [
  { label: "Negro", value: "#111827" },
  { label: "Gris", value: "#6b7280" },
  { label: "Rojo", value: "#ef4444" },
  { label: "Naranjo", value: "#f97316" },
  { label: "Azul", value: "#2563eb" },
  { label: "Celeste", value: "#38bdf8" },
  { label: "Verde", value: "#16a34a" },
  { label: "Amarillo", value: "#facc15" },
  { label: "Cafe", value: "#7c4a28" },
  { label: "Rosado", value: "#ec4899" },
  { label: "Morado", value: "#8b5cf6" },
  { label: "Blanco", value: "#ffffff" },
];

const SIZES = [
  { label: "XS", value: 2 },
  { label: "S", value: 5 },
  { label: "M", value: 9 },
  { label: "L", value: 14 },
  { label: "XL", value: 22 },
];

export function Toolbar({
  canDraw,
  color,
  size,
  mode,
  onColorChange,
  onSizeChange,
  onModeChange,
  onClear,
}: {
  canDraw: boolean;
  color: string;
  size: number;
  mode: DrawMode;
  onColorChange: (color: string) => void;
  onSizeChange: (size: number) => void;
  onModeChange: (mode: DrawMode) => void;
  onClear: () => void;
}) {
  if (!canDraw) {
    return null;
  }

  return (
    <div className="rounded-lg border-4 border-gameBorder bg-white/95 p-2 shadow-game">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded border border-slate-300 bg-slate-100 p-1">
          <button
            type="button"
            title="Pincel"
            onClick={() => onModeChange("draw")}
            className={mode === "draw" ? activeToolClass : inactiveToolClass}
          >
            <Brush className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Borrador"
            onClick={() => onModeChange("erase")}
            className={mode === "erase" ? activeToolClass : inactiveToolClass}
          >
            <Eraser className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {COLORS.map((swatch) => (
            <button
              key={swatch.value}
              type="button"
              title={swatch.label}
              onClick={() => onColorChange(swatch.value)}
              className="h-7 w-7 rounded border-2 transition hover:scale-105"
              style={{
                backgroundColor: swatch.value,
                borderColor:
                  color === swatch.value && mode === "draw" ? "#1d4ed8" : "#cbd5e1",
              }}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1 rounded border border-slate-300 bg-slate-100 p-1">
          {SIZES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onSizeChange(option.value)}
              className={
                size === option.value
                  ? "rounded bg-gameOrange px-2.5 py-1 text-xs font-black text-white"
                  : "rounded px-2.5 py-1 text-xs font-black text-slate-700 hover:bg-white"
              }
            >
              {option.label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 rounded border border-slate-300 bg-slate-100 px-2 py-1 text-xs font-black text-slate-700">
          Trazo
          <input
            type="range"
            min={1}
            max={28}
            value={size}
            onChange={(event) => onSizeChange(Number(event.target.value))}
            className="w-24 accent-gameOrange"
            title="Grosor de trazo"
          />
          <span className="w-5 text-right">{size}</span>
        </label>

        <button
          type="button"
          title="Limpiar canvas"
          onClick={onClear}
          className="inline-flex h-8 items-center justify-center gap-2 rounded border border-red-300 bg-red-50 px-3 text-xs font-black text-red-700 transition hover:bg-red-100"
        >
          <Trash2 className="h-4 w-4" />
          Limpiar
        </button>
      </div>
    </div>
  );
}

const activeToolClass =
  "inline-flex h-7 w-7 items-center justify-center rounded bg-gameOrange text-white transition";
const inactiveToolClass =
  "inline-flex h-7 w-7 items-center justify-center rounded text-slate-700 transition hover:bg-white";
