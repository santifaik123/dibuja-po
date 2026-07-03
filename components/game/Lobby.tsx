import { Check, Clipboard, LogOut, Play, Users } from "lucide-react";
import { useState } from "react";
import type { ClientRoomState, Player } from "@/lib/game/types";
import { ClassicTopBar } from "./ClassicTopBar";
import { PlayerList, connectedCount } from "./PlayerList";

export function Lobby({
  room,
  self,
  connectionLabel,
  error,
  onStartGame,
  onLeaveRoom,
}: {
  room: ClientRoomState;
  self: Player | null;
  connectionLabel: string;
  error: string;
  onStartGame: () => void;
  onLeaveRoom: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const isHost = Boolean(self && room.hostId === self.id);
  const playersReady = connectedCount(room) >= 2;

  async function copyCode() {
    await navigator.clipboard.writeText(room.code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <main className="min-h-screen bg-gameBg text-ink">
      <ClassicTopBar
        left={
        <button
          type="button"
          onClick={onLeaveRoom}
          className="inline-flex h-14 w-14 items-center justify-center rounded-lg border-4 border-[#454545] bg-[#5a5a5a] text-white transition hover:bg-[#666]"
          title="Salir"
        >
          <LogOut className="h-7 w-7" />
        </button>
        }
        right={
        <span className="hidden text-xs font-black uppercase text-white/80 md:block">
          {connectionLabel}
        </span>
        }
      />

      <section className="mx-auto w-full max-w-5xl px-4 py-5">
        <header className="classic-panel mb-4 overflow-hidden bg-panel">
          <div className="bg-gameRed px-5 py-4 text-white">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-white/80">Lobby</p>
            <h1 className="text-3xl font-black uppercase">Mesa {room.code}</h1>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <section className="classic-panel bg-panel p-4 sm:p-6">
            <div className="rounded-lg border-4 border-gameBorder bg-gameCream p-4">
              <p className="text-sm font-black text-[#5c5c1f]">
                Copia este codigo y mandaselo a tus amigos.
              </p>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="rounded-lg border-4 border-gameBorder bg-white px-5 py-4 text-center font-mono text-4xl font-black tracking-[0.18em] text-[#333] sm:text-left">
                  {room.code}
                </div>
                <button type="button" onClick={copyCode} className={primaryButtonClass}>
                  {copied ? <Check className="h-5 w-5" /> : <Clipboard className="h-5 w-5" />}
                  {copied ? "Copiado" : "Copiar codigo"}
                </button>
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-base font-black text-slate-900">
                  <Users className="h-5 w-5 text-gameOrange" />
                  Jugadores
                </h2>
                <span className="rounded-full bg-gameCream px-3 py-1 text-xs font-black text-[#5c5c1f]">
                  {connectedCount(room)} conectados
                </span>
              </div>
              <PlayerList players={room.players} hostId={room.hostId} compact />
            </div>
          </section>

          <aside className="classic-panel bg-panel p-4 sm:p-5">
            <div className="rounded-lg border-4 border-gameBorder bg-slate-50 p-4">
              <p className="text-sm font-black text-slate-500">Minimo 2 jugadores para empezar.</p>
              <h2 className="mt-2 text-2xl font-black text-slate-900">
                {playersReady ? "Listos para empezar" : "Esperando mas jugadores..."}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {isHost
                  ? "Eres host. Inicia cuando todos esten listos."
                  : "El host inicia la partida."}
              </p>
            </div>

            <button
              type="button"
              onClick={onStartGame}
              disabled={!isHost || !playersReady}
              className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-gameRed px-5 py-3 text-base font-black text-white shadow-[0_4px_0_#9b2529] transition hover:bg-gameRedDark disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
            >
              <Play className="h-5 w-5" />
              {isHost ? "Iniciar partida" : "Esperando al host"}
            </button>

            {error ? (
              <div className="mt-4 rounded-lg border-4 border-[#9b2b2b] bg-[#fff0f0] px-4 py-3 text-sm font-black text-[#b92b30]">
                {error}
              </div>
            ) : null}
          </aside>
        </div>
      </section>
    </main>
  );
}

const primaryButtonClass =
  "inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-gameOrange px-5 text-base font-black text-white shadow-[0_4px_0_#b3471f] transition hover:bg-[#d6551f]";
