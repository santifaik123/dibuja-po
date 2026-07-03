import { randomUUID } from "node:crypto";
import { createHint } from "./hints";
import { isCorrectGuess, isNearGuess, normalizeAnswer } from "./normalizeAnswer";
import { DRAWER_BONUS, pointsForGuess, scoreForGuess } from "./scoring";
import {
  MAX_CHAT_MESSAGE_LENGTH,
  normalizeRoomCode,
  sanitizeChatMessage,
  sanitizeNickname,
  validateChatMessage,
  validateNickname,
} from "./security";
import type {
  ChatMessage,
  ChatResult,
  ClientRoomState,
  DisconnectResult,
  DrawEvent,
  DrawPayload,
  Player,
  Room,
  RoomJoinResult,
  Round,
  RoundStatus,
  ScoreEvent,
} from "./types";
import { pickRandomWord } from "./words";

const ROUND_SECONDS = 80;
const MAX_CHAT_MESSAGES = 120;
const MAX_DRAW_EVENTS = 2500;
const CHAT_WINDOW_MS = 5000;
const CHAT_WINDOW_LIMIT = 6;
const CHAT_MIN_INTERVAL_MS = 650;
const DRAW_MIN_INTERVAL_MS = 8;

interface RateWindow {
  timestamps: number[];
  lastAcceptedAt: number;
}

export class RoomManager {
  private readonly rooms = new Map<string, Room>();
  private readonly socketToRoom = new Map<string, string>();
  private readonly socketToPlayer = new Map<string, string>();
  private readonly usedWords = new Map<string, string[]>();
  private readonly chatRate = new Map<string, RateWindow>();
  private readonly drawRate = new Map<string, number>();

