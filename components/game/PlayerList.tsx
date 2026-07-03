import { Crown, Pencil, Wifi, WifiOff } from "lucide-react";
import type { ClientRoomState, Player } from "@/lib/game/types";

export function PlayerList({
  players,
  hostId,
  drawerId,
  compact = false,
}: {
  players: Player[];
  hostId: string | null;
  drawerId?: string | null;
  compact?: boolean;
}) {
  if (players.length === 0) {
    return (
      <div className="rounded border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-bold text-slate-500">
        Todavia no hay jugadores.
      </div>
    );
  }

  return (
    <ul className={compact ? "grid gap-2 sm:grid-cols-2" : "space-y-2"}>
      {players.map((player) => {
        const isDrawer = player.id === drawerId;

        return (
          <li
            key={player.id}
            className="flex min-h-12 items-center justify-between gap-3 rounded border border-slate-200 bg-white px-3 py-2"
          >
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate font-black text-slate-900">{player.nickname}</span>
                {player.id === hostId ? (
                  <Crown className="h-4 w-4 shrink-0 text-amber-500" aria-label="Host" />
                ) : null}
                {isDrawer ? (
                  <Pencil className="h-4 w-4 shrink-0 text-gameBlue" aria-label="Dibujando" />
                ) : null}
              </div>
              <div className="mt-0.5 text-xs font-semibold text-slate-500">
                {isDrawer
                  ? "dibujando"
                  : player.hasGuessedCurrentRound
                    ? "adivino"
                    : `${player.score} puntos`}
              </div>
            </div>
            {player.isConnected ? (
              <Wifi className="h-4 w-4 shrink-0 text-gameGreen" />
            ) : (
              <WifiOff className="h-4 w-4 shrink-0 text-slate-400" />
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function connectedCount(room: ClientRoomState): number {
  return room.players.filter((player) => player.isConnected).length;
}
