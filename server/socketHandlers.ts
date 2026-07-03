import type { Server, Socket } from "socket.io";
import { RoomManager } from "../lib/game/roomManager";
import type {
  ChatPayload,
  CreateRoomPayload,
  DrawPayload,
  JoinRoomPayload,
  Room,
  SocketAck,
} from "../lib/game/types";

const manager = new RoomManager();
const timers = new Map<
  string,
  {
    interval?: ReturnType<typeof setInterval>;
    nextRound?: ReturnType<typeof setTimeout>;
  }
>();

export function registerSocketHandlers(io: Server): void {
  io.on("connection", (socket) => {
    socket.on("create_room", (payload: CreateRoomPayload, ack?: Ack) => {
      try {
        const result = manager.createRoom(payload?.nickname ?? "", socket.id);

        socket.join(result.room.code);
        socket.emit("room_created", {
          code: result.room.code,
          playerId: result.player.id,
          nickname: result.player.nickname,
        });
        ackOk(ack, {
          code: result.room.code,
          playerId: result.player.id,
          nickname: result.player.nickname,
        });
        emitRoomState(io, result.room);
      } catch (error) {
        emitError(socket, error);
        ackError(ack, error);
      }
    });

    socket.on("join_room", (payload: JoinRoomPayload, ack?: Ack) => {
      try {
        const result = manager.joinRoom(
          payload?.code ?? "",
          payload?.nickname ?? "",
          socket.id,
          payload?.playerId,
        );

        socket.join(result.room.code);
        socket.emit("joined_room", {
          code: result.room.code,
          playerId: result.player.id,
          nickname: result.player.nickname,
          isReconnect: result.isReconnect,
        });
        ackOk(ack, {
          code: result.room.code,
          playerId: result.player.id,
          nickname: result.player.nickname,
          isReconnect: result.isReconnect,
        });
        emitRoomState(io, result.room);
      } catch (error) {
        emitError(socket, error);
        ackError(ack, error);
      }
    });

    socket.on("leave_room", (_payload: unknown, ack?: Ack) => {
      const result = manager.disconnectSocket(socket.id);

      if (result.room) {
        socket.leave(result.room.code);
      }

      if (result.roomDeleted && result.room) {
        clearRoomTimers(result.room.code);
      } else if (result.room) {
        emitRoomState(io, result.room);
      }

      ackOk(ack, {});
    });

    socket.on("start_game", (_payload: unknown, ack?: Ack) => {
      try {
        const { room, player } = getSocketContext(socket);

        manager.startGame(room, player.id);
        io.to(room.code).emit("game_started");
        emitRoomState(io, room);
        startRoundClock(io, room);
        ackOk(ack, {});
      } catch (error) {
        emitError(socket, error);
        ackError(ack, error);
      }
    });

    socket.on("send_chat_message", (payload: ChatPayload, ack?: Ack) => {
      try {
        const { room, player } = getSocketContext(socket);
        const result = manager.addChatMessage(room, player.id, payload?.message ?? "");

        if (result.privateError) {
          socket.emit("error_message", { message: result.privateError });
          ackError(ack, result.privateError);
          return;
        }

        if (result.scoreEvents.length > 0) {
          io.to(room.code).emit("score_updated", result.scoreEvents);
        }

        emitRoomState(io, room);

        if (result.shouldEndRound) {
          finishRoundAndQueueNext(io, room, "guessed", 2200);
        }

        ackOk(ack, {});
      } catch (error) {
        emitError(socket, error);
        ackError(ack, error);
      }
    });

    socket.on("draw_start", (payload: DrawPayload, ack?: Ack) => {
      handleDrawEvent(io, socket, "start", payload, ack);
    });

    socket.on("draw_move", (payload: DrawPayload, ack?: Ack) => {
      handleDrawEvent(io, socket, "move", payload, ack);
    });

    socket.on("draw_end", (payload: DrawPayload, ack?: Ack) => {
      handleDrawEvent(io, socket, "end", payload, ack);
    });

    socket.on("clear_canvas", (_payload: unknown, ack?: Ack) => {
      try {
        const { room, player } = getSocketContext(socket);

        manager.clearCanvas(room, player.id);
        io.to(room.code).emit("canvas_cleared");
        emitRoomState(io, room);
        ackOk(ack, {});
      } catch (error) {
        emitError(socket, error);
        ackError(ack, error);
      }
    });

    socket.on("next_round", (_payload: unknown, ack?: Ack) => {
      try {
        const { room, player } = getSocketContext(socket);

        if (room.hostId !== player.id) {
          throw new Error("Solo el host puede saltar la ronda.");
        }

        if (room.currentRound.status === "drawing") {
          finishRoundAndQueueNext(io, room, "skipped", 1200);
        } else {
          clearRoomTimers(room.code);
          manager.beginNextRound(room);
          emitRoomState(io, room);
          startRoundClock(io, room);
        }

        ackOk(ack, {});
      } catch (error) {
        emitError(socket, error);
        ackError(ack, error);
      }
    });

    socket.on("disconnect", () => {
      const result = manager.disconnectSocket(socket.id);

      if (!result.room) {
        return;
      }

      if (result.roomDeleted) {
        clearRoomTimers(result.room.code);
        return;
      }

      if (result.drawerLeft && !result.shouldPauseGame) {
        finishRoundAndQueueNext(io, result.room, "drawer_left", 2600);
        return;
      }

      emitRoomState(io, result.room);
    });
  });
}

