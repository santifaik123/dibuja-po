import type { ClientRoomState, Player } from "@/lib/game/types";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { ChatPanel } from "./ChatPanel";
import { ClassicTopBar } from "./ClassicTopBar";
import { DrawingCanvas } from "./DrawingCanvas";
import { Scoreboard } from "./Scoreboard";
import { Timer } from "./Timer";

export function GameRoom({
  room,
  self,
  connectionLabel,
  error,
  onLeaveRoom,
  onNextRound,
  onSendChatMessage,
}: {
  room: ClientRoomState;
  self: Player | null;
  connectionLabel: string;
  error: string;
  onLeaveRoom: () => void;
  onNextRound: () => void;
  onSendChatMessage: (message: string) => void;
}) {
  const isDrawer = Boolean(self && room.currentRound.drawerId === self.id);
  const isHost = Boolean(self && room.hostId === self.id);
  const drawer = room.players.find((player) => player.id === room.currentRound.drawerId);
  const visibleWord = room.currentRound.word?.word;
  const revealedWord = room.currentRound.revealedWord;
  const roomNumber = room.code.replace(/^CL-/, "");
  const promptLabel = isDrawer
    ? visibleWord
    : revealedWord
      ? revealedWord
      : room.hint || "?";

  return (
    <main className="min-h-screen overflow-x-hidden bg-gameBg text-ink">
      <ClassicTopBar
        left={
        <button
          type="button"
          onClick={onLeaveRoom}
          className="inline-flex h-14 w-14 items-center justify-center rounded-lg border-4 border-[#454545] bg-[#5a5a5a] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] transition hover:bg-[#666]"
          title="Salir de la sala"
        >
          <ArrowLeft className="h-9 w-9 stroke-[4]" />
        </button>
        }
        right={
        <div className="hidden items-center gap-2 text-xs font-black uppercase text-white/80 md:flex">
          <span>{connectionLabel}</span>
          {isHost ? (
            <button
              type="button"
              onClick={onNextRound}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-white/15 px-3 text-white transition hover:bg-white/25"
            >
              <RotateCcw className="h-4 w-4" />
              Saltar
            </button>
          ) : null}
        </div>
        }
      />

      <div className="mx-auto w-full max-w-[1325px] px-3 pb-2 pt-1 lg:mx-0 lg:ml-[calc(8vw-12px)]">
        {error ? (
          <div className="mb-2 rounded-lg border-4 border-[#9b2b2b] bg-[#fff0f0] px-4 py-2 text-sm font-black text-[#b92b30] shadow-game">
            {error}
          </div>
        ) : null}

        <RoundFeedback room={room} />

        <div className="grid min-h-0 gap-2 lg:grid-cols-[190px_minmax(0,645px)_450px] lg:items-start">
          <Scoreboard players={room.players} drawerId={room.currentRound.drawerId} />

          <section className="classic-panel flex flex-col overflow-hidden bg-gameCanvas lg:h-[calc(100vh-125px)] lg:max-h-[720px]">
            <div className="relative min-h-[88px] shrink-0 bg-gameRed text-[#303030]">
              <div className="absolute left-4 top-3 z-10">
                <Timer seconds={room.timeRemaining} />
              </div>
              <div className="grid min-h-[88px] grid-cols-[88px_minmax(0,1fr)] items-start gap-2 px-3 py-3 text-center sm:grid-cols-[110px_1fr_1fr] sm:px-4">
                <div aria-hidden="true" />
                <div>
                  <div className="truncate text-xl font-black uppercase sm:text-2xl">
                    Mesa N&deg; {roomNumber}
                  </div>
                  <div className="mt-1 text-[10px] font-black uppercase text-white/85 sm:hidden">
                    Ronda {room.currentRound.number || 1}
                  </div>
                  <div className="mx-auto mt-1 h-11 max-w-[250px] rounded-t-2xl bg-gameRedDark text-4xl font-black leading-10 text-gameYellow sm:mt-2">
                    {promptLabel ? "?" : ""}
                  </div>
                </div>
                <div className="hidden sm:block">
                  <div className="truncate text-2xl font-black uppercase">
                    Ronda {room.currentRound.number || 1}
                  </div>
                  <div className="mt-2 text-xs font-black uppercase text-white/85">
                    {isDrawer
                      ? `Palabra: ${visibleWord ?? ""}`
                      : drawer
                        ? `${drawer.nickname} dibuja`
                        : "Esperando dibujante"}
                  </div>
                </div>
              </div>
            </div>
            <DrawingCanvas room={room} self={self} />
          </section>

          <ChatPanel
            messages={room.chatMessages}
            self={self}
            disabled={!self?.isConnected}
            isDrawer={isDrawer}
            drawerName={drawer?.nickname ?? null}
            onSendMessage={onSendChatMessage}
          />
        </div>

        <footer className="mt-4 hidden justify-center gap-4 text-xs font-bold uppercase text-white md:flex">
          <span>Sobre el juego</span>
          <span>|</span>
          <span>Condiciones</span>
          <span>|</span>
          <span>Privacidad</span>
        </footer>
      </div>
    </main>
  );
}

function RoundFeedback({ room }: { room: ClientRoomState }) {
  const status = room.currentRound.status;
  const lastCorrect = [...room.chatMessages].reverse().find((message) => message.kind === "correct");

  if (status === "drawing") {
    return null;
  }

  const copy =
    status === "guessed"
      ? `${lastCorrect?.nickname ?? "Alguien"} adivino. Siguiente ronda...`
      : status === "timeout"
        ? `La palabra era: ${room.currentRound.revealedWord ?? ""}. Siguiente ronda...`
        : status === "drawer_left"
          ? "El dibujante se desconecto. Siguiente ronda..."
          : status === "skipped"
            ? "Ronda saltada. Siguiente ronda..."
            : "Siguiente ronda...";

  return (
    <div className="mb-2 rounded-lg border-4 border-gameBorder bg-gameCream px-4 py-2 text-sm font-black text-[#5c5c1f] shadow-game">
      {copy}
    </div>
  );
}
