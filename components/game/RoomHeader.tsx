import { Crown, Eye, EyeOff, LogOut, RotateCcw } from "lucide-react";
import type { ClientRoomState, Player } from "@/lib/game/types";
import { Timer } from "./Timer";

export function RoomHeader({
  room,
  self,
  connectionLabel,
  onLeaveRoom,
  onNextRound,
}: {
  room: ClientRoomState;
  self: Player | null;
  connectionLabel: string;
  onLeaveRoom: () => void;
  onNextRound: () => void;
}) {
  const drawer = room.players.find((player) => player.id === room.currentRound.drawerId);
  const isHost = Boolean(self && room.hostId === self.id);
  const isDrawer = Boolean(self && drawer?.id === self.id);
  const visibleWord = room.currentRound.word?.word;
  const revealedWord = room.currentRound.revealedWord;

  return (
    <header className="rounded-2xl border border-gameBorder bg-panel shadow-game">
      <div className="rounded-t-2xl bg-gameBlue px-4 py-3 text-white">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 text-sm font-black">
            <span>Sala {room.code}</span>
            <span className="rounded-full bg-white/20 px-2 py-1 text-xs">{connectionLabel}</span>
            {isHost ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-gameYellow px-2 py-1 text-xs text-slate-900">
                <Crown className="h-3.5 w-3.5" />
                Host
              </span>
            ) : null}
          </div>
          <div className="flex gap-2">
            {isHost ? (
              <button type="button" onClick={onNextRound} className={headerButtonClass}>
                <RotateCcw className="h-4 w-4" />
                Saltar
              </button>
            ) : null}
            <button type="button" onClick={onLeaveRoom} className={headerButtonClass}>
              <LogOut className="h-4 w-4" />
              Salir
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_260px_210px] lg:items-center">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-500">
            Ronda {room.currentRound.number || 1} - Turno {room.currentRound.turnIndex + 1 || 1}/
            {Math.max(room.turnOrder.length, 1)}
          </p>
          <h1 className="mt-1 truncate text-2xl font-black text-slate-950 md:text-3xl">
            {isDrawer
              ? "Te toca dibujar"
              : drawer
                ? `${drawer.nickname} esta dibujando`
                : "Esperando dibujante"}
          </h1>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-slate-600">
            {visibleWord ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            {visibleWord ? "Tu palabra" : revealedWord ? "La palabra era" : "Adivina la palabra"}
          </div>
          <div className="break-words font-mono text-2xl font-black tracking-[0.12em] text-slate-950">
            {visibleWord ?? revealedWord ?? room.hint ?? "Esperando..."}
          </div>
        </div>

        <Timer seconds={room.timeRemaining} />
      </div>
    </header>
  );
}

const headerButtonClass =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-white/15 px-3 text-sm font-black text-white transition hover:bg-white/25";
