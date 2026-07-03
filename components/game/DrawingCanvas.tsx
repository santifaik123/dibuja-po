"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import type { Socket } from "socket.io-client";
import type {
  ClientRoomState,
  DrawEvent,
  DrawMode,
  DrawPoint,
  Player,
  WordEntry,
} from "@/lib/game/types";
import { getSocket } from "@/lib/socket";
import { Toolbar } from "./Toolbar";

export function DrawingCanvas({
  room,
  self,
  onChooseWord,
}: {
  room: ClientRoomState;
  self: Player | null;
  onChooseWord: (word: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastRemotePointsRef = useRef(new Map<string, DrawPoint>());
  const lastLocalPointRef = useRef<DrawPoint | null>(null);
  const isDrawingRef = useRef(false);
  const queuedMoveRef = useRef<DrawPoint | null>(null);
  const rafRef = useRef<number | null>(null);
  const [color, setColor] = useState("#111827");
  const [size, setSize] = useState(8);
  const [mode, setMode] = useState<DrawMode>("draw");
  const [hasVisibleDrawing, setHasVisibleDrawing] = useState(false);
  const socket = useMemo(() => getSocket(), []);
  const canDraw =
    Boolean(self && room.currentRound.drawerId === self.id) &&
    room.currentRound.status === "drawing";
  const isChoosing = room.currentRound.status === "choosing";
  const isChoosingDrawer = Boolean(self && room.currentRound.drawerId === self.id) && isChoosing;
  const drawer = room.players.find((player) => player.id === room.currentRound.drawerId);
  const showCenterHint = room.currentRound.status === "drawing" && !hasVisibleDrawing;

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const target = canvas;

    function resize() {
      resizeCanvas(target);
      replayEvents(target, room.drawEvents, lastRemotePointsRef.current);
    }

    resize();
    setHasVisibleDrawing(room.drawEvents.some((event) => event.type !== "end"));
    const observer = new ResizeObserver(resize);
    observer.observe(target);

    return () => observer.disconnect();
  }, [room.currentRound.id, room.drawEvents]);

  useEffect(() => {
    function handleDrawEvent(event: DrawEvent) {
      if (event.fromPlayerId === self?.id) {
        return;
      }

      const canvas = canvasRef.current;

      if (!canvas) {
        return;
      }

      if (event.type !== "end") {
        setHasVisibleDrawing(true);
      }

      applyDrawEvent(canvas, event, lastRemotePointsRef.current);
    }

    function handleCanvasCleared() {
      const canvas = canvasRef.current;

      if (canvas) {
        clearCanvas(canvas);
      }

      lastRemotePointsRef.current.clear();
      lastLocalPointRef.current = null;
      setHasVisibleDrawing(false);
    }

    socket.on("draw_event", handleDrawEvent);
    socket.on("canvas_cleared", handleCanvasCleared);

    return () => {
      socket.off("draw_event", handleDrawEvent);
      socket.off("canvas_cleared", handleCanvasCleared);
    };
  }, [self?.id, socket]);

  useEffect(() => {
    if (!canDraw) {
      isDrawingRef.current = false;
      lastLocalPointRef.current = null;
    }
  }, [canDraw]);

  function pointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!canDraw) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointFromPointer(event);
    isDrawingRef.current = true;
    lastLocalPointRef.current = point;
    setHasVisibleDrawing(true);
    drawDot(event.currentTarget, point, color, size, mode);
    emitDraw(socket, "draw_start", point, color, size, mode);
  }

  function pointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!canDraw || !isDrawingRef.current) {
      return;
    }

    const point = pointFromPointer(event);
    const previous = lastLocalPointRef.current ?? point;

    drawLine(event.currentTarget, previous, point, color, size, mode);
    lastLocalPointRef.current = point;
    queuedMoveRef.current = point;

    if (rafRef.current === null) {
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        const queued = queuedMoveRef.current;
        queuedMoveRef.current = null;

        if (queued) {
          emitDraw(socket, "draw_move", queued, color, size, mode);
        }
      });
    }
  }

  function pointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) {
      return;
    }

    isDrawingRef.current = false;
    lastLocalPointRef.current = null;
    queuedMoveRef.current = null;
    emitDraw(socket, "draw_end", undefined, color, size, mode);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function clearForEveryone() {
    socket.emit("clear_canvas", {}, () => undefined);
  }

  return (
    <section className="min-h-[320px] bg-gameCanvas lg:min-h-0 lg:flex-1">
      <div className="relative h-auto overflow-hidden border-t-[6px] border-gameBorder bg-gameCanvas lg:h-full">
        <canvas
          ref={canvasRef}
          className={
            canDraw
              ? "canvas-checker block aspect-[4/3] w-full touch-none cursor-crosshair lg:h-full lg:aspect-auto"
              : "canvas-checker block aspect-[4/3] w-full touch-none lg:h-full lg:aspect-auto"
          }
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerCancel={pointerUp}
        />
        {showCenterHint ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-4 text-[2rem] font-black uppercase text-[#333] drop-shadow-[2px_2px_0_rgba(255,255,255,0.65)] sm:text-[2.6rem]">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-md">
                <Pencil className="h-10 w-10 -rotate-12 text-gameYellow drop-shadow-[1px_1px_0_#333]" />
              </span>
              <span className="max-w-[420px] truncate">
                {canDraw ? "Tu turno" : drawer?.nickname ?? "Esperando"}
              </span>
            </div>
          </div>
        ) : null}
        {isChoosing ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/55 p-4">
            {isChoosingDrawer ? (
              <WordChooser choices={room.currentRound.wordChoices} onChooseWord={onChooseWord} />
            ) : (
              <div className="rounded-lg border-4 border-gameBorder bg-gameCream px-5 py-4 text-center shadow-game">
                <div className="text-xl font-black uppercase text-[#5c5c1f]">
                  {drawer?.nickname ?? "El dibujante"} esta eligiendo
                </div>
                <div className="mt-1 text-sm font-bold text-slate-600">
                  La pista censurada aparece al empezar el dibujo.
                </div>
              </div>
            )}
          </div>
        ) : null}
        {room.currentRound.status !== "drawing" && !isChoosing ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/25">
            <div className="rounded-lg bg-gameCream px-5 py-3 text-xl font-black uppercase text-[#5c5c1f] shadow-game">
              Siguiente ronda...
            </div>
          </div>
        ) : null}
        {canDraw ? (
          <div className="border-t-[6px] border-gameBorder bg-gameCanvas p-2 lg:absolute lg:bottom-3 lg:left-3 lg:right-3 lg:z-10 lg:border-0 lg:bg-transparent lg:p-0">
            <Toolbar
              canDraw={canDraw}
              color={color}
              size={size}
              mode={mode}
              onColorChange={setColor}
              onSizeChange={setSize}
              onModeChange={setMode}
              onClear={clearForEveryone}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}

function WordChooser({
  choices,
  onChooseWord,
}: {
  choices: WordEntry[];
  onChooseWord: (word: string) => void;
}) {
  if (choices.length === 0) {
    return (
      <div className="rounded-lg border-4 border-gameBorder bg-white px-5 py-4 text-center text-sm font-black text-slate-700 shadow-game">
        Cargando palabras...
      </div>
    );
  }

  return (
    <div className="w-full max-w-[520px] rounded-lg border-4 border-gameBorder bg-white p-4 shadow-game">
      <div className="text-center">
        <h2 className="text-2xl font-black uppercase text-gameOrange">Elige palabra</h2>
        <p className="mt-1 text-sm font-bold text-slate-600">
          Los demas veran solo el largo censurado.
        </p>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {choices.map((choice) => (
          <button
            key={choice.word}
            type="button"
            onClick={() => onChooseWord(choice.word)}
            className="rounded-lg border-4 border-gameBorder bg-gameCream px-3 py-4 text-center transition hover:-translate-y-0.5 hover:bg-gameYellow"
          >
            <span className="block truncate text-xl font-black uppercase text-[#333]">
              {choice.word}
            </span>
            <span className="mt-1 block text-xs font-black uppercase text-[#5c5c1f]">
              {choice.word.length} letras
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function resizeCanvas(canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  const context = canvas.getContext("2d");

  if (context) {
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.lineCap = "round";
    context.lineJoin = "round";
  }
}

function replayEvents(
  canvas: HTMLCanvasElement,
  events: DrawEvent[],
  remotePoints: Map<string, DrawPoint>,
) {
  clearCanvas(canvas);
  remotePoints.clear();

  for (const event of events) {
    applyDrawEvent(canvas, event, remotePoints);
  }
}

function clearCanvas(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();

  if (!context) {
    return;
  }

  context.save();
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.restore();
  context.clearRect(0, 0, rect.width, rect.height);
}

function applyDrawEvent(
  canvas: HTMLCanvasElement,
  event: DrawEvent,
  remotePoints: Map<string, DrawPoint>,
) {
  if (event.type === "end") {
    remotePoints.delete(event.fromPlayerId);
    return;
  }

  if (!event.point) {
    return;
  }

  if (event.type === "start") {
    remotePoints.set(event.fromPlayerId, event.point);
    drawDot(canvas, event.point, event.color, event.size, event.mode);
    return;
  }

  const previous = remotePoints.get(event.fromPlayerId) ?? event.point;
  drawLine(canvas, previous, event.point, event.color, event.size, event.mode);
  remotePoints.set(event.fromPlayerId, event.point);
}

function drawDot(
  canvas: HTMLCanvasElement,
  point: DrawPoint,
  color: string,
  size: number,
  mode: DrawMode,
) {
  const context = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();

  if (!context) {
    return;
  }

  context.save();
  context.globalCompositeOperation = mode === "erase" ? "destination-out" : "source-over";
  context.fillStyle = color;
  context.beginPath();
  context.arc(point.x * rect.width, point.y * rect.height, size / 2, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawLine(
  canvas: HTMLCanvasElement,
  from: DrawPoint,
  to: DrawPoint,
  color: string,
  size: number,
  mode: DrawMode,
) {
  const context = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();

  if (!context) {
    return;
  }

  context.save();
  context.globalCompositeOperation = mode === "erase" ? "destination-out" : "source-over";
  context.strokeStyle = color;
  context.lineWidth = size;
  context.beginPath();
  context.moveTo(from.x * rect.width, from.y * rect.height);
  context.lineTo(to.x * rect.width, to.y * rect.height);
  context.stroke();
  context.restore();
}

function pointFromPointer(event: React.PointerEvent<HTMLCanvasElement>): DrawPoint {
  const rect = event.currentTarget.getBoundingClientRect();

  return {
    x: clamp((event.clientX - rect.left) / rect.width),
    y: clamp((event.clientY - rect.top) / rect.height),
  };
}

function emitDraw(
  socket: Socket,
  eventName: "draw_start" | "draw_move" | "draw_end",
  point: DrawPoint | undefined,
  color: string,
  size: number,
  mode: DrawMode,
) {
  socket.emit(
    eventName,
    {
      x: point?.x,
      y: point?.y,
      color,
      size,
      mode,
    },
    () => undefined,
  );
}

function clamp(value: number) {
  if (Number.isNaN(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
}