  createRoom(nicknameInput: string, socketId: string): RoomJoinResult {
    const nicknameError = validateNickname(nicknameInput);

    if (nicknameError) {
      throw new Error(nicknameError);
    }

    const player = createPlayer(sanitizeNickname(nicknameInput), socketId, true);
    const room: Room = {
      code: this.generateRoomCode(),
      hostId: player.id,
      players: [player],
      state: "lobby",
      turnOrder: [],
      currentRound: createEmptyRound(),
      timeRemaining: 0,
      hint: "",
      chatMessages: [],
      drawEvents: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.rooms.set(room.code, room);
    this.usedWords.set(room.code, []);
    this.bindSocket(socketId, room.code, player.id);
    this.addSystemMessage(room, `${player.nickname} creo la sala.`);

    return { room, player, isReconnect: false };
  }

  joinRoom(
    codeInput: string,
    nicknameInput: string,
    socketId: string,
    playerId?: string | null,
  ): RoomJoinResult {
    const code = normalizeRoomCode(codeInput);
    const room = this.rooms.get(code);

    if (!room) {
      throw new Error("La sala no existe o ya expiro.");
    }

    const nicknameError = validateNickname(nicknameInput);

    if (nicknameError) {
      throw new Error(nicknameError);
    }

    const nickname = sanitizeNickname(nicknameInput);
    const normalizedNickname = normalizeAnswer(nickname);
    const byPlayerId = playerId
      ? room.players.find((candidate) => candidate.id === playerId)
      : undefined;
    const byNickname = room.players.find(
      (candidate) => normalizeAnswer(candidate.nickname) === normalizedNickname,
    );
    const existing = byPlayerId ?? byNickname;

    if (existing) {
      const isSameSocket = existing.socketId === socketId;
      const canReconnect =
        !existing.isConnected || isSameSocket || (playerId && existing.id === playerId);

      if (!canReconnect) {
        throw new Error("Ese nickname ya esta usado en esta sala.");
      }

      existing.socketId = socketId;
      existing.isConnected = true;
      existing.nickname = nickname;
      this.bindSocket(socketId, room.code, existing.id);
      room.updatedAt = Date.now();

      if (!isSameSocket) {
        this.addSystemMessage(room, `${existing.nickname} volvio a la sala.`);
      }

      return { room, player: existing, isReconnect: true };
    }

    const player = createPlayer(nickname, socketId, room.hostId === null);
    room.players.push(player);

    if (!room.hostId) {
      room.hostId = player.id;
      player.isHost = true;
    }

    if (room.state === "playing") {
      room.turnOrder.push(player.id);
    }

    this.bindSocket(socketId, room.code, player.id);
    this.addSystemMessage(room, `Entro ${player.nickname}.`);
    room.updatedAt = Date.now();

    return { room, player, isReconnect: false };
  }

  disconnectSocket(socketId: string): DisconnectResult {
    const room = this.getRoomForSocket(socketId);
    const player = this.getPlayerBySocket(socketId);

    if (!room || !player) {
      return {
        room: null,
        player: null,
        roomDeleted: false,
        hostChanged: false,
        drawerLeft: false,
        shouldPauseGame: false,
      };
    }

    const wasHost = room.hostId === player.id;
    const drawerLeft = room.currentRound.drawerId === player.id && room.state === "playing";

    player.isConnected = false;
    player.socketId = null;
    player.isHost = false;
    this.socketToRoom.delete(socketId);
    this.socketToPlayer.delete(socketId);
    this.chatRate.delete(player.id);
    this.drawRate.delete(player.id);
    this.addSystemMessage(room, `Salio ${player.nickname}.`);

    const connectedPlayers = this.connectedPlayers(room);

    if (connectedPlayers.length === 0) {
      this.rooms.delete(room.code);
      this.usedWords.delete(room.code);

      return {
        room,
        player,
        roomDeleted: true,
        hostChanged: false,
        drawerLeft,
        shouldPauseGame: false,
      };
    }

    const hostChanged = wasHost ? this.transferHost(room) : false;
    const shouldPauseGame = room.state === "playing" && connectedPlayers.length < 2;

    if (shouldPauseGame) {
      this.pauseGame(room, "Partida pausada: faltan jugadores para seguir.");
    }

    room.updatedAt = Date.now();

    return {
      room,
      player,
      roomDeleted: false,
      hostChanged,
      drawerLeft,
      shouldPauseGame,
    };
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(normalizeRoomCode(code));
  }

  getRoomForSocket(socketId: string): Room | undefined {
    const code = this.socketToRoom.get(socketId);

    return code ? this.rooms.get(code) : undefined;
  }

  getPlayerBySocket(socketId: string): Player | undefined {
    const room = this.getRoomForSocket(socketId);
    const playerId = this.socketToPlayer.get(socketId);

    return room && playerId ? room.players.find((player) => player.id === playerId) : undefined;
  }

  startGame(room: Room, playerId: string): void {
    if (room.hostId !== playerId) {
      throw new Error("Solo el host puede iniciar la partida.");
    }

    const connectedPlayers = this.connectedPlayers(room);

    if (connectedPlayers.length < 2) {
      throw new Error("Faltan jugadores para empezar.");
    }

    room.state = "playing";
    room.turnOrder = connectedPlayers.map((player) => player.id);
    room.drawEvents = [];
    this.addSystemMessage(room, "Partida iniciada.");
    this.beginRoundAt(room, 0, 1);
  }

  beginNextRound(room: Room): void {
    if (room.state !== "playing") {
      return;
    }

    if (this.connectedPlayers(room).length < 2) {
      this.pauseGame(room, "Partida pausada: faltan jugadores para seguir.");
      return;
    }

    const currentIndex = room.currentRound.turnIndex;
    const next = this.findNextConnectedTurn(room, currentIndex + 1);

    if (!next) {
      this.pauseGame(room, "No hay dibujante disponible.");
      return;
    }

    const wrapped = next.index <= currentIndex;
    const nextRoundNumber = room.currentRound.number + (wrapped ? 1 : 0);
    this.beginRoundAt(room, next.index, nextRoundNumber);
  }

  endRound(room: Room, status: Exclude<RoundStatus, "waiting" | "drawing">): boolean {
    if (room.state !== "playing" || room.currentRound.status !== "drawing") {
      return false;
    }

    const word = room.currentRound.word?.word ?? "";
    room.currentRound.status = status;
    room.currentRound.endsAt = null;
    room.currentRound.revealedWord = word || null;
    room.timeRemaining = 0;
    room.hint = word;

    if (word) {
      this.addSystemMessage(room, `La palabra era: ${word}.`);
    }

    room.updatedAt = Date.now();

    return true;
  }

  updateTimer(room: Room, remainingSeconds: number): void {
    if (room.state !== "playing" || room.currentRound.status !== "drawing") {
      return;
    }

    const word = room.currentRound.word?.word;
    room.timeRemaining = Math.max(0, remainingSeconds);

    if (word) {
      room.hint = createHint(word, ROUND_SECONDS - room.timeRemaining);
    }

    room.updatedAt = Date.now();
  }

  addChatMessage(room: Room, playerId: string, messageInput: string): ChatResult {
    const player = this.connectedPlayers(room).find((candidate) => candidate.id === playerId);

    if (!player) {
      throw new Error("Jugador no conectado.");
    }

    const messageError = validateChatMessage(messageInput);

    if (messageError) {
      return emptyChatResult(messageError);
    }

    const message = sanitizeChatMessage(messageInput);

    if (this.isChatRateLimited(player.id)) {
      return emptyChatResult("Estas escribiendo demasiado rapido. Espera un poco.");
    }

    const word = room.currentRound.word?.word ?? "";
    const isDrawer = room.currentRound.drawerId === player.id;
    const isRoundActive = room.state === "playing" && room.currentRound.status === "drawing";
    const isExact = isRoundActive && word ? isCorrectGuess(message, word) : false;

    if (isExact && isDrawer) {
      return emptyChatResult("El dibujante no puede responder la palabra.");
    }

    if (isExact && player.hasGuessedCurrentRound) {
      return emptyChatResult("Ya acertaste esta ronda.");
    }

    if (isExact) {
      return this.handleCorrectGuess(room, player);
    }

    if (isRoundActive && !isDrawer && word && isNearGuess(message, word)) {
      const nearMessage = this.pushMessage(room, {
        kind: "near",
        text: `${player.nickname} estuvo cerca.`,
        playerId: player.id,
        nickname: player.nickname,
      });

      return {
        accepted: true,
        messages: [nearMessage],
        scoreEvents: [],
        shouldEndRound: false,
      };
    }

    const chatMessage = this.pushMessage(room, {
      kind: "player",
      text: message,
      playerId: player.id,
      nickname: player.nickname,
    });

    return {
      accepted: true,
      messages: [chatMessage],
      scoreEvents: [],
      shouldEndRound: false,
    };
  }

  buildDrawEvent(
    room: Room,
    playerId: string,
    type: DrawEvent["type"],
    payload: DrawPayload,
  ): DrawEvent {
    if (room.state !== "playing" || room.currentRound.status !== "drawing") {
      throw new Error("No hay una ronda activa.");
    }

    if (room.currentRound.drawerId !== playerId) {
      throw new Error("Solo el dibujante puede dibujar.");
    }

    if (type === "move" && this.isDrawRateLimited(playerId)) {
      throw new Error("draw_rate_limited");
    }

    const color = sanitizeColor(payload.color);
    const size = clampNumber(payload.size, 1, 32, 5);
    const mode = payload.mode === "erase" ? "erase" : "draw";
    const point =
      type === "end"
        ? undefined
        : {
            x: clampNumber(payload.x, 0, 1, 0),
            y: clampNumber(payload.y, 0, 1, 0),
          };

    const event: DrawEvent = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type,
      point,
      color,
      size,
      mode,
      fromPlayerId: playerId,
      createdAt: Date.now(),
    };

    this.pushDrawEvent(room, event);

    return event;
  }

