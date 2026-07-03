"use client";

import { Loader2, LogIn, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { MAX_NICKNAME_LENGTH, normalizeRoomCode } from "@/lib/game/security";
import type { SocketAck } from "@/lib/game/types";
import { getSocket } from "@/lib/socket";
import { ClassicTopBar } from "./ClassicTopBar";

const SESSION_KEY = "dibuja-po-session";

export function HomeScreen() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");
  const [loadingAction, setLoadingAction] = useState<"create" | "join" | null>(null);

  async function createRoom() {
    setError("");
    setLoadingAction("create");

    try {
      const socket = getConnectedSocket();
      const response = await emitWithAck<{ code: string; playerId: string; nickname: string }>(
        socket,
        "create_room",
        { nickname },
      );

      if (!response.ok || !response.data) {
        throw new Error(response.error ?? "No se pudo crear la sala.");
      }

      saveSession(response.data.code, response.data.nickname, response.data.playerId);
      router.push(`/room/${response.data.code}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo crear la sala.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function joinRoom() {
    setError("");
    setLoadingAction("join");

    try {
      const code = normalizeRoomCode(roomCode);
      const socket = getConnectedSocket();
      const response = await emitWithAck<{ code: string; playerId: string; nickname: string }>(
        socket,
        "join_room",
        { code, nickname },
      );

      if (!response.ok || !response.data) {
        throw new Error(response.error ?? "No se pudo entrar a la sala.");
      }

      saveSession(response.data.code, response.data.nickname, response.data.playerId);
      router.push(`/room/${response.data.code}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo entrar a la sala.");
    } finally {
      setLoadingAction(null);
    }
  }

  const isBusy = loadingAction !== null;

  return (
    <main className="min-h-screen bg-gameBg text-ink">
      <ClassicTopBar />

      <section className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-3xl items-center px-4 py-6">
        <div className="classic-panel w-full overflow-hidden bg-panel">
          <div className="bg-gameRed px-5 py-4 text-center text-white">
            <h1 className="text-3xl font-black uppercase">Crear mesa</h1>
            <p className="mx-auto mt-1 max-w-md text-sm font-bold text-white/90">
              Dibuja y adivina palabras chilenas con tus amigos.
            </p>
          </div>

          <div className="grid gap-6 p-5 md:grid-cols-[1fr_auto_1fr] md:items-start sm:p-7">
            <div className="space-y-4">
              <GameInputLabel label="Tu nickname">
                <input
                  value={nickname}
                  onChange={(event) =>
                    setNickname(event.target.value.slice(0, MAX_NICKNAME_LENGTH))
                  }
                  maxLength={MAX_NICKNAME_LENGTH}
                  placeholder="Ej: Nico"
                  className={inputClass}
                  disabled={isBusy}
                />
              </GameInputLabel>

              <button
                type="button"
                onClick={createRoom}
                disabled={isBusy}
                className={primaryButtonClass}
              >
                {loadingAction === "create" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Plus className="h-5 w-5" />
                )}
                Crear sala
              </button>
            </div>

            <div className="flex items-center justify-center md:h-full">
              <span className="rounded-full border-4 border-gameBorder bg-gameCream px-4 py-1 text-sm font-black text-[#5c5c1f]">
                o
              </span>
            </div>

            <div className="space-y-4">
              <GameInputLabel label="Codigo de sala">
                <input
                  value={roomCode}
                  onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
                  placeholder="CL-4821"
                  className={`${inputClass} font-black uppercase tracking-[0.16em]`}
                  disabled={isBusy}
                />
              </GameInputLabel>

              <button
                type="button"
                onClick={joinRoom}
                disabled={isBusy}
                className={secondaryButtonClass}
              >
                {loadingAction === "join" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <LogIn className="h-5 w-5" />
                )}
                Unirse
              </button>
            </div>
          </div>

          <div className="px-5 pb-5 sm:px-7 sm:pb-7">
            {error ? (
              <div className="rounded-lg border-4 border-[#9b2b2b] bg-[#fff0f0] px-4 py-3 text-sm font-black text-[#b92b30]">
                {error}
              </div>
            ) : null}

            <ol className="mt-5 grid gap-3 text-sm font-black text-slate-700 sm:grid-cols-3">
              {["Crea una mesa", "Comparte el codigo", "Dibuja y adivina"].map((step, index) => (
                <li key={step} className="flex items-center gap-3 rounded border border-slate-200 bg-slate-50 p-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gameYellow text-sm font-black text-slate-900">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
    </main>
  );
}

function GameInputLabel({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-black text-slate-700">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

const inputClass =
  "h-12 w-full rounded border-2 border-[#cfc77b] bg-gameCream px-4 text-base font-bold text-slate-900 outline-none transition focus:border-gameOrange disabled:bg-slate-100";

const primaryButtonClass =
  "flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-gameRed px-5 text-base font-black text-white shadow-[0_4px_0_#9b2529] transition hover:bg-gameRedDark disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none";

const secondaryButtonClass =
  "flex h-12 w-full items-center justify-center gap-2 rounded-lg border-4 border-gameBorder bg-white px-5 text-base font-black text-[#5c5c1f] transition hover:bg-gameCream disabled:border-slate-300 disabled:text-slate-400";

function getConnectedSocket() {
  const socket = getSocket();

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
}

function emitWithAck<T>(socket: ReturnType<typeof getSocket>, event: string, payload: unknown) {
  return new Promise<SocketAck<T>>((resolve) => {
    socket.emit(event, payload, (response: SocketAck<T>) => resolve(response));
  });
}

function saveSession(code: string, nickname: string, playerId: string) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify({ code, nickname, playerId }));
}
