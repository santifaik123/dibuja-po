"use client";

import { Loader2, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MAX_NICKNAME_LENGTH, normalizeRoomCode } from "@/lib/game/security";
import type { ClientRoomState, SocketAck } from "@/lib/game/types";
import { getSocket } from "@/lib/socket";
import { ClassicTopBar } from "./ClassicTopBar";
import { GameRoom } from "./GameRoom";
import { Lobby } from "./Lobby";
import { useGameSounds } from "./useGameSounds";

const SESSION_KEY = "dibuja-po-session";

interface StoredSession {
  code: string;
  nickname: string;
  playerId: string;
}

export function RoomClient({ roomCode }: { roomCode: string }) {
  const router = useRouter();
  const normalizedCode = useMemo(() => normalizeRoomCode(roomCode), [roomCode]);
  const [room, setRoom] = useState<ClientRoomState | null>(null);
  const [nickname, setNickname] = useState("");
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [connectionLabel, setConnectionLabel] = useState("Conectando...");
  const [joining, setJoining] = useState(false);
  useGameSounds(room);

  const joinRoom = useCallback(
    async (nicknameValue: string, existingPlayerId?: string | null) => {
      setJoining(true);
      setError("");

      try {
        const socket = getSocket();

        if (!socket.connected) {
          socket.connect();
        }

        const response = await emitWithAck<{
          code: string;
          playerId: string;
          nickname: string;
        }>(socket, "join_room", {
          code: normalizedCode,
          nickname: nicknameValue,
          playerId: existingPlayerId,
        });

        if (!response.ok || !response.data) {
          throw new Error(response.error ?? "No se pudo entrar a la sala.");
        }

        setNickname(response.data.nickname);
        setPlayerId(response.data.playerId);
        saveSession(response.data.code, response.data.nickname, response.data.playerId);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "No se pudo entrar a la sala.");
      } finally {
        setJoining(false);
      }
    },
    [normalizedCode],
  );

  useEffect(() => {
    const socket = getSocket();

    function handleRoomState(nextRoom: ClientRoomState) {
      setRoom(nextRoom);
      setError("");
      setConnectionLabel("Conectado");
    }

    function handleError(payload: { message: string }) {
      setError(payload.message);
    }

    function handleConnect() {
      setConnectionLabel("Conectado");
      const stored = readSession();

      if (stored?.code === normalizedCode) {
        void joinRoom(stored.nickname, stored.playerId);
      }
    }

    function handleDisconnect() {
      setConnectionLabel("Reconectando...");
    }

    socket.on("room_state", handleRoomState);
    socket.on("error_message", handleError);
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    const stored = readSession();

    if (stored?.code === normalizedCode) {
      setNickname(stored.nickname);
      setPlayerId(stored.playerId);
      void joinRoom(stored.nickname, stored.playerId);
    } else {
      setConnectionLabel("Esperando nickname");
    }

    return () => {
      socket.off("room_state", handleRoomState);
      socket.off("error_message", handleError);
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, [joinRoom, normalizedCode]);

  async function startGame() {
    setError("");
    const response = await emitWithAck(getSocket(), "start_game", {});

    if (!response.ok) {
      setError(response.error ?? "No se pudo iniciar la partida.");
    }
  }

  async function leaveRoom() {
    await emitWithAck(getSocket(), "leave_room", {});
    window.localStorage.removeItem(SESSION_KEY);
    getSocket().disconnect();
    router.push("/");
  }

  async function nextRound() {
    setError("");
    const response = await emitWithAck(getSocket(), "next_round", {});

    if (!response.ok) {
      setError(response.error ?? "No se pudo saltar la ronda.");
    }
  }

  async function sendChatMessage(message: string) {
    const response = await emitWithAck(getSocket(), "send_chat_message", { message });

    if (!response.ok) {
      setError(response.error ?? "No se pudo enviar el mensaje.");
    }
  }

  async function chooseWord(word: string) {
    setError("");
    const response = await emitWithAck(getSocket(), "choose_word", { word });

    if (!response.ok) {
      setError(response.error ?? "No se pudo elegir la palabra.");
    }
  }

  if (!room && !playerId) {
    return (
      <main className="min-h-screen bg-gameBg text-ink">
        <ClassicTopBar />
        <section className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center px-4 py-8">
          <div className="classic-panel w-full overflow-hidden bg-panel">
            <div className="bg-gameRed px-5 py-4 text-white">
              <p className="text-sm font-black uppercase tracking-[0.16em] text-white/80">
                Sala {normalizedCode}
              </p>
              <h1 className="mt-1 text-3xl font-black uppercase">Entrar a mesa</h1>
            </div>
            <div className="p-6">
              <label className="block">
                <span className="text-sm font-black text-slate-700">Tu nickname</span>
                <input
                  value={nickname}
                  onChange={(event) =>
                    setNickname(event.target.value.slice(0, MAX_NICKNAME_LENGTH))
                  }
                  maxLength={MAX_NICKNAME_LENGTH}
                  disabled={joining}
                  className="mt-2 h-12 w-full rounded border-2 border-[#cfc77b] bg-gameCream px-4 text-base font-bold text-slate-950 outline-none transition focus:border-gameOrange"
                  placeholder="Ej: Cami"
                />
              </label>
              <button
                type="button"
                disabled={joining}
                onClick={() => joinRoom(nickname)}
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-gameRed px-5 font-black text-white shadow-[0_4px_0_#9b2529] transition hover:bg-gameRedDark disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
              >
                {joining ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <LogIn className="h-5 w-5" />
                )}
                Entrar
              </button>
              {error ? (
                <div className="mt-4 rounded-lg border-4 border-[#9b2b2b] bg-[#fff0f0] px-4 py-3 text-sm font-black text-[#b92b30]">
                  {error}
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (!room) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gameBg px-4 text-ink">
        <div className="classic-panel bg-panel px-5 py-4 font-black text-slate-700">
          <Loader2 className="mr-2 inline h-5 w-5 animate-spin" />
          {connectionLabel}
        </div>
      </main>
    );
  }

  const self = room.players.find((player) => player.id === room.viewerId) ?? null;

  return room.state === "lobby" ? (
    <Lobby
      room={room}
      self={self}
      connectionLabel={connectionLabel}
      error={error}
      onStartGame={startGame}
      onLeaveRoom={leaveRoom}
    />
  ) : (
    <GameRoom
      room={room}
      self={self}
      connectionLabel={connectionLabel}
      error={error}
      onLeaveRoom={leaveRoom}
      onNextRound={nextRound}
      onChooseWord={chooseWord}
      onSendChatMessage={sendChatMessage}
    />
  );
}

function readSession(): StoredSession | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

function saveSession(code: string, nickname: string, playerId: string) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify({ code, nickname, playerId }));
}

function emitWithAck<T = unknown>(socket: ReturnType<typeof getSocket>, event: string, payload: unknown) {
  return new Promise<SocketAck<T>>((resolve) => {
    socket.emit(event, payload, (response: SocketAck<T>) => resolve(response));
  });
}