  clearCanvas(room: Room, playerId: string): void {
    if (room.currentRound.drawerId !== playerId) {
      throw new Error("Solo el dibujante puede limpiar el canvas.");
    }

    room.drawEvents = [];
    room.updatedAt = Date.now();
  }

  toClientState(room: Room, viewerId: string | null): ClientRoomState {
    const isViewerDrawer = Boolean(
      viewerId && room.currentRound.drawerId && viewerId === room.currentRound.drawerId,
    );

    return {
      code: room.code,
      hostId: room.hostId,
      players: room.players.map((player) => ({ ...player, socketId: null })),
      state: room.state,
      turnOrder: [...room.turnOrder],
      currentRound: {
        ...room.currentRound,
        guessedPlayerIds: [...room.currentRound.guessedPlayerIds],
        word: isViewerDrawer ? room.currentRound.word : null,
      },
      timeRemaining: room.timeRemaining,
      hint: room.hint,
      chatMessages: [...room.chatMessages],
      drawEvents: [...room.drawEvents],
      viewerId,
      isViewerDrawer,
    };
  }

  connectedPlayers(room: Room): Player[] {
    return room.players.filter((player) => player.isConnected);
  }

  addSystemMessage(room: Room, text: string): ChatMessage {
    return this.pushMessage(room, {
      kind: "system",
      text,
    });
  }

