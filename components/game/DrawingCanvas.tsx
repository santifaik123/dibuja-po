"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import type { Socket } from "socket.io-client";
import type { ClientRoomState, DrawEvent, DrawMode, DrawPoint, Player } from "@/lib/game/types";
import { getSocket } from "@/lib/socket";
import { Toolbar } from "./Toolbar";

export function DrawingCanvas({ room, self }: { room: ClientRoomState; self: Player | null }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastRemotePointsRef = useRef(new Map<string, DrawPoint>());
  const lastLocalPointRef = useRef<DrawPoint | null>(null);
  const isDrawingRef = useRef(false);
  const queuedMoveRef = useRef<DrawPoint | null>(null);
  const rafRef = useRef<number | null>(null);
  const [color, setColor] = useState("#111827");
  const [size, setSize] = useState(8);
  const [mode, setMode] = useState<DrawMode>("draw");
  const socket = useMemo(() => getSocket(), []);
  const canDraw =
    Boolean(self && room.currentRound.drawerId === self.id) &&
    room.currentRound.status === "drawing";
  const drawer = room.players.find((player) => player.id === room.currentRound.drawerId);
  const showCenterHint = room.currentRound.status === "drawing" && room.drawEvents.length === 0;

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

      applyDrawEvent(canvas, event, lastRemotePointsRef.current);
    }

    function handleCanvasCleared() {
      const canvas = canvasRef.current;

      if (canvas) {
        clearCanvas(canvas);
      }

      lastRemotePointsRef.current.clear();
      lastLocalPointRef.current = null;
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
        {room.currentRound.status !== "drawing" ? (
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