function handleDrawEvent(
  io: Server,
  socket: Socket,
  type: "start" | "move" | "end",
  payload: DrawPayload,
  ack?: Ack,
): void {
  try {
    const { room, player } = getSocketContext(socket);
    const event = manager.buildDrawEvent(room, player.id, type, payload ?? {});

    socket.to(room.code).emit("draw_event", event);
    ackOk(ack, {});
  } catch (error) {
    if (String(error instanceof Error ? error.message : error) !== "draw_rate_limited") {
      emitError(socket, error);
    }

    ackError(ack, error);
  }
}

function startRoundClock(io: Server, room: Room): void {
  clearRoomTimers(room.code);

  if (room.state !== "playing" || room.currentRound.status !== "drawing") {
    emitRoomState(io, room);
    return;
  }

  const interval = setInterval(() => {
    const endsAt = room.currentRound.endsAt ?? Date.now();
    const remainingSeconds = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));

    manager.updateTimer(room, remainingSeconds);
    emitRoomState(io, room);

    if (remainingSeconds <= 0) {
      finishRoundAndQueueNext(io, room, "timeout", 3600);
    }
  }, 1000);

  timers.set(room.code, { interval });
}

function finishRoundAndQueueNext(
  io: Server,
  room: Room,
  reason: "guessed" | "timeout" | "drawer_left" | "skipped",
  delayMs: number,
): void {
  clearRoomTimers(room.code);

  if (!manager.endRound(room, reason)) {
    emitRoomState(io, room);
    return;
  }

  io.to(room.code).emit("round_ended", { reason, revealedWord: room.currentRound.revealedWord });
  emitRoomState(io, room);

  const nextRound = setTimeout(() => {
    manager.beginNextRound(room);
    io.to(room.code).emit("round_started", {
      roundNumber: room.currentRound.number,
      drawerId: room.currentRound.drawerId,
    });
    emitRoomState(io, room);
    startRoundClock(io, room);
  }, delayMs);

  timers.set(room.code, { nextRound });
}

function clearRoomTimers(roomCode: string): void {
  const timer = timers.get(roomCode);

  if (timer?.interval) {
    clearInterval(timer.interval);
  }

  if (timer?.nextRound) {
    clearTimeout(timer.nextRound);
  }

  timers.delete(roomCode);
}

function emitRoomState(io: Server, room: Room): void {
  for (const player of room.players) {
    if (player.isConnected && player.socketId) {
      io.to(player.socketId).emit("room_state", manager.toClientState(room, player.id));
    }
  }
}

function getSocketContext(socket: Socket): { room: Room; player: NonNullable<ReturnType<typeof manager.getPlayerBySocket>> } {
  const room = manager.getRoomForSocket(socket.id);
  const player = manager.getPlayerBySocket(socket.id);

  if (!room || !player) {
    throw new Error("Socket desconectado de la sala.");
  }

  return { room, player };
}

function emitError(socket: Socket, error: unknown): void {
  socket.emit("error_message", { message: errorToMessage(error) });
}

function ackOk<T>(ack: Ack | undefined, data: T): void {
  ack?.({ ok: true, data });
}

function ackError(ack: Ack | undefined, error: unknown): void {
  ack?.({ ok: false, error: errorToMessage(error) });
}

function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

type Ack = (response: SocketAck) => void;