  pauseGame(room: Room, reason: string): void {
    room.state = "lobby";
    room.turnOrder = [];
    room.currentRound = createEmptyRound();
    room.timeRemaining = 0;
    room.hint = "";
    room.drawEvents = [];
    this.addSystemMessage(room, reason);
    room.updatedAt = Date.now();
  }

  private handleCorrectGuess(room: Room, player: Player): ChatResult {
    const guessIndex = room.currentRound.guessedPlayerIds.length;
    const points = scoreForGuess(guessIndex);
    const reason = pointsForGuess(guessIndex);
    const scoreEvents: ScoreEvent[] = [{ playerId: player.id, points, reason }];
    const drawer = room.players.find((candidate) => candidate.id === room.currentRound.drawerId);

    player.score += points;
    player.hasGuessedCurrentRound = true;
    room.currentRound.guessedPlayerIds.push(player.id);

    if (drawer && !room.currentRound.drawerAwarded) {
      drawer.score += DRAWER_BONUS;
      room.currentRound.drawerAwarded = true;
      scoreEvents.push({
        playerId: drawer.id,
        points: DRAWER_BONUS,
        reason: "drawer_bonus",
      });
    }

    const message = this.pushMessage(room, {
      kind: "correct",
      text: `${player.nickname} adivino la palabra.`,
      playerId: player.id,
      nickname: player.nickname,
    });
    const eligibleGuessers = this.connectedPlayers(room).filter(
      (candidate) => candidate.id !== room.currentRound.drawerId,
    );
    const shouldEndRound =
      eligibleGuessers.length > 0 &&
      eligibleGuessers.every((candidate) => candidate.hasGuessedCurrentRound);

    room.updatedAt = Date.now();

    return {
      accepted: true,
      messages: [message],
      scoreEvents,
      shouldEndRound,
    };
  }

  private beginRoundAt(room: Room, turnIndex: number, roundNumber: number): void {
    const next = this.findNextConnectedTurn(room, turnIndex);

    if (!next) {
      this.pauseGame(room, "No hay dibujante disponible.");
      return;
    }

    const drawer = room.players.find((player) => player.id === next.playerId);
    const usedWords = this.usedWords.get(room.code) ?? [];
    const word = pickRandomWord(usedWords);
    const updatedUsedWords = [...usedWords, word.word].slice(-80);

    if (!drawer) {
      this.pauseGame(room, "No hay dibujante disponible.");
      return;
    }

    this.usedWords.set(room.code, updatedUsedWords);
    room.players.forEach((player) => {
      player.hasGuessedCurrentRound = false;
    });
    room.drawEvents = [];
    room.timeRemaining = ROUND_SECONDS;
    room.hint = createHint(word.word, 0);
    room.currentRound = {
      id: randomUUID(),
      number: roundNumber,
      turnIndex: next.index,
      drawerId: drawer.id,
      word,
      status: "drawing",
      startedAt: Date.now(),
      endsAt: Date.now() + ROUND_SECONDS * 1000,
      revealedWord: null,
      guessedPlayerIds: [],
      drawerAwarded: false,
    };
    room.updatedAt = Date.now();
    this.addSystemMessage(room, `Nueva ronda: ${drawer.nickname} esta dibujando.`);
  }

