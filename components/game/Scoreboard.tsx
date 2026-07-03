import { Pencil } from "lucide-react";
import type { Player } from "@/lib/game/types";

export function Scoreboard({
  players,
  drawerId,
}: {
  players: Player[];
  drawerId?: string | null;
}) {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score || a.joinedAt - b.joinedAt);

  return (
    <section className="classic-panel min-h-[220px] overflow-hidden bg-panel lg:h-[calc(100vh-125px)] lg:max-h-[720px]">
      {sortedPlayers.length === 0 ? (
        <div className="m-3 rounded border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-bold text-slate-500">
          El ranking aparece cuando entren jugadores.
        </div>
      ) : (
        <ol>
          {sortedPlayers.map((player, index) => (
            <li
              key={player.id}
              className="grid min-h-[66px] grid-cols-[34px_minmax(0,1fr)_22px] items-center border-b border-[#d8d8d8] px-2"
            >
              <span
                className={
                  index === 2
                    ? "text-[3rem] font-black leading-none text-gameRed"
                    : "text-[3rem] font-black leading-none text-[#d7d7d7]"
                }
              >
                {index + 1}
              </span>
              <div className="min-w-0">
                <div className="text-base font-black leading-4 text-[#333]">{player.score}</div>
                <div
                  className={
                    index === 2
                      ? "truncate text-xl font-black leading-6 text-gameRed"
                      : "truncate text-xl font-black leading-6 text-[#666]"
                  }
                >
                  {player.nickname}
                </div>
              </div>
              {player.id === drawerId ? (
                <Pencil className="h-9 w-9 -rotate-12 text-gameYellow drop-shadow-[1px_1px_0_#333]" />
              ) : player.isConnected ? (
                <span className="h-4 w-4 rounded-full bg-gameGreen" title="Conectado" />
              ) : (
                <span className="h-4 w-4 rounded-full bg-slate-300" title="Desconectado" />
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