  private findNextConnectedTurn(
    room: Room,
    startIndex: number,
  ): { index: number; playerId: string } | null {
    if (room.turnOrder.length === 0) {
      return null;
    }

    for (let offset = 0; offset < room.turnOrder.length; offset += 1) {
      const index = (startIndex + offset) % room.turnOrder.length;
      const playerId = room.turnOrder[index];
      const player = room.players.find(
        (candidate) => candidate.id === playerId && candidate.isConnected,
      );

      if (player) {
        return { index, playerId };
      }
    }

    return null;
  }

  private transferHost(room: Room): boolean {
    const nextHost = this.connectedPlayers(room)[0];

    if (!nextHost) {
      room.hostId = null;
      return false;
    }

    room.hostId = nextHost.id;
    nextHost.isHost = true;
    room.players.forEach((player) => {
      if (player.id !== nextHost.id) {
        player.isHost = false;
      }
    });
    this.addSystemMessage(room, `${nextHost.nickname} ahora es host.`);

    return true;
  }

  private bindSocket(socketId: string, roomCode: string, playerId: string): void {
    this.socketToRoom.set(socketId, roomCode);
    this.socketToPlayer.set(socketId, playerId);
  }

  private generateRoomCode(): string {
    let code = "";

    do {
      code = `CL-${Math.floor(1000 + Math.random() * 9000)}`;
    } while (this.rooms.has(code));

    return code;
  }

  private pushMessage(
    room: Room,
    message: Omit<ChatMessage, "id" | "createdAt">,
  ): ChatMessage {
    const chatMessage: ChatMessage = {
      id: randomUUID(),
      createdAt: Date.now(),
      ...message,
      text: message.text.slice(0, MAX_CHAT_MESSAGE_LENGTH),
    };

    room.chatMessages = [...room.chatMessages, chatMessage].slice(-MAX_CHAT_MESSAGES);
    room.updatedAt = Date.now();

    return chatMessage;
  }

  private pushDrawEvent(room: Room, event: DrawEvent): void {
    room.drawEvents = [...room.drawEvents, event].slice(-MAX_DRAW_EVENTS);
    room.updatedAt = Date.now();
  }

  private isChatRateLimited(playerId: string): boolean {
    const now = Date.now();
    const state = this.chatRate.get(playerId) ?? { timestamps: [], lastAcceptedAt: 0 };
    const timestamps = state.timestamps.filter((timestamp) => now - timestamp < CHAT_WINDOW_MS);

    if (
      now - state.lastAcceptedAt < CHAT_MIN_INTERVAL_MS ||
      timestamps.length >= CHAT_WINDOW_LIMIT
    ) {
      this.chatRate.set(playerId, { timestamps, lastAcceptedAt: state.lastAcceptedAt });
      return true;
    }

    timestamps.push(now);
    this.chatRate.set(playerId, { timestamps, lastAcceptedAt: now });

    return false;
  }

  private isDrawRateLimited(playerId: string): boolean {
    const now = Date.now();
    const last = this.drawRate.get(playerId) ?? 0;

    if (now - last < DRAW_MIN_INTERVAL_MS) {
      return true;
    }

    this.drawRate.set(playerId, now);

    return false;
  }
}

function createPlayer(nickname: string, socketId: string, isHost: boolean): Player {
  return {
    id: randomUUID(),
    socketId,
    nickname,
    score: 0,
    isHost,
    isConnected: true,
    hasGuessedCurrentRound: false,
    joinedAt: Date.now(),
  };
}

function createEmptyRound(): Round {
  return {
    id: randomUUID(),
    number: 0,
    turnIndex: 0,
    drawerId: null,
    word: null,
    status: "waiting",
    startedAt: null,
    endsAt: null,
    revealedWord: null,
    guessedPlayerIds: [],
    drawerAwarded: false,
  };
}

function emptyChatResult(privateError: string): ChatResult {
  return {
    accepted: false,
    privateError,
    messages: [],
    scoreEvents: [],
    shouldEndRound: false,
  };
}

function sanitizeColor(color: string | undefined): string {
  if (color && /^#[0-9a-f]{6}$/i.test(color)) {
    return color;
  }

  return "#111827";
}

function clampNumber(
  value: number | undefined,
  min: number,
  max: number,
  fallback: number,
): number {
  if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, value));
}
